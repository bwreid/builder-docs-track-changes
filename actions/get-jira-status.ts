import { defineAction, fail } from "@agent-native/core/action";
import { readAppSecret } from "@agent-native/core/secrets";
import { z } from "zod";

export default defineAction({
  description: "Check whether this app has Jira API credentials configured.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async (_args, ctx) => {
    const userEmail = ctx?.userEmail;
    if (!userEmail) fail("Not authenticated.", { statusCode: 401 });

    const [baseUrl, email, token] = await Promise.all([
      readAppSecret({ key: "JIRA_BASE_URL", scope: "user", scopeId: userEmail }),
      readAppSecret({ key: "JIRA_USER_EMAIL", scope: "user", scopeId: userEmail }),
      readAppSecret({ key: "JIRA_API_TOKEN", scope: "user", scopeId: userEmail }),
    ]);

    return { connected: Boolean(baseUrl?.value && email?.value && token?.value) };
  },
});
