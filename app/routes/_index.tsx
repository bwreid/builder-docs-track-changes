import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import {
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import { Fragment, useState } from "react";
import Markdown from "react-markdown";

import { type Criteria, formatCriteriaBlock } from "@/lib/criteria";
import { docRawMarkdownUrl } from "@/lib/docs-source";
import { APP_TITLE } from "@/lib/app-config";
import { NotificationsPanel } from "@/components/notifications-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function meta() {
  return [
    { title: APP_TITLE },
    {
      name: "description",
      content: "Track what changed in the Agent-Native codebase.",
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type ReportMode = "7d" | "14d" | "since-last" | "custom";

type DocSuggestionStatus = "new" | "ignored" | "tracked";

type DocSuggestion = {
  id: string;
  path: string;
  url: string;
  title: string;
  reason: string;
  relatedHeading: string;
  status: DocSuggestionStatus;
};

type ReportRow = {
  id: string;
  rangeStart: string;
  rangeEnd: string | null;
  status: "fetching" | "summarizing" | "ready" | "error";
  summary: string | null;
  docsSummary: string | null;
  docsSuggestions: DocSuggestion[];
  errorMessage: string | null;
  itemCount: number;
  prListUrl: string;
  userChosenName: string | null;
  createdAt: string;
};

function StatusBadge({ status }: { status: ReportRow["status"] }) {
  switch (status) {
    case "ready":
      return <Badge className="bg-primary text-primary-foreground">Ready</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "summarizing":
      return <Badge variant="secondary">Summarizing...</Badge>;
    case "fetching":
    default:
      return <Badge variant="secondary">Fetching...</Badge>;
  }
}

function headingId(reportId: string, text: string) {
  return `${reportId}-${slugify(text)}`;
}

function DocSuggestionRow({
  suggestion,
  report,
  criteria,
}: {
  suggestion: DocSuggestion;
  report: ReportRow;
  criteria: Criteria;
}) {
  const updateStatus = useActionMutation("update-doc-suggestion-status");

  const setStatus = (status: DocSuggestionStatus) => {
    const next = suggestion.status === status ? "new" : status;
    updateStatus.mutate(
      { id: suggestion.id, status: next },
      {
        onSuccess: () => {
          if (next !== "tracked") return;
          const criteriaBlock = formatCriteriaBlock(criteria);
          sendToAgentChat({
            message: "Find the exact doc changes for this tracked suggestion",
            context:
              criteriaBlock +
              `Doc suggestion id: ${suggestion.id}\n` +
              `Doc page: ${suggestion.url}\n` +
              `Doc raw source (fetch this, not the rendered page): ${docRawMarkdownUrl(suggestion.path)}\n` +
              `Doc title: ${suggestion.title}\n` +
              `Reason this doc was flagged: ${suggestion.reason}\n` +
              `Related report section: ${suggestion.relatedHeading}\n\n` +
              `Report summary for context:\n${report.summary ?? ""}\n\n` +
              "Fetch the raw source URL above (not the rendered doc page), find the specific existing sentence(s) that should change based on the reason and report summary, and propose exact before/after replacement text — copied verbatim from the raw source, markdown syntax and all — with reasoning grounded in the summary. Never anchor a change on text inside a JSX/HTML tag's quoted attribute value (e.g. inside summary=\"...\" or title=\"...\") if the after text adds new block-level content like a Callout, paragraph, or code block — that corrupts the file's structure. Keep before and after the same kind of content (prose stays prose); to add a new block near a JSX component, anchor on plain markdown text right before or after that component's closing tag, never inside one of its attributes. If you can fetch the source, call update-doc-suggestion-analysis with id \"" +
              suggestion.id +
              '" and { analysisSummary, changes: [{before, after, reasoning}] }. If the source cannot be fetched or no specific sentence needs to change, call fail-doc-suggestion-analysis with id "' +
              suggestion.id +
              '" and a short reason.',
            submit: true,
            openSidebar: true,
          });
        },
      },
    );
  };

  const isIgnored = suggestion.status === "ignored";
  const isTracked = suggestion.status === "tracked";

  return (
    <li className={cn("text-sm", isIgnored && "opacity-50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={suggestion.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center gap-1 font-medium text-foreground hover:underline",
              isIgnored && "line-through",
            )}
          >
            {suggestion.title}
            <IconExternalLink className="size-3 text-muted-foreground" />
          </a>
          <span className="text-muted-foreground"> &mdash; {suggestion.reason}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant={isIgnored ? "secondary" : "ghost"}
            className={cn(
              "h-6 px-2 text-xs",
              isIgnored ? "font-semibold" : "border border-border",
            )}
            onClick={() => setStatus("ignored")}
          >
            Ignore
          </Button>
          <Button
            size="sm"
            variant={isTracked ? "default" : "ghost"}
            className={cn(
              "h-6 px-2 text-xs",
              !isTracked && "border border-border",
            )}
            onClick={() => setStatus("tracked")}
          >
            Track
          </Button>
        </div>
      </div>
    </li>
  );
}

function DocsUpdateSection({
  report,
  criteria,
}: {
  report: ReportRow;
  criteria: Criteria;
}) {
  if (!report.docsSummary) return null;

  const relatedHeadings = Array.from(
    new Map(
      report.docsSuggestions.map((s) => [slugify(s.relatedHeading), s.relatedHeading]),
    ).entries(),
  );

  return (
    <div className="mb-4 rounded-md border border-border bg-muted/40 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Likely documentation updates
      </p>
      <p className="mt-2 text-sm text-foreground">{report.docsSummary}</p>

      {relatedHeadings.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Related to:{" "}
          {relatedHeadings.map(([slug, text], i) => (
            <Fragment key={slug}>
              {i > 0 && ", "}
              <a
                href={`#${headingId(report.id, text)}`}
                className="underline hover:text-foreground"
              >
                {text}
              </a>
            </Fragment>
          ))}
        </p>
      )}

      {report.docsSuggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {report.docsSuggestions.map((s) => (
            <DocSuggestionRow key={s.id} suggestion={s} report={report} criteria={criteria} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportRowView({ report, criteria }: { report: ReportRow; criteria: Criteria }) {
  const [open, setOpen] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteReport = useActionMutation("delete-report");

  return (
    <div className="rounded-md border border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 p-4">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex flex-1 items-center gap-3 text-left">
              <IconChevronRight
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-90",
                )}
              />
              <span className="text-sm font-medium">
                {report.userChosenName ?? formatRange(report.rangeStart, report.rangeEnd)}
              </span>
            </button>
          </CollapsibleTrigger>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {report.itemCount} feature PR{report.itemCount === 1 ? "" : "s"}
          </span>
          <StatusBadge status={report.status} />
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Delete report"
            onClick={() => setConfirmDelete(true)}
          >
            <IconTrash className="size-4" />
          </Button>
        </div>
        <CollapsibleContent className="px-4 pb-4">
          <DocsUpdateSection report={report} criteria={criteria} />

          {report.status === "ready" && report.summary && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
              <Markdown
                components={{
                  h1: ({ children }) => (
                    <h1 id={headingId(report.id, String(children))}>{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 id={headingId(report.id, String(children))}>{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 id={headingId(report.id, String(children))}>{children}</h3>
                  ),
                }}
              >
                {report.summary}
              </Markdown>
            </div>
          )}
          {report.status === "error" && report.errorMessage && (
            <p className="text-sm text-destructive">{report.errorMessage}</p>
          )}

          {report.prListUrl && (
            <a
              href={report.prListUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              View closed PRs on GitHub
              <IconExternalLink className="size-3" />
            </a>
          )}
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the report and its captured PR data. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteReport.mutate({ id: report.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function HomeRoute() {
  const { data: reports, isLoading } = useActionQuery("list-reports", {});
  const { data: criteriaData } = useActionQuery("get-criteria", {});
  const runReport = useActionMutation("create-report");
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const criteria: Criteria = criteriaData ?? { selectionCriteria: "", outputFormat: "", outputTone: "" };
  const latestRangeEnd = reports?.[0]?.rangeEnd ?? null;

  const runReportWithMode = (
    mode: ReportMode,
    range?: { customStart?: string; customEnd?: string },
  ) => {
    runReport.mutate(
      { mode, customStart: range?.customStart, customEnd: range?.customEnd },
      {
        onSuccess: (report) => {
          if (report.items.length === 0) return;
          const prList = report.items
            .slice(0, 60)
            .map(
              (item) =>
                "#" +
                item.prNumber +
                " " +
                item.title +
                " (by " +
                item.author +
                ", labels: " +
                (item.labels.join(", ") || "none") +
                ")\n" +
                item.excerpt,
            )
            .join("\n\n");
          const criteriaBlock = formatCriteriaBlock(criteria);
          sendToAgentChat({
            message: "Summarize this report",
            context:
              criteriaBlock +
              "Report id: " +
              report.id +
              "\nMerged, non-docs pull requests on BuilderIO/agent-native in this reporting window:\n\n" +
              prList +
              "\n\nFollow the team guidance above for what to look for and how to write the summary. Then call the list-docs-topics action to see the real agent-native.com/docs pages and their topics, and decide which docs likely need updating based on the themes you wrote and that guidance. Finally call update-report-summary with reportId \"" +
              report.id +
              '" and: summary (the themed markdown, no docs heading), docsSummary (a brief paragraph on what documentation should change), and docsSuggestions (an array of {path, reason, relatedHeading} using only paths returned by list-docs-topics and relatedHeading matching one of your summary headings exactly).',
            submit: true,
            openSidebar: true,
          });
        },
      },
    );
  };

  const handleCustomSubmit = () => {
    if (!customStart) return;
    runReportWithMode("custom", {
      customStart: new Date(customStart).toISOString(),
      customEnd: customEnd ? new Date(customEnd).toISOString() : undefined,
    });
    setCustomOpen(false);
    setCustomStart("");
    setCustomEnd("");
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium text-muted-foreground">
          Agent-Native change reports
        </h1>
        <div className="flex items-center gap-2">
          <NotificationsPanel />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={runReport.isPending}>
                {runReport.isPending ? "Running..." : "Run report"}
                <IconChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => runReportWithMode("7d")}>
                Last 7 days
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => runReportWithMode("14d")}>
                Last 14 days
              </DropdownMenuItem>
              {latestRangeEnd && (
                <DropdownMenuItem onSelect={() => runReportWithMode("since-last")}>
                  Since last report ({dateFormatter.format(new Date(latestRangeEnd))})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => setCustomOpen(true)}>
                Custom time frame
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!isLoading && reports && reports.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No reports yet. Run one to see what's shipped in agent-native.
          </p>
        </div>
      )}

      {!isLoading && reports && reports.length > 0 && (
        <div className="flex flex-col gap-2">
          {reports.map((report) => (
            <ReportRowView key={report.id} report={report} criteria={criteria} />
          ))}
        </div>
      )}

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom time frame</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="range-start">Start date</Label>
              <Input
                id="range-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="range-end">End date (defaults to today)</Label>
              <Input
                id="range-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCustomSubmit} disabled={!customStart}>
              Run report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
