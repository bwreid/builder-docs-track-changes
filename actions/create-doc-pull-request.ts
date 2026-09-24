import { defineAction, fail } from "@agent-native/core/action";
import { readAppSecret } from "@agent-native/core/secrets";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { docSourceFilePath } from "../app/lib/docs-source.js";
import { getDb, schema } from "../server/db.js";
import {
  GITHUB_DEFAULT_BRANCH,
  GITHUB_REPO_NAME,
  GITHUB_REPO_OWNER,
  githubRuntime,
} from "../server/lib/github.js";

type GitHubJsonResponse = { response?: { ok?: boolean; json?: unknown } };
type Change = { before: string; after: string; reasoning: string };

function githubErrorMessage(result: GitHubJsonResponse, fallback: string): string {
  const json = result.response?.json as { message?: unknown } | undefined;
  return typeof json?.message === "string" ? json.message : fallback;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Real .mdx source hard-wraps prose (~85 char lines), so a sentence the
// agent extracted as one flowed line often contains an embedded newline in
// the actual file. Match on whitespace-collapsed text, but resolve back to
// the exact original span (real newlines and all) so the replacement only
// touches real content and preserves everything else untouched.
function findNormalizedRange(
  original: string,
  needle: string,
): { start: number; end: number } | null {
  const normalizedNeedle = normalizeWhitespace(needle);
  if (!normalizedNeedle) return null;

  let normalized = "";
  const indexMap: number[] = [];
  let inWhitespace = false;
  for (let i = 0; i < original.length; i++) {
    const ch = original[i];
    if (/\s/.test(ch)) {
      if (!inWhitespace) {
        normalized += " ";
        indexMap.push(i);
        inWhitespace = true;
      }
    } else {
      normalized += ch;
      indexMap.push(i);
      inWhitespace = false;
    }
  }

  const foundAt = normalized.indexOf(normalizedNeedle);
  if (foundAt === -1) return null;
  const endNormIdx = foundAt + normalizedNeedle.length - 1;
  return { start: indexMap[foundAt], end: indexMap[endNormIdx] + 1 };
}

// Verify every change is present (even allowing for whitespace/line-wrap
// differences) before mutating anything, then apply all of them back-to-
// front so earlier ranges stay valid. Never opens a partial or garbage PR —
// if even one change can't be located, fails naming every mismatch at once.
function verifyAndApplyChanges(content: string, changes: Change[], filePath: string): string {
  const matchResults = changes.map((change, i) => ({
    index: i,
    change,
    range: findNormalizedRange(content, change.before),
  }));
  const unmatched = matchResults.filter((r) => r.range === null);
  if (unmatched.length > 0) {
    const details = unmatched
      .map(
        (r) =>
          `Change ${r.index + 1}: "${r.change.before.slice(0, 120)}${r.change.before.length > 120 ? "..." : ""}"`,
      )
      .join(" | ");
    fail(
      `${unmatched.length} of ${changes.length} change(s) could not be matched (even allowing for ` +
        `whitespace/line-wrap differences) in ${filePath} on GitHub — the doc may have changed since ` +
        `this suggestion was made. ${details}`,
      { statusCode: 422, errorCode: "doc_pr_before_mismatch" },
    );
  }

  let newContent = content;
  for (const result of [...matchResults].sort((a, b) => b.range!.start - a.range!.start)) {
    const { start, end } = result.range!;
    newContent = newContent.slice(0, start) + result.change.after + newContent.slice(end);
  }
  return newContent;
}

function buildChangesSection(
  suggestion: { title: string; url: string; reason: string },
  changes: Change[],
): string {
  return [
    `Doc page: [${suggestion.title}](${suggestion.url})`,
    "",
    suggestion.reason,
    "",
    ...changes.flatMap((change, i) => [
      `**Change ${i + 1}**`,
      "",
      `Before: ${change.before}`,
      `After: ${change.after}`,
      `Why: ${change.reasoning}`,
      "",
    ]),
  ].join("\n");
}

export default defineAction({
  description:
    "Open a draft pull request on BuilderIO/agent-native applying a tracked doc suggestion's before/after edits to the real .mdx source file. If targetPrNumber is given, instead add the changes as a new commit onto that existing open PR from the same report.",
  schema: z.object({
    suggestionId: z.string().describe("Doc suggestion id"),
    targetPrNumber: z
      .number()
      .optional()
      .describe(
        "If set, add this suggestion's changes as a new commit onto this existing open PR (from the same report) instead of opening a new one",
      ),
  }),
  run: async ({ suggestionId, targetPrNumber }, ctx) => {
    const userEmail = ctx?.userEmail;
    if (!userEmail) fail("Not authenticated.", { statusCode: 401 });

    const db = getDb();
    const [suggestion] = await db
      .select()
      .from(schema.docSuggestions)
      .where(eq(schema.docSuggestions.id, suggestionId));
    if (!suggestion) fail("Doc suggestion not found.", { statusCode: 404 });
    if (suggestion.prUrl) {
      return { number: suggestion.prNumber, url: suggestion.prUrl };
    }

    const tokenSecret = await readAppSecret({
      key: "GITHUB_TOKEN",
      scope: "user",
      scopeId: userEmail,
    });
    if (!tokenSecret?.value) {
      fail("GitHub isn't set up yet. Add your GitHub token in Settings and try again.", {
        errorCode: "github_not_connected",
      });
    }

    const changes = JSON.parse(suggestion.changes) as Change[];
    if (changes.length === 0) {
      fail("This suggestion has no changes to apply.", { statusCode: 400 });
    }

    const filePath = docSourceFilePath(suggestion.path);

    async function createNewPullRequest(): Promise<{ number: number; url: string }> {
      let file: { content: string | null; sha: string };
      try {
        file = await githubRuntime.readGitHubRepositoryFile({
          owner: GITHUB_REPO_OWNER,
          repo: GITHUB_REPO_NAME,
          path: filePath,
          // Explicit: always start from main's current content, never
          // whatever state an earlier attempt's branch happens to be at.
          ref: GITHUB_DEFAULT_BRANCH,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("404")) {
          fail(
            `Could not find ${filePath} in ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} on GitHub.`,
            { statusCode: 404 },
          );
        }
        fail(`Failed to read the doc source file from GitHub: ${message}`, { statusCode: 502 });
      }
      if (file.content == null) {
        fail(`GitHub returned no readable content for ${filePath}.`, { statusCode: 502 });
      }

      const newContent = verifyAndApplyChanges(file.content, changes, filePath);
      const branchName = `docs/${suggestion.id}`;

      const refResult = (await githubRuntime.executeRequest({
        provider: "github",
        method: "GET",
        path: `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/ref/heads/${GITHUB_DEFAULT_BRANCH}`,
      })) as GitHubJsonResponse;
      const baseSha = (refResult.response?.json as { object?: { sha?: unknown } } | undefined)
        ?.object?.sha;
      if (!refResult.response?.ok || typeof baseSha !== "string") {
        fail(
          `Failed to read the ${GITHUB_DEFAULT_BRANCH} branch from GitHub: ${githubErrorMessage(refResult, "unknown error")}`,
          { statusCode: 502 },
        );
      }

      const createRefResult = (await githubRuntime.executeRequest({
        provider: "github",
        method: "POST",
        path: `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/refs`,
        body: { ref: `refs/heads/${branchName}`, sha: baseSha },
      })) as GitHubJsonResponse;
      const createRefJson = createRefResult.response?.json as { message?: unknown } | undefined;
      const branchAlreadyExists = createRefJson?.message === "Reference already exists";
      if (!createRefResult.response?.ok && !branchAlreadyExists) {
        fail(
          `Failed to create a branch on GitHub: ${githubErrorMessage(createRefResult, "unknown error")}`,
          { statusCode: 502 },
        );
      }
      if (branchAlreadyExists) {
        // A branch from an earlier, now-abandoned attempt (e.g. a closed,
        // unmerged PR) can still be sitting at a stale commit. Reset it to
        // the current main HEAD so the file sha we just read from main
        // actually matches what's on the branch — otherwise the write
        // below 409s.
        const resetRefResult = (await githubRuntime.executeRequest({
          provider: "github",
          method: "PATCH",
          path: `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/refs/heads/${branchName}`,
          body: { sha: baseSha, force: true },
        })) as GitHubJsonResponse;
        if (!resetRefResult.response?.ok) {
          fail(
            `Failed to reset the existing branch on GitHub: ${githubErrorMessage(resetRefResult, "unknown error")}`,
            { statusCode: 502 },
          );
        }
      }

      try {
        await githubRuntime.writeGitHubRepositoryFile({
          owner: GITHUB_REPO_OWNER,
          repo: GITHUB_REPO_NAME,
          path: filePath,
          content: newContent,
          message: `Docs: update "${suggestion.title}"`,
          branch: branchName,
          sha: file.sha,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(`Failed to commit the doc change to GitHub: ${message}`, { statusCode: 502 });
      }

      const body = [
        "Agent-Native flagged this documentation page for an update based on a recent Agent-Native change report.",
        "",
        buildChangesSection(suggestion, changes),
        "_Opened automatically by Agent-Native from a tracked doc suggestion._",
      ].join("\n");

      const prResult = (await githubRuntime.executeRequest({
        provider: "github",
        method: "POST",
        path: `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls`,
        body: {
          title: `Docs: update "${suggestion.title}"`,
          head: branchName,
          base: GITHUB_DEFAULT_BRANCH,
          body,
          draft: true,
        },
      })) as GitHubJsonResponse;
      const prJson = prResult.response?.json as
        | { number?: unknown; html_url?: unknown }
        | undefined;
      const prNumber = typeof prJson?.number === "number" ? prJson.number : null;
      const prUrl = typeof prJson?.html_url === "string" ? prJson.html_url : null;
      if (!prResult.response?.ok || !prNumber || !prUrl) {
        fail(`GitHub rejected the pull request: ${githubErrorMessage(prResult, "unknown error")}`, {
          statusCode: 502,
        });
      }

      await db
        .update(schema.docSuggestions)
        .set({ prNumber, prUrl })
        .where(eq(schema.docSuggestions.id, suggestionId));
      return { number: prNumber, url: prUrl };
    }

    async function joinExistingPullRequest(prNumber: number): Promise<{ number: number; url: string }> {
      // Guard against a stale picker or a tampered request: the target PR
      // must actually belong to some other suggestion in this same report.
      const siblings = await db
        .select()
        .from(schema.docSuggestions)
        .where(eq(schema.docSuggestions.prNumber, prNumber));
      if (!siblings.some((row) => row.reportId === suggestion.reportId)) {
        fail("That pull request isn't associated with this report.", { statusCode: 400 });
      }

      const prGetResult = (await githubRuntime.executeRequest({
        provider: "github",
        method: "GET",
        path: `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls/${prNumber}`,
      })) as GitHubJsonResponse;
      if (!prGetResult.response?.ok) {
        fail(
          `Failed to look up PR #${prNumber} on GitHub: ${githubErrorMessage(prGetResult, "unknown error")}`,
          { statusCode: 502 },
        );
      }
      const prGetJson = prGetResult.response?.json as
        | { state?: unknown; body?: unknown; html_url?: unknown; head?: { ref?: unknown } }
        | undefined;
      if (prGetJson?.state !== "open") {
        fail(`PR #${prNumber} is no longer open — refresh the page and choose again.`, {
          statusCode: 409,
        });
      }
      const headRef = prGetJson?.head?.ref;
      const targetPrUrl = prGetJson?.html_url;
      if (typeof headRef !== "string" || typeof targetPrUrl !== "string") {
        fail(`GitHub returned an unexpected response for PR #${prNumber}.`, { statusCode: 502 });
      }
      const currentBody = typeof prGetJson?.body === "string" ? prGetJson.body : "";

      let file: { content: string | null; sha: string };
      try {
        file = await githubRuntime.readGitHubRepositoryFile({
          owner: GITHUB_REPO_OWNER,
          repo: GITHUB_REPO_NAME,
          path: filePath,
          // Read from the PR's branch, not main — it may already carry an
          // earlier suggestion's commit to this same file.
          ref: headRef,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("404")) {
          fail(`Could not find ${filePath} on the ${headRef} branch on GitHub.`, {
            statusCode: 404,
          });
        }
        fail(`Failed to read the doc source file from GitHub: ${message}`, { statusCode: 502 });
      }
      if (file.content == null) {
        fail(`GitHub returned no readable content for ${filePath}.`, { statusCode: 502 });
      }

      const newContent = verifyAndApplyChanges(file.content, changes, filePath);

      try {
        await githubRuntime.writeGitHubRepositoryFile({
          owner: GITHUB_REPO_OWNER,
          repo: GITHUB_REPO_NAME,
          path: filePath,
          content: newContent,
          message: `Docs: update "${suggestion.title}"`,
          branch: headRef,
          sha: file.sha,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(`Failed to commit the doc change to GitHub: ${message}`, { statusCode: 502 });
      }

      const updatedBody = [
        currentBody.trimEnd(),
        "",
        "---",
        "",
        buildChangesSection(suggestion, changes),
      ].join("\n");
      const patchPrResult = (await githubRuntime.executeRequest({
        provider: "github",
        method: "PATCH",
        path: `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls/${prNumber}`,
        body: { body: updatedBody },
      })) as GitHubJsonResponse;
      if (!patchPrResult.response?.ok) {
        // The commit already landed — the important part succeeded. Don't
        // fail the whole action over a description-update hiccup; just log.
        console.error(
          `[create-doc-pull-request] Failed to update PR #${prNumber}'s description:`,
          githubErrorMessage(patchPrResult, "unknown error"),
        );
      }

      await db
        .update(schema.docSuggestions)
        .set({ prNumber, prUrl: targetPrUrl })
        .where(eq(schema.docSuggestions.id, suggestionId));
      return { number: prNumber, url: targetPrUrl };
    }

    return targetPrNumber != null
      ? await joinExistingPullRequest(targetPrNumber)
      : await createNewPullRequest();
  },
});
