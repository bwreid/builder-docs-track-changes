import { defineAction, fail } from "@agent-native/core/action";
import { readAppSecret } from "@agent-native/core/secrets";
import { z } from "zod";

export default defineAction({
  description: "Check whether this app has a GitHub token configured.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async (_args, ctx) => {
    const userEmail = ctx?.userEmail;
    if (!userEmail) fail("Not authenticated.", { statusCode: 401 });

    const token = await readAppSecret({ key: "GITHUB_TOKEN", scope: "user", scopeId: userEmail });
    return { connected: Boolean(token?.value) };
  },
});
