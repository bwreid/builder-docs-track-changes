// DB-backed accessor for the docs map (see drizzle/schema.ts `docsMapEntries`).
// Lazily seeds from AGENT_NATIVE_DOCS_SEED on first read so existing report
// data keeps working without a manual migration step, then treats the table
// as the single source of truth for both the agent (list-docs-topics,
// update-report-summary) and the Docs Mapping settings page.
import { eq } from "drizzle-orm";

import { getDb, schema } from "../db.js";
import { AGENT_NATIVE_DOCS_SEED, DOCS_BASE_URL, type DocEntry } from "./agent-native-docs-map.js";

export { DOCS_BASE_URL, type DocEntry };

export interface DocsMapEntry extends DocEntry {
  path: string;
}

async function ensureSeeded(): Promise<void> {
  const db = getDb();
  const existing = await db.select({ path: schema.docsMapEntries.path }).from(schema.docsMapEntries).limit(1);
  if (existing.length > 0) return;

  const rows = Object.entries(AGENT_NATIVE_DOCS_SEED).map(([path, entry]) => ({
    path,
    title: entry.title,
    topics: JSON.stringify(entry.topics),
  }));
  if (rows.length === 0) return;
  await db.insert(schema.docsMapEntries).values(rows).onConflictDoNothing();
}

/** All docs map entries, keyed by path — the shape the agent-facing actions expect. */
export async function getDocsMap(): Promise<Record<string, DocEntry>> {
  await ensureSeeded();
  const db = getDb();
  const rows = await db.select().from(schema.docsMapEntries);
  const map: Record<string, DocEntry> = {};
  for (const row of rows) {
    map[row.path] = { title: row.title, topics: JSON.parse(row.topics) as string[] };
  }
  return map;
}

/** All docs map entries as a list, sorted by path — for the Docs Mapping page. */
export async function listDocsMap(): Promise<DocsMapEntry[]> {
  const map = await getDocsMap();
  return Object.entries(map)
    .map(([path, entry]) => ({ path, ...entry }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Create or update one entry. */
export async function saveDocsMapEntry(entry: DocsMapEntry): Promise<void> {
  const db = getDb();
  await db
    .insert(schema.docsMapEntries)
    .values({
      path: entry.path,
      title: entry.title,
      topics: JSON.stringify(entry.topics),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: schema.docsMapEntries.path,
      set: {
        title: entry.title,
        topics: JSON.stringify(entry.topics),
        updatedAt: new Date().toISOString(),
      },
    });
}

export async function deleteDocsMapEntry(path: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.docsMapEntries).where(eq(schema.docsMapEntries.path, path));
}

interface ScrapedDoc {
  path: string;
  title: string;
}

/** Parse `<a class="sidebar-link" ... href="/docs/x/">Title</a>` entries from the docs nav HTML. */
export function parseDocsNav(html: string): ScrapedDoc[] {
  const results: ScrapedDoc[] = [];
  const seen = new Set<string>();
  const re = /<a\s+class="sidebar-link"[^>]*href="(\/docs\/[a-z0-9-]*\/?)"[^>]*>([^<]+)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const path = match[1];
    const title = match[2].trim();
    if (!path || !title || seen.has(path)) continue;
    seen.add(path);
    results.push({ path, title });
  }
  return results;
}

export interface RescrapeSummary {
  added: number;
  updated: number;
  total: number;
}

/** Fetch the live docs nav and upsert path/title, preserving topics for known paths. */
export async function rescrapeDocsMap(): Promise<RescrapeSummary> {
  const res = await fetch(`${DOCS_BASE_URL}/docs/`);
  if (!res.ok) {
    throw new Error(`Fetching ${DOCS_BASE_URL}/docs/ failed (HTTP ${res.status})`);
  }
  const html = await res.text();
  const scraped = parseDocsNav(html);
  if (scraped.length === 0) {
    throw new Error("No doc links found on the docs site — its markup may have changed.");
  }

  const existing = await getDocsMap();
  let added = 0;
  let updated = 0;
  for (const doc of scraped) {
    const current = existing[doc.path];
    if (!current) {
      added += 1;
      await saveDocsMapEntry({ path: doc.path, title: doc.title, topics: [] });
    } else if (current.title !== doc.title) {
      updated += 1;
      await saveDocsMapEntry({ path: doc.path, title: doc.title, topics: current.topics });
    }
  }

  return { added, updated, total: scraped.length };
}
