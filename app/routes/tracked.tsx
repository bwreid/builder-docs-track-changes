import { sendToAgentChat, useAgentChatContext } from "@agent-native/core/client/agent-chat";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import {
  IconBrandJira,
  IconChevronDown,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconGitPullRequest,
  IconMessageCircleCheck,
  IconMessageCirclePlus,
  IconRefresh,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef } from "react";

import { type Criteria, formatCriteriaBlock } from "@/lib/criteria";
import { docRawMarkdownUrl } from "@/lib/docs-source";
import { APP_TITLE } from "@/lib/app-config";
import { DocBlockPreview } from "@/components/doc-block-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function meta() {
  return [
    { title: `Tracked changes - ${APP_TITLE}` },
    {
      name: "description",
      content: "Documentation changes queued for review.",
    },
  ];
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatRange(rangeStart: string, rangeEnd: string | null) {
  const start = dateFormatter.format(new Date(rangeStart));
  if (!rangeEnd) return "Since " + start;
  return start + " - " + dateFormatter.format(new Date(rangeEnd));
}

type Change = { before: string; after: string; reasoning: string; ignored?: boolean };

type ReportPr = { prNumber: number; prUrl: string; title: string };

type TrackedDoc = {
  id: string;
  reportId: string;
  path: string;
  url: string;
  title: string;
  reason: string;
  relatedHeading: string;
  analysisStatus: "pending" | "analyzing" | "ready" | "error" | null;
  analysisSummary: string | null;
  changes: Change[];
  jiraIssueKey: string | null;
  jiraIssueUrl: string | null;
  prNumber: number | null;
  prUrl: string | null;
  reportRangeStart: string;
  reportRangeEnd: string | null;
  reportSummary: string | null;
};

function AnalysisStatusBadge({ status }: { status: TrackedDoc["analysisStatus"] }) {
  switch (status) {
    case "ready":
      return <Badge className="bg-primary text-primary-foreground">Ready</Badge>;
    case "error":
      return <Badge variant="destructive">Failed</Badge>;
    case "analyzing":
      return <Badge variant="secondary">Analyzing...</Badge>;
    case "pending":
    default:
      return <Badge variant="secondary">Queued</Badge>;
  }
}

function AddChangeToChatButton({
  docId,
  docTitle,
  docUrl,
  change,
  index,
}: {
  docId: string;
  docTitle: string;
  docUrl: string;
  change: Change;
  index: number;
}) {
  const { items, set, remove } = useAgentChatContext();
  const key = `doc-change:${docId}:${index}`;
  const staged = items.some((item) => item.key === key);

  const toggle = () => {
    if (staged) {
      remove(key);
      return;
    }
    set({
      key,
      title: `${docTitle} — change ${index + 1}`,
      context:
        `Doc suggestion id: ${docId}\n` +
        `Doc: ${docTitle} (${docUrl})\n\n` +
        `Suggested change ${index + 1}:\n` +
        `Before: ${change.before}\n` +
        `After: ${change.after}\n` +
        `Reasoning: ${change.reasoning}\n\n` +
        `If asked to revise this, first call list-tracked-docs to see this suggestion's current full changes array, then call update-doc-suggestion-analysis with id "${docId}" and the complete updated changes array (only modify this change; keep the others exactly as they are), plus an updated analysisSummary.`,
      openSidebar: true,
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={staged ? "Remove this change from the agent chat" : "Add this change to the agent chat"}
      title={staged ? "Added to agent chat" : "Add to agent chat"}
      className={cn(
        "absolute right-2 top-2 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 hover:text-foreground",
        staged && "text-primary",
      )}
    >
      {staged ? (
        <IconMessageCircleCheck className="size-4" />
      ) : (
        <IconMessageCirclePlus className="size-4" />
      )}
    </button>
  );
}

function IgnoreChangeButton({
  docId,
  index,
  ignored,
}: {
  docId: string;
  index: number;
  ignored: boolean;
}) {
  const toggleIgnored = useActionMutation("toggle-doc-change-ignored");

  return (
    <button
      type="button"
      onClick={() => toggleIgnored.mutate({ id: docId, index, ignored: !ignored })}
      disabled={toggleIgnored.isPending}
      aria-label={ignored ? "Include this change in the pull request" : "Ignore this change (exclude from the pull request)"}
      title={ignored ? "Ignored — excluded from pull requests" : "Ignore (exclude from pull requests)"}
      className={cn(
        "absolute right-9 top-2 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 hover:text-foreground",
        ignored && "text-destructive",
      )}
    >
      {ignored ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
    </button>
  );
}

function TrackedDocCard({
  doc,
  jiraConnected,
  githubConnected,
  existingReportPrs,
  criteria,
}: {
  doc: TrackedDoc;
  jiraConnected: boolean;
  githubConnected: boolean;
  existingReportPrs: ReportPr[];
  criteria: Criteria;
}) {
  const untrack = useActionMutation("update-doc-suggestion-status");
  const createJiraTicket = useActionMutation("create-jira-ticket");
  const createPullRequest = useActionMutation("create-doc-pull-request");
  const reanalyze = useActionMutation("reanalyze-doc-suggestion");
  const refreshPrStatus = useActionMutation("refresh-doc-pull-request-status");

  // Check once per page load whether an existing PR was closed without
  // merging — if so, the server clears it and the list refetches, re-enabling
  // "Create pull request" here.
  const checkedPrRef = useRef(false);
  useEffect(() => {
    if (doc.prUrl && !checkedPrRef.current) {
      checkedPrRef.current = true;
      refreshPrStatus.mutate({ suggestionId: doc.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.prUrl, doc.id]);

  const isAnalyzing = doc.analysisStatus === "analyzing" || reanalyze.isPending;
  const hasIncludedChanges = doc.changes.length === 0 || doc.changes.some((change) => !change.ignored);

  const resuggest = () => {
    reanalyze.mutate(
      { id: doc.id },
      {
        onSuccess: () => {
          const criteriaBlock = formatCriteriaBlock(criteria);
          sendToAgentChat({
            message: "Re-suggest the doc changes for this tracked item",
            context:
              criteriaBlock +
              `Doc suggestion id: ${doc.id}\n` +
              `Doc page: ${doc.url}\n` +
              `Doc raw source (fetch this, not the rendered page): ${docRawMarkdownUrl(doc.path)}\n` +
              `Doc title: ${doc.title}\n` +
              `Reason this doc was flagged: ${doc.reason}\n` +
              `Related report section: ${doc.relatedHeading}\n\n` +
              `Report summary for context:\n${doc.reportSummary ?? ""}\n\n` +
              "Fetch the raw source URL above (not the rendered doc page), find the specific existing sentence(s) that should change based on the reason and report summary, and propose exact before/after replacement text — copied verbatim from the raw source, markdown syntax and all — with reasoning grounded in the summary — follow the team guidance above, especially the output tone. Never anchor a change on text inside a JSX/HTML tag's quoted attribute value (e.g. inside summary=\"...\" or title=\"...\") if the after text adds new block-level content like a Callout, paragraph, or code block — that corrupts the file's structure. Keep before and after the same kind of content (prose stays prose); to add a new block near a JSX component, anchor on plain markdown text right before or after that component's closing tag, never inside one of its attributes. If you can fetch the source, call update-doc-suggestion-analysis with id \"" +
              doc.id +
              '" and { analysisSummary, changes: [{before, after, reasoning}] }. If the source cannot be fetched or no specific sentence needs to change, call fail-doc-suggestion-analysis with id "' +
              doc.id +
              '" and a short reason.',
            submit: true,
            openSidebar: true,
          });
        },
      },
    );
  };

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
          >
            {doc.title}
            <IconExternalLink className="size-3 text-muted-foreground" />
          </a>
          <p className="mt-0.5 text-xs text-muted-foreground">
            From report {formatRange(doc.reportRangeStart, doc.reportRangeEnd)} &middot;{" "}
            {doc.relatedHeading}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AnalysisStatusBadge status={doc.analysisStatus} />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => untrack.mutate({ id: doc.id, status: "new" })}
          >
            Untrack
          </Button>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{doc.reason}</p>

      {doc.analysisStatus === "ready" && (
        <div className="mt-4 space-y-3">
          {doc.analysisSummary && (
            <p className="text-sm text-foreground">{doc.analysisSummary}</p>
          )}
          {doc.changes.map((change, i) => (
            <div
              key={i}
              className={cn(
                "relative rounded-md border border-border bg-muted/40 p-3 pe-16 text-sm",
                change.ignored && "opacity-50",
              )}
            >
              <IgnoreChangeButton docId={doc.id} index={i} ignored={change.ignored ?? false} />
              <AddChangeToChatButton
                docId={doc.id}
                docTitle={doc.title}
                docUrl={doc.url}
                change={change}
                index={i}
              />
              {change.ignored && (
                <Badge variant="secondary" className="mb-2">
                  Ignored — won&apos;t be included in the pull request
                </Badge>
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Before
              </p>
              <div className="mt-1 rounded-md bg-destructive/5 p-2">
                <DocBlockPreview markdown={change.before} />
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                After
              </p>
              <div className="mt-1 rounded-md bg-primary/5 p-2">
                <DocBlockPreview markdown={change.after} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{change.reasoning}</p>
            </div>
          ))}
        </div>
      )}

      {doc.analysisStatus === "error" && doc.analysisSummary && (
        <p className="mt-3 text-sm text-destructive">{doc.analysisSummary}</p>
      )}

      {(doc.analysisStatus === "pending" || doc.analysisStatus === "analyzing") && (
        <p className="mt-3 text-sm text-muted-foreground">
          Finding the exact doc changes...
        </p>
      )}

      {createJiraTicket.isError && (
        <p className="mt-3 text-sm text-destructive">
          {actionErrorMessage(createJiraTicket.error) ?? "Failed to create the Jira ticket."}
        </p>
      )}
      {reanalyze.isError && (
        <p className="mt-3 text-sm text-destructive">
          {actionErrorMessage(reanalyze.error) ?? "Failed to re-suggest changes."}
        </p>
      )}
      {createPullRequest.isError && (
        <p className="mt-3 text-sm text-destructive">
          {actionErrorMessage(createPullRequest.error) ?? "Failed to create the pull request."}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={isAnalyzing} onClick={resuggest}>
          <IconRefresh className="size-4" />
          {isAnalyzing ? "Re-suggesting..." : "Re-suggest"}
        </Button>
        {doc.jiraIssueKey ? (
          <Button size="sm" variant="default" className="text-xs" asChild>
            <a
              href={doc.jiraIssueUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              title={doc.jiraIssueKey}
            >
              <IconBrandJira className="size-4" />
              Go to Jira Ticket
              <IconExternalLink className="size-3" />
            </a>
          </Button>
        ) : jiraConnected ? (
          <Button
            size="sm"
            variant="outline"
            disabled={createJiraTicket.isPending}
            onClick={() => createJiraTicket.mutate({ suggestionId: doc.id })}
          >
            <IconBrandJira className="size-4" />
            {createJiraTicket.isPending ? "Creating..." : "Create Jira ticket"}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <IconBrandJira className="size-4" />
            Add your Jira details in Settings (top-right cog icon) to create tickets.
          </span>
        )}
        {doc.prUrl ? (
          <Button size="sm" variant="default" className="text-xs" asChild>
            <a
              href={doc.prUrl}
              target="_blank"
              rel="noreferrer"
              title={doc.prNumber ? `PR #${doc.prNumber}` : undefined}
            >
              <IconGitPullRequest className="size-4" />
              Go to Pull Request
              <IconExternalLink className="size-3" />
            </a>
          </Button>
        ) : githubConnected ? (
          existingReportPrs.length === 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={createPullRequest.isPending || !hasIncludedChanges}
              title={hasIncludedChanges ? undefined : "All changes are ignored — nothing to include."}
              onClick={() => createPullRequest.mutate({ suggestionId: doc.id })}
            >
              <IconGitPullRequest className="size-4" />
              {createPullRequest.isPending ? "Creating..." : "Create pull request"}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={createPullRequest.isPending || !hasIncludedChanges}
                  title={hasIncludedChanges ? undefined : "All changes are ignored — nothing to include."}
                >
                  <IconGitPullRequest className="size-4" />
                  {createPullRequest.isPending ? "Creating..." : "Create pull request"}
                  <IconChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => createPullRequest.mutate({ suggestionId: doc.id })}>
                  Create new PR
                </DropdownMenuItem>
                {existingReportPrs.map((pr) => (
                  <DropdownMenuItem
                    key={pr.prNumber}
                    onSelect={() =>
                      createPullRequest.mutate({ suggestionId: doc.id, targetPrNumber: pr.prNumber })
                    }
                  >
                    Add to PR #{pr.prNumber}: {pr.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <IconGitPullRequest className="size-4" />
            Add your GitHub token in Settings (top-right cog icon) to create pull requests.
          </span>
        )}
      </div>
    </div>
  );
}

export default function TrackedRoute() {
  const { data: docs, isLoading } = useActionQuery("list-tracked-docs", {});
  const { data: jiraStatus } = useActionQuery("get-jira-status", {});
  const { data: githubStatus } = useActionQuery("get-github-status", {});
  const { data: criteriaData } = useActionQuery("get-criteria", {});
  const criteria: Criteria = criteriaData ?? { selectionCriteria: "", outputFormat: "", outputTone: "" };

  // Existing open PRs, grouped by report, so a suggestion whose own report
  // already has a PR can offer "add to it" alongside "create new" — a
  // report with no PR yet has no entry here and behaves as before.
  const existingPrsByReport = useMemo(() => {
    const map = new Map<string, ReportPr[]>();
    for (const doc of docs ?? []) {
      if (!doc.prNumber || !doc.prUrl) continue;
      const list = map.get(doc.reportId) ?? [];
      if (!list.some((pr) => pr.prNumber === doc.prNumber)) {
        list.push({ prNumber: doc.prNumber, prUrl: doc.prUrl, title: doc.title });
      }
      map.set(doc.reportId, list);
    }
    return map;
  }, [docs]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-sm font-medium text-muted-foreground">Tracked changes</h1>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && docs && docs.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No tracked changes yet. Track a doc suggestion from a report to see it
            here.
          </p>
        </div>
      )}

      {!isLoading && docs && docs.length > 0 && (
        <div className="flex flex-col gap-2">
          {docs.map((doc) => (
            <TrackedDocCard
              key={doc.id}
              doc={doc}
              jiraConnected={jiraStatus?.connected ?? false}
              githubConnected={githubStatus?.connected ?? false}
              existingReportPrs={existingPrsByReport.get(doc.reportId) ?? []}
              criteria={criteria}
            />
          ))}
        </div>
      )}
    </div>
  );
}
