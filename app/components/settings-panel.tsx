import { agentNativePath } from "@agent-native/core/client/api-path";
import { useActionMutation } from "@agent-native/core/client/hooks";
import { IconSettings } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SECRETS_ENDPOINT = agentNativePath("/_agent-native/secrets");

type SecretStatus = { key: string; status: "set" | "unset" | "invalid" | "unknown"; last4?: string };

const JIRA_FIELDS = [
  { key: "JIRA_BASE_URL", label: "Jira site URL", placeholder: "https://yourcompany.atlassian.net" },
  { key: "JIRA_USER_EMAIL", label: "Jira account email", placeholder: "you@company.com" },
  { key: "JIRA_API_TOKEN", label: "Jira API token", placeholder: "" },
] as const;

type FieldKey = (typeof JIRA_FIELDS)[number]["key"];

async function writeSecret(key: string, value: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${SECRETS_ENDPOINT}/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  return res.ok && data.ok ? { ok: true } : { ok: false, error: data.error ?? "Failed to save." };
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, SecretStatus>>({});
  const [values, setValues] = useState<Record<FieldKey, string>>({
    JIRA_BASE_URL: "",
    JIRA_USER_EMAIL: "",
    JIRA_API_TOKEN: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const testConnection = useActionMutation("test-jira-connection");

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setTestResult(null);
    setErrors({});
    fetch(SECRETS_ENDPOINT)
      .then((r) => (r.ok ? (r.json() as Promise<SecretStatus[]>) : []))
      .then((all) => {
        const byKey: Record<string, SecretStatus> = {};
        for (const s of all) byKey[s.key] = s;
        setStatuses(byKey);
      })
      .catch(() => setStatuses({}));
  }, [open]);

  const save = async () => {
    setSaving(true);
    setErrors({});
    setSaved(false);
    setTestResult(null);

    // Order matters: the connection test reads the site URL and email that
    // were just saved, so those two must land first.
    const nextErrors: Record<string, string> = {};
    for (const field of JIRA_FIELDS) {
      const value = values[field.key].trim();
      if (!value) continue;
      const result = await writeSecret(field.key, value);
      if (!result.ok) nextErrors[field.key] = result.error ?? "Failed to save.";
    }

    setErrors(nextErrors);
    setSaving(false);
    if (Object.keys(nextErrors).length === 0) {
      setSaved(true);
      setValues({ JIRA_BASE_URL: "", JIRA_USER_EMAIL: "", JIRA_API_TOKEN: "" });
      fetch(SECRETS_ENDPOINT)
        .then((r) => (r.ok ? (r.json() as Promise<SecretStatus[]>) : []))
        .then((all) => {
          const byKey: Record<string, SecretStatus> = {};
          for (const s of all) byKey[s.key] = s;
          setStatuses(byKey);
        })
        .catch(() => {});
      testConnection.mutate(
        {},
        {
          onSuccess: (result) => {
            setTestResult(
              result.ok
                ? { ok: true, message: `Connected${result.displayName ? ` as ${result.displayName}` : ""}.` }
                : { ok: false, message: result.error ?? "Jira rejected the credentials." },
            );
          },
          onError: () => setTestResult({ ok: false, message: "Could not test the connection." }),
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label="Settings"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      >
        <IconSettings size={18} aria-hidden />
      </button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Jira details used to create tickets from tracked doc changes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {JIRA_FIELDS.map((field) => {
            const status = statuses[field.key];
            const isSet = status?.status === "set";
            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.key === "JIRA_API_TOKEN" ? "password" : "text"}
                  value={values[field.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={
                    isSet
                      ? `Currently set${status.last4 ? ` (••••${status.last4})` : ""} — leave blank to keep`
                      : field.placeholder
                  }
                />
                {errors[field.key] && (
                  <p className="text-xs text-destructive">{errors[field.key]}</p>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {testResult ? (
            <span className={testResult.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
              {testResult.message}
            </span>
          ) : saved ? (
            <span className="text-xs text-muted-foreground">
              {testConnection.isPending ? "Saved. Testing connection..." : "Saved."}
            </span>
          ) : null}
          <Button onClick={save} disabled={saving} className="ml-auto">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
