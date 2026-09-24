import { createProviderApiRuntime } from "@agent-native/core/provider-api";

// Matches app/lib/app-config.ts APP_NAME — kept as a plain string here so
// server-only code doesn't reach across the client/server boundary for one
// constant.
export const JIRA_APP_ID = "change-reports";

export const jiraRuntime = createProviderApiRuntime({
  appId: JIRA_APP_ID,
  providerIds: ["jira"],
});

// Customer Education project, agreed with the team for doc-update tickets
// raised from tracked change reports.
export const JIRA_PROJECT_ID = "10041";
export const JIRA_PROJECT_KEY = "EDU";
export const JIRA_ISSUE_TYPE_ID = "10133"; // "General Docs Update"
// Jira labels can't contain spaces.
export const JIRA_LABELS = ["Agent-Native", "AI-Generated"];

// Best-effort: called after a PR has already been created/updated on
// GitHub, so a Jira hiccup here should never fail the caller's action —
// just log it.
export async function postJiraPullRequestComment(
  issueKey: string,
  prUrl: string,
  kind: "new" | "existing",
): Promise<void> {
  const prefix =
    kind === "new"
      ? "A new pull request was created here for these changes: "
      : "An existing pull request was updated with changes for this ticket: ";
  const body = {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: prefix },
          { type: "text", text: prUrl, marks: [{ type: "link", attrs: { href: prUrl } }] },
        ],
      },
    ],
  };

  try {
    const result = (await jiraRuntime.executeRequest({
      provider: "jira",
      method: "POST",
      path: `/rest/api/3/issue/${issueKey}/comment`,
      body: { body },
    })) as { response?: { ok?: boolean; json?: { id?: unknown; errorMessages?: unknown; errors?: unknown } } };

    if (!result.response?.ok) {
      console.error(
        `[jira] Failed to add PR comment to issue ${issueKey}:`,
        JSON.stringify(result.response?.json),
      );
    }
  } catch (error) {
    console.error(`[jira] Failed to add PR comment to issue ${issueKey}:`, error);
  }
}
