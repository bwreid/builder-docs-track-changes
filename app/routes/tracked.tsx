import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import {
  IconBrandJira,
  IconExternalLink,
  IconGitPullRequest,
} from "@tabler/icons-react";

import { APP_TITLE } from "@/lib/app-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

type Change = { before: string; after: string; reasoning: string };

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
  reportRangeStart: string;
  reportRangeEnd: string | null;
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

function TrackedDocCard({ doc, jiraConnected }: { doc: TrackedDoc; jiraConnected: boolean }) {
  const untrack = useActionMutation("update-doc-suggestion-status");
  const createJiraTicket = useActionMutation("create-jira-ticket");

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
            <div key={i} className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Before
              </p>
              <p className="mt-1 text-foreground line-through decoration-destructive/60">
                {change.before}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                After
              </p>
              <p className="mt-1 text-foreground">{change.after}</p>
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

      <div className="mt-4 flex items-center gap-2">
        {doc.jiraIssueKey ? (
          <Button size="sm" variant="outline" className="text-xs" asChild>
            <a href={doc.jiraIssueUrl ?? "#"} target="_blank" rel="noreferrer">
              <IconBrandJira className="size-4" />
              {doc.jiraIssueKey}
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
        <Button size="sm" variant="outline" disabled title="Coming soon">
          <IconGitPullRequest className="size-4" />
          Create pull request
        </Button>
      </div>
    </div>
  );
}

export default function TrackedRoute() {
  const { data: docs, isLoading } = useActionQuery("list-tracked-docs", {});
  const { data: jiraStatus } = useActionQuery("get-jira-status", {});

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
            <TrackedDocCard key={doc.id} doc={doc} jiraConnected={jiraStatus?.connected ?? false} />
          ))}
        </div>
      )}
    </div>
  );
}
