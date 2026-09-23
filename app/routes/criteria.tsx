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

type CriteriaValues = {
  selectionCriteria: string;
  outputFormat: string;
  outputTone: string;
};

const FIELDS: { key: keyof CriteriaValues; label: string; placeholder: string; rows: number }[] = [
  {
    key: "selectionCriteria",
    label: "What to look for",
    rows: 8,
    placeholder: [
      "Examples:",
      "- Flag a doc page only when a PR changes user-facing behavior, not internal refactors.",
      "- Prefer the most specific doc page over a general overview page.",
      "- Ignore changes to example apps or templates unless the core API also changed.",
    ].join("\n"),
  },
  {
    key: "outputFormat",
    label: "Output format",
    rows: 8,
    placeholder: [
      "Examples:",
      "- Keep the summary to 2-3 sentences per theme.",
      "- Write reasons in plain language a support engineer could paste into a ticket.",
      "- Prefer imperative before/after phrasing for suggested doc edits.",
    ].join("\n"),
  },
  {
    key: "outputTone",
    label: "Output tone",
    rows: 12,
    placeholder: [
      "Examples:",
      "- Friendly and casual.",
      "- Formal and precise.",
      "- Technical, written for an experienced engineer.",
    ].join("\n"),
  },
];

const EMPTY_VALUES: CriteriaValues = { selectionCriteria: "", outputFormat: "", outputTone: "" };

function CriteriaField({
  id,
  label,
  value,
  placeholder,
  rows,
  onChange,
  onReset,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  rows: number;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-xs text-muted-foreground"
          onClick={onReset}
        >
          Reset to Default
        </Button>
      </div>
    </div>
  );
}

export default function CriteriaRoute() {
  const { data, isLoading } = useActionQuery("get-criteria", {});
  const updateCriteria = useActionMutation("update-criteria");
  const [values, setValues] = useState<CriteriaValues>(EMPTY_VALUES);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !dirty) {
      setValues({
        selectionCriteria: data.selectionCriteria,
        outputFormat: data.outputFormat,
        outputTone: data.outputTone,
      });
    }
  }, [data, dirty]);

  const setField = (key: keyof CriteriaValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  const resetField = (key: keyof CriteriaValues) => {
    if (!data?.defaults) return;
    setValues((v) => ({ ...v, [key]: data.defaults[key] }));
    setDirty(true);
  };

  const save = () => {
    updateCriteria.mutate(values, { onSuccess: () => setDirty(false) });
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
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        FIELDS.map((field) => (
          <CriteriaField
            key={field.key}
            id={field.key}
            label={field.label}
            value={values[field.key]}
            placeholder={field.placeholder}
            rows={field.rows}
            onChange={(value) => setField(field.key, value)}
            onReset={() => resetField(field.key)}
          />
        ))
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
