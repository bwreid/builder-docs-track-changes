import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER, githubRuntime } from "../server/lib/github.js";

export default defineAction({
  description:
    "Check a tracked doc suggestion's pull request status on GitHub. If the PR was closed without merging, clears it so a new pull request can be created. GitHub has no separate 'deleted' state for a PR — closed-without-merge is the only case that resets it.",
  schema: z.object({
    suggestionId: z.string().describe("Doc suggestion id"),
  }),
  run: async ({ suggestionId }) => {
    const db = getDb();
    const [suggestion] = await db
      .select()
      .from(schema.docSuggestions)
      .where(eq(schema.docSuggestions.id, suggestionId));
    if (!suggestion) fail("Doc suggestion not found.", { statusCode: 404 });
    if (!suggestion.prNumber) return { hasPr: false as const };

    const result = (await githubRuntime.executeRequest({
      provider: "github",
      method: "GET",
      path: `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls/${suggestion.prNumber}`,
    })) as { response?: { ok?: boolean; json?: unknown } };
    const json = result.response?.json as { state?: unknown; merged?: unknown } | undefined;

    if (!result.response?.ok || typeof json?.state !== "string") {
      // Can't confirm status right now (rate limit, transient error, etc.) —
      // leave the stored PR as-is rather than clearing on an ambiguous signal.
      return { hasPr: true as const, state: "unknown" as const };
    }

    if (json.state === "closed" && !json.merged) {
      // Multiple suggestions can share one PR (consolidated onto the same
      // branch) — clear every row referencing it, not just this one, so a
      // sibling suggestion's button also re-enables.
      await db
        .update(schema.docSuggestions)
        .set({ prNumber: null, prUrl: null })
        .where(eq(schema.docSuggestions.prNumber, suggestion.prNumber));
      return { hasPr: false as const, wasClosed: true };
    }

    return { hasPr: true as const, state: json.state, merged: Boolean(json.merged) };
  },
});
