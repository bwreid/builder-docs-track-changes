import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconExternalLink, IconPencil, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { APP_TITLE } from "@/lib/app-config";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function meta() {
  return [
    { title: `Docs Mapping - ${APP_TITLE}` },
    {
      name: "description",
      content: "The map of agent-native.com/docs pages used to suggest doc updates.",
    },
  ];
}

type DocMapEntry = { path: string; title: string; topics: string[] };

function topicsToText(topics: string[]) {
  return topics.join(", ");
}

function textToTopics(text: string) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function DocMapRow({
  entry,
  baseUrl,
}: {
  entry: DocMapEntry;
  baseUrl: string;
}) {
  const saveEntry = useActionMutation("save-docs-map-entry");
  const deleteEntry = useActionMutation("delete-docs-map-entry");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [topicsText, setTopicsText] = useState(topicsToText(entry.topics));

  const startEdit = () => {
    setTitle(entry.title);
    setTopicsText(topicsToText(entry.topics));
    setEditing(true);
  };

  const save = () => {
    saveEntry.mutate(
      { path: entry.path, title: title.trim() || entry.title, topics: textToTopics(topicsText) },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <a
          href={`${baseUrl}${entry.path}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {entry.path}
          <IconExternalLink className="size-3" />
        </a>
        <div className="flex shrink-0 items-center gap-1">
          {!editing && (
            <Button size="icon" variant="ghost" className="size-7" onClick={startEdit}>
              <IconPencil className="size-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <IconTrash className="size-3.5" />
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-8 text-sm"
          />
          <Input
            value={topicsText}
            onChange={(e) => setTopicsText(e.target.value)}
            placeholder="Topic keywords, comma separated"
            className="h-8 text-sm"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={save} disabled={saveEntry.isPending}>
              {saveEntry.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1">
          <p className="text-sm font-medium text-foreground">{entry.title}</p>
          {entry.topics.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{entry.topics.join(", ")}</p>
          )}
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this doc from the map?</AlertDialogTitle>
            <AlertDialogDescription>
              The agent will no longer be able to suggest updates to {entry.path}. This
              can&apos;t be undone, but you can re-add it or re-scrape later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteEntry.mutate({ path: entry.path })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddEntryForm({ onDone }: { onDone: () => void }) {
  const saveEntry = useActionMutation("save-docs-map-entry");
  const [path, setPath] = useState("");
  const [title, setTitle] = useState("");
  const [topicsText, setTopicsText] = useState("");

  const add = () => {
    if (!path.trim() || !title.trim()) return;
    saveEntry.mutate(
      { path: path.trim(), title: title.trim(), topics: textToTopics(topicsText) },
      {
        onSuccess: () => {
          setPath("");
          setTitle("");
          setTopicsText("");
          onDone();
        },
      },
    );
  };

  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Add a doc
      </p>
      <div className="flex flex-col gap-2">
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/docs/some-page/"
          className="h-8 text-sm"
        />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="h-8 text-sm"
        />
        <Input
          value={topicsText}
          onChange={(e) => setTopicsText(e.target.value)}
          placeholder="Topic keywords, comma separated"
          className="h-8 text-sm"
        />
        <div>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={add}
            disabled={!path.trim() || !title.trim() || saveEntry.isPending}
          >
            {saveEntry.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DocsMappingRoute() {
  const { data, isLoading } = useActionQuery("list-docs-map", {});
  const rescrape = useActionMutation("rescrape-docs-map");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const docs = data?.docs ?? [];
  const baseUrl = data?.baseUrl ?? "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.path.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.topics.some((t) => t.toLowerCase().includes(q)),
    );
  }, [docs, search]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-sm font-medium text-muted-foreground">Docs Mapping</h1>
        <p className="text-sm text-muted-foreground">
          The map of agent-native.com/docs pages and topic keywords the agent uses to
          suggest which docs need updating. Edit entries directly, or re-scrape to pick
          up new pages from the live docs nav.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by path, title, or topic..."
          className="h-8 flex-1 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 text-xs"
          onClick={() => rescrape.mutate({})}
          disabled={rescrape.isPending}
        >
          <IconRefresh className={rescrape.isPending ? "size-3.5 animate-spin" : "size-3.5"} />
          {rescrape.isPending ? "Re-scraping..." : "Re-scrape"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 text-xs"
          onClick={() => setShowAdd((v) => !v)}
        >
          <IconPlus className="size-3.5" />
          Add
        </Button>
      </div>

      {rescrape.isSuccess && rescrape.data && (
        <p className="text-xs text-muted-foreground">
          Re-scraped {rescrape.data.total} pages — {rescrape.data.added} added,{" "}
          {rescrape.data.updated} title{rescrape.data.updated === 1 ? "" : "s"} updated.
        </p>
      )}
      {rescrape.isError && (
        <p className="text-xs text-destructive">
          {rescrape.error instanceof Error ? rescrape.error.message : "Re-scrape failed."}
        </p>
      )}

      {showAdd && <AddEntryForm onDone={() => setShowAdd(false)} />}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {docs.length === 0 ? "No docs mapped yet." : "No docs match your search."}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <DocMapRow key={entry.path} entry={entry} baseUrl={baseUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
