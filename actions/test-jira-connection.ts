import { defineAction, fail } from "@agent-native/core/action";
import { readAppSecret } from "@agent-native/core/secrets";
import { z } from "zod";

export default defineAction({
  description: "Test the saved Jira credentials by calling the Jira API.",
  schema: z.object({}),
  run: async (_args, ctx) => {
    const userEmail = ctx?.userEmail;
    if (!userEmail) fail("Not authenticated.", { statusCode: 401 });

    const [baseUrlSecret, emailSecret, tokenSecret] = await Promise.all([
      readAppSecret({ key: "JIRA_BASE_URL", scope: "user", scopeId: userEmail }),
      readAppSecret({ key: "JIRA_USER_EMAIL", scope: "user", scopeId: userEmail }),
      readAppSecret({ key: "JIRA_API_TOKEN", scope: "user", scopeId: userEmail }),
    ]);
    const baseUrl = baseUrlSecret?.value?.trim().replace(/\/+$/, "");
    const email = emailSecret?.value;
    const token = tokenSecret?.value;
    if (!baseUrl || !email || !token) {
      return { ok: false, error: "Set the Jira site URL, account email, and API token first." };
    }

    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, error: `Jira rejected the credentials (HTTP ${res.status})` };
    }
    const me = (await res.json().catch(() => ({}))) as { displayName?: string };
    return { ok: true, displayName: me.displayName };
  },
});
