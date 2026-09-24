import { IconPencil } from "@tabler/icons-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Click-to-edit label with a pencil affordance on hover. `value` is the name
// currently on display (already resolved from userChosenName || fallback);
// `onSave` is only called with a real, changed, non-empty name.
export function RenameField({
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
