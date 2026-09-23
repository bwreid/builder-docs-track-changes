import { createProviderApiRuntime } from "@agent-native/core/provider-api";

// The BuilderIO/agent-native repo this app fetches PR history from and
// opens draft doc-fix pull requests against.
export const GITHUB_REPO_OWNER = "BuilderIO";
export const GITHUB_REPO_NAME = "agent-native";
export const GITHUB_DEFAULT_BRANCH = "main";

export const githubRuntime = createProviderApiRuntime({
  appId: "change-reports",
  providerIds: ["github"],
});
