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
export const JIRA_LABELS = ["Agent-Native", "AI Generated"];
