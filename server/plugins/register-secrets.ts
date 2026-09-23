import { defineNitroPlugin, getRequestUserEmail } from "@agent-native/core/server";
import { readAppSecret, registerRequiredSecret } from "@agent-native/core/secrets";

export default defineNitroPlugin(() => {
  registerRequiredSecret({
    key: "GITHUB_TOKEN",
    label: "GitHub token",
    description:
      "Raises the GitHub API rate limit from 60 to 5,000 requests/hour when running reports. Reports still work without it.",
    docsUrl: "https://github.com/settings/tokens",
    scope: "user",
    kind: "api-key",
    required: false,
    validator: async (value) => {
      const res = await fetch("https://api.github.com/rate_limit", {
        headers: { Authorization: "Bearer " + value },
      });
      return res.ok
        ? { ok: true }
        : { ok: false, error: "GitHub rejected the token (HTTP " + res.status + ")" };
    },
  });

  // Jira API-token auth (no OAuth app to register) — get a token from
  // https://id.atlassian.com/manage-profile/security/api-tokens.
  registerRequiredSecret({
    key: "JIRA_BASE_URL",
    label: "Jira site URL",
    description: 'Your Jira Cloud site, e.g. "https://yourcompany.atlassian.net".',
    scope: "user",
    kind: "api-key",
    required: true,
  });

  registerRequiredSecret({
    key: "JIRA_USER_EMAIL",
    label: "Jira account email",
    description: "The email address of the Atlassian account that owns the API token below.",
    scope: "user",
    kind: "api-key",
    required: true,
  });

  registerRequiredSecret({
    key: "JIRA_API_TOKEN",
    label: "Jira API token",
    description: "An API token for your Atlassian account.",
    docsUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    scope: "user",
    kind: "api-key",
    required: true,
    // The secrets-write HTTP route (unlike the actions pipeline) never wraps
    // this call in request-context, so getRequestUserEmail() reads nothing
    // even for a signed-in caller. Degrade to "can't verify from here" rather
    // than blocking the save — the real connectivity check is the
    // test-jira-connection action, which gets a reliable ctx.userEmail.
    validator: async (value) => {
      const userEmail = getRequestUserEmail();
      if (!userEmail) return { ok: true };

      const [baseUrlSecret, emailSecret] = await Promise.all([
        readAppSecret({ key: "JIRA_BASE_URL", scope: "user", scopeId: userEmail }),
        readAppSecret({ key: "JIRA_USER_EMAIL", scope: "user", scopeId: userEmail }),
      ]);
      const baseUrl = baseUrlSecret?.value?.trim().replace(/\/+$/, "");
      const email = emailSecret?.value;
      if (!baseUrl || !email) return { ok: true };

      const auth = Buffer.from(email + ":" + value).toString("base64");
      const res = await fetch(baseUrl + "/rest/api/3/myself", {
        headers: { Authorization: "Basic " + auth, Accept: "application/json" },
      });
      return res.ok
        ? { ok: true }
        : { ok: false, error: "Jira rejected the token (HTTP " + res.status + ")" };
    },
  });
});
