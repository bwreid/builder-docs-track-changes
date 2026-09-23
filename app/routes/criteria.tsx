import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useEffect, useState } from "react";

import { APP_TITLE } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function meta() {
  return [
    { title: `Criteria - ${APP_TITLE}` },
    {
      name: "description",
      content: "Guidance the agent uses to recommend documentation changes.",
    },
  ];
}

const SELECTION_PLACEHOLDER = [
  "Examples:",
  "- Flag a doc page only when a PR changes user-facing behavior, not internal refactors.",
  "- Prefer the most specific doc page over a general overview page.",
  "- Ignore changes to example apps or templates unless the core API also changed.",
].join("\n");

const OUTPUT_FORMAT_PLACEHOLDER = [
  "Examples:",
  "- Keep the summary to 2-3 sentences per theme.",
  "- Write reasons in plain language a support engineer could paste into a ticket.",
  "- Prefer imperative before/after phrasing for suggested doc edits.",
].join("\n");

export default function CriteriaRoute() {
  const { data, isLoading } = useActionQuery("get-criteria", {});
  const updateCriteria = useActionMutation("update-criteria");
  const [selectionCriteria, setSelectionCriteria] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !dirty) {
      setSelectionCriteria(data.selectionCriteria);
      setOutputFormat(data.outputFormat);
    }
  }, [data, dirty]);

  const save = () => {
    updateCriteria.mutate(
      { selectionCriteria, outputFormat },
      { onSuccess: () => setDirty(false) },
    );
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-sm font-medium text-muted-foreground">Criteria</h1>
        <p className="text-sm text-muted-foreground">
          Guidance the agent applies when deciding which docs need updating and what
          to recommend. Edit this to influence how change reports and tracked doc
          suggestions are generated.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="selection-criteria">What to look for</Label>
            <textarea
              id="selection-criteria"
              value={selectionCriteria}
              onChange={(e) => {
                setSelectionCriteria(e.target.value);
                setDirty(true);
              }}
              placeholder={SELECTION_PLACEHOLDER}
              rows={8}
              className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="output-format">Output format</Label>
            <textarea
              id="output-format"
              value={outputFormat}
              onChange={(e) => {
                setOutputFormat(e.target.value);
                setDirty(true);
              }}
              placeholder={OUTPUT_FORMAT_PLACEHOLDER}
              rows={8}
              className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={!dirty || updateCriteria.isPending}>
          {updateCriteria.isPending ? "Saving..." : "Save"}
        </Button>
        {!dirty && updateCriteria.isSuccess && (
          <span className="text-xs text-muted-foreground">Saved.</span>
        )}
      </div>
    </div>
  );
}
