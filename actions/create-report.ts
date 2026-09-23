import { defineAction, fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server";
import { readAppSecret } from "@agent-native/core/secrets";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { GITHUB_REPO_NAME as REPO_NAME, GITHUB_REPO_OWNER as REPO_OWNER } from "../server/lib/github.js";

const SINCE_LAST_FALLBACK_DAYS = 30;
const MAX_PAGES = 10;
const PER_PAGE = 100;

const DOCS_ONLY_PATTERN = /^docs?(\(|:)|documentation/i;

interface GitHubPull {
  number: number;
  title: string;
  html_url: string;
  user: { login: string } | null;
  merged_at: string | null;
  updated_at: string;
  body: string | null;
  labels: { name: string }[];
}

function isDocsOnly(pr: GitHubPull): boolean {
  if (DOCS_ONLY_PATTERN.test(pr.title)) return true;
  return pr.labels.some((label) => /doc/i.test(label.name));
}

// GitHub's search qualifiers reject milliseconds and the "Z" UTC suffix —
// they need whole seconds and an explicit "+00:00" offset.
function formatGithubSearchDate(iso: string): string {
  return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function buildPrListUrl(rangeStart: string, rangeEnd: string): string {
  const start = formatGithubSearchDate(rangeStart);
  const end = formatGithubSearchDate(rangeEnd);
  const query = `is:pr is:closed merged:${start}..${end}`;
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}/pulls?q=${encodeURIComponent(query)}`;
}

async function fetchMergedPullsInRange(
  rangeStart: string,
  rangeEnd: string,
  token: string | undefined,
): Promise<GitHubPull[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "agent-native-change-tracker",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const startMs = new Date(rangeStart).getTime();
  const endMs = new Date(rangeEnd).getTime();
  const matched: GitHubPull[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=closed&sort=updated&direction=desc&per_page=${PER_PAGE}&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text();
      fail(`GitHub API request failed (HTTP ${res.status}): ${body.slice(0, 200)}`, {
        statusCode: res.status === 403 ? 429 : 502,
      });
    }
    const pulls = (await res.json()) as GitHubPull[];
    if (pulls.length === 0) break;

    for (const pr of pulls) {
      if (!pr.merged_at) continue;
      const mergedMs = new Date(pr.merged_at).getTime();
      if (mergedMs > startMs && mergedMs <= endMs) matched.push(pr);
    }

    const oldestUpdatedAt = pulls[pulls.length - 1].updated_at;
    if (new Date(oldestUpdatedAt).getTime() < startMs) break;
    if (pulls.length < PER_PAGE) break;
  }

  return matched;
}

export default defineAction({
  description:
    "Fetch merged pull requests on BuilderIO/agent-native for a chosen timeframe and store them as a new report, excluding docs-only PRs. Deterministic — does not summarize; call the agent to write the narrative summary via update-report-summary.",
  schema: z.object({
    mode: z
      .enum(["7d", "14d", "since-last", "custom"])
      .default("7d")
      .describe(
        'Report timeframe: "7d" (past 7 days), "14d" (past 14 days), "since-last" (since the previous report\'s end), or "custom" (use customStart/customEnd)',
      ),
    customStart: z
      .string()
      .optional()
      .describe("ISO timestamp for the start of the range. Required when mode is custom."),
    customEnd: z
      .string()
      .optional()
      .describe("ISO timestamp for the end of the range. Defaults to now when mode is custom."),
  }),
  run: async ({ mode, customStart, customEnd }) => {
    const db = getDb();
    const now = new Date();

    const [previous] = await db
      .select()
      .from(schema.reports)
      .orderBy(desc(schema.reports.createdAt))
      .limit(1);

    let rangeStart: string;
    let rangeEnd: string;
    if (mode === "7d") {
      rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      rangeEnd = now.toISOString();
    } else if (mode === "14d") {
      rangeStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      rangeEnd = now.toISOString();
    } else if (mode === "since-last") {
      rangeStart =
        previous?.rangeEnd ??
        new Date(
          now.getTime() - SINCE_LAST_FALLBACK_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
      rangeEnd = now.toISOString();
    } else {
      if (!customStart) fail('customStart is required when mode is "custom".');
      rangeStart = new Date(customStart).toISOString();
      rangeEnd = customEnd ? new Date(customEnd).toISOString() : now.toISOString();
    }

    const email = getRequestUserEmail();
    const tokenSecret = email
      ? await readAppSecret({ key: "GITHUB_TOKEN", scope: "user", scopeId: email })
      : null;

    const reportId = crypto.randomUUID();
    const prListUrl = buildPrListUrl(rangeStart, rangeEnd);
    await db.insert(schema.reports).values({
      id: reportId,
      rangeStart,
      status: "fetching",
      prListUrl,
    });

    let allPulls: GitHubPull[];
    try {
      allPulls = await fetchMergedPullsInRange(rangeStart, rangeEnd, tokenSecret?.value);
    } catch (error) {
      await db
        .update(schema.reports)
        .set({
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        })
        .where(eq(schema.reports.id, reportId));
      throw error;
    }

    const pulls = allPulls.filter((pr) => !isDocsOnly(pr));

    if (pulls.length > 0) {
      await db.insert(schema.reportItems).values(
        pulls.map((pr) => ({
          id: crypto.randomUUID(),
          reportId,
          prNumber: pr.number,
          title: pr.title,
          url: pr.html_url,
          author: pr.user?.login ?? "unknown",
          mergedAt: pr.merged_at as string,
          labels: JSON.stringify(pr.labels.map((l) => l.name)),
          excerpt: (pr.body ?? "").slice(0, 500),
        })),
      );
    }

    const [updated] = await db
      .update(schema.reports)
      .set({
        rangeEnd,
        itemCount: pulls.length,
        status: pulls.length > 0 ? "summarizing" : "ready",
        summary:
          pulls.length > 0
            ? null
            : "No feature-related pull requests were merged in this period.",
      })
      .where(eq(schema.reports.id, reportId))
      .returning();

    return {
      ...updated,
      items: pulls.map((pr) => ({
        prNumber: pr.number,
        title: pr.title,
        url: pr.html_url,
        author: pr.user?.login ?? "unknown",
        mergedAt: pr.merged_at,
        labels: pr.labels.map((l) => l.name),
        excerpt: (pr.body ?? "").slice(0, 500),
      })),
    };
  },
});
