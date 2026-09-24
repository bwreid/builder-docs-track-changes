import { sendToAgentChat, useAgentChatContext } from "@agent-native/core/client/agent-chat";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import {
  IconBrandJira,
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconGitPullRequest,
  IconMessageCircleCheck,
  IconMessageCirclePlus,
  IconPencil,
  IconRefresh,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { type Criteria, formatCriteriaBlock } from "@/lib/criteria";
import { docRawMarkdownUrl } from "@/lib/docs-source";
import { APP_TITLE } from "@/lib/app-config";
import { DocBlockPreview } from "@/components/doc-block-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  trackedAt: string | null;
  userChosenName: string | null;
  reportRangeStart: string;
  reportRangeEnd: string | null;
  reportSummary: string | null;
  reportUserChosenName: string | null;
};

// Click-to-edit label with a pencil affordance on hover. `value` is the name
// currently on display (already resolved from userChosenName || fallback);
// `onSave` is only called with a real, changed, non-empty name.
function RenameField({
  value,
  onSave,
  ariaLabel,
  className,
  inputClassName,
}: {
  value: string;
  onSave: (name: string) => void;
  ariaLabel: string;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    const commit = () => {
      const trimmed = draft.trim();
      setEditing(false);
      if (trimmed && trimmed !== value) onSave(trimmed);
    };
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn("h-7 px-2 py-1 text-sm", inputClassName)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setDraft(value);
        setEditing(true);
      }}
      aria-label={ariaLabel}
      className={cn("group/rename inline-flex min-w-0 items-center gap-1 text-left", className)}
    >
      <span className="truncate">{value}</span>
      <IconPencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/rename:opacity-100" />
    </button>
  );
}

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

function ChangeBlock({
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
  const [beforeOpen, setBeforeOpen] = useState(true);
  const [afterOpen, setAfterOpen] = useState(true);

  return (
    <div
      className={cn(
        "relative rounded-md border border-border bg-muted/40 p-3 pe-16 text-sm",
        change.ignored && "opacity-50",
      )}
    >
      <IgnoreChangeButton docId={docId} index={index} ignored={change.ignored ?? false} />
      <AddChangeToChatButton
        docId={docId}
        docTitle={docTitle}
        docUrl={docUrl}
        change={change}
        index={index}
      />
      {change.ignored && (
        <Badge variant="secondary" className="mb-2">
          Ignored — won&apos;t be included in the pull request
        </Badge>
      )}

      <Collapsible open={beforeOpen} onOpenChange={setBeforeOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            <IconChevronRight
              className={cn("size-3 transition-transform", beforeOpen && "rotate-90")}
            />
            Before
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 rounded-md bg-destructive/5 p-2">
            <DocBlockPreview markdown={change.before} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={afterOpen} onOpenChange={setAfterOpen} className="mt-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            <IconChevronRight
              className={cn("size-3 transition-transform", afterOpen && "rotate-90")}
            />
            After
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 rounded-md bg-primary/5 p-2">
            <DocBlockPreview markdown={change.after} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <p className="mt-2 text-xs text-muted-foreground">{change.reasoning}</p>
    </div>
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
  const [open, setOpen] = useState(true);
  const untrack = useActionMutation("update-doc-suggestion-status");
  const createJiraTicket = useActionMutation("create-jira-ticket");
  const createPullRequest = useActionMutation("create-doc-pull-request");
  const reanalyze = useActionMutation("reanalyze-doc-suggestion");
  const refreshPrStatus = useActionMutation("refresh-doc-pull-request-status");
  const renameDoc = useActionMutation("rename-doc-suggestion");

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
    <div className="rounded-md border border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start gap-3 p-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={open ? "Collapse" : "Expand"}
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <IconChevronRight
                className={cn("size-4 transition-transform", open && "rotate-90")}
              />
            </button>
          </CollapsibleTrigger>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <RenameField
                value={doc.userChosenName ?? doc.title}
                onSave={(name) => renameDoc.mutate({ id: doc.id, name })}
                ariaLabel="Rename this tracked change"
                className="text-sm font-medium text-foreground"
              />
              <p className="mt-0.5 text-xs text-muted-foreground">
                From report{" "}
                {doc.reportUserChosenName ?? formatRange(doc.reportRangeStart, doc.reportRangeEnd)}{" "}
                &middot; {doc.relatedHeading}
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
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <a href={doc.url} target="_blank" rel="noreferrer">
                  Go to Doc
                  <IconExternalLink className="size-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <CollapsibleContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">{doc.reason}</p>

          {doc.analysisStatus === "ready" && (
            <div className="mt-4 space-y-3">
              {doc.analysisSummary && (
                <p className="text-sm text-foreground">{doc.analysisSummary}</p>
              )}
              {doc.changes.map((change, i) => (
                <ChangeBlock
                  key={i}
                  docId={doc.id}
                  docTitle={doc.title}
                  docUrl={doc.url}
                  change={change}
                  index={i}
                />
              ))}
            </div>
          )}

          {doc.analysisStatus === "error" && doc.analysisSummary && (
            <p className="mt-3 text-sm text-destructive">{doc.analysisSummary}</p>
          )}

          {(doc.analysisStatus === "pending" || doc.analysisStatus === "analyzing") && (
            <p className="mt-3 text-sm text-muted-foreground">Finding the exact doc changes...</p>
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
                  title={
                    hasIncludedChanges ? undefined : "All changes are ignored — nothing to include."
                  }
                  onClick={() => createPullRequest.mutate({ suggestionId: doc.id })}
                >
                  <IconGitPullRequest className="size-4" />
                  {createPullRequest.isPending ? "Creating..." : "Create pull request"}
                </Button>
              ) : (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={createPullRequest.isPending || !hasIncludedChanges}
                      title={
                        hasIncludedChanges
                          ? undefined
                          : "All changes are ignored — nothing to include."
                      }
                    >
                      <IconGitPullRequest className="size-4" />
                      {createPullRequest.isPending ? "Creating..." : "Create pull request"}
                      <IconChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => createPullRequest.mutate({ suggestionId: doc.id })}
                    >
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ReportNavItem({
  reportId,
  label,
  count,
  selected,
  onSelect,
}: {
  reportId: string;
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const renameReport = useActionMutation("rename-report");

  if (editing) {
    const commit = () => {
      const trimmed = draft.trim();
      setEditing(false);
      if (trimmed && trimmed !== label) renameReport.mutate({ id: reportId, name: trimmed });
    };
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setDraft(label);
            setEditing(false);
          }
        }}
        className="h-7 px-2 py-1 text-sm"
      />
    );
  }

  return (
    <div
      className={cn(
        "group/nav flex items-center gap-1 rounded-md",
        selected ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-1.5 text-left text-sm",
          selected ? "font-medium text-foreground" : "text-muted-foreground group-hover/nav:text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-xs tabular-nums">{count}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(label);
          setEditing(true);
        }}
        aria-label="Rename report"
        className="mr-1 shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover/nav:opacity-100"
      >
        <IconPencil className="size-3" />
      </button>
    </div>
  );
}

export default function TrackedRoute() {
  const { data: docs, isLoading } = useActionQuery("list-tracked-docs", {});
  const { data: jiraStatus } = useActionQuery("get-jira-status", {});
  const { data: githubStatus } = useActionQuery("get-github-status", {});
  const { data: criteriaData } = useActionQuery("get-criteria", {});
  const criteria: Criteria = criteriaData ?? { selectionCriteria: "", outputFormat: "", outputTone: "" };
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

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

  // Reports to list in the nav, in the order their most recently tracked
  // item appears — docs is already sorted most-recently-tracked first.
  const reportGroups = useMemo(() => {
    const groups: { reportId: string; label: string; count: number }[] = [];
    const indexByReport = new Map<string, number>();
    for (const doc of docs ?? []) {
      const existingIndex = indexByReport.get(doc.reportId);
      if (existingIndex === undefined) {
        indexByReport.set(doc.reportId, groups.length);
        groups.push({
          reportId: doc.reportId,
          label:
            doc.reportUserChosenName ?? formatRange(doc.reportRangeStart, doc.reportRangeEnd),
          count: 1,
        });
      } else {
        groups[existingIndex].count += 1;
      }
    }
    return groups;
  }, [docs]);

  const visibleDocs = useMemo(
    () => (selectedReportId ? (docs ?? []).filter((doc) => doc.reportId === selectedReportId) : (docs ?? [])),
    [docs, selectedReportId],
  );

  return (
    <div className="mx-auto flex max-w-6xl gap-6 p-6">
      {!isLoading && docs && docs.length > 0 && (
        <nav className="flex w-56 shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => setSelectedReportId(null)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm",
              selectedReportId === null
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            All reports
            <span className="text-xs tabular-nums">{docs.length}</span>
          </button>
          {reportGroups.map((group) => (
            <ReportNavItem
              key={group.reportId}
              reportId={group.reportId}
              label={group.label}
              count={group.count}
              selected={selectedReportId === group.reportId}
              onSelect={() => setSelectedReportId(group.reportId)}
            />
          ))}
        </nav>
      )}

      <div className="flex min-w-0 max-w-4xl flex-1 flex-col gap-4">
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
            {visibleDocs.map((doc) => (
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
    </div>
  );
}
