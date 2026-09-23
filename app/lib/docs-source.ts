// Maps a docs URL path (e.g. "/docs/what-is-agent-native/") to its real
// source file in the public BuilderIO/agent-native repo. Verified directly
// against the live repo: doc pages live at packages/core/docs/content/<slug>.mdx,
// where <slug> is this same path with "/docs/" and the trailing "/" stripped.
// Used both client-side (to point the analysis prompt at the raw source
// instead of the rendered page) and server-side (actions/create-doc-pull-request.ts).
export const DOCS_REPO_OWNER = "BuilderIO";
export const DOCS_REPO_NAME = "agent-native";
export const DOCS_REPO_BRANCH = "main";
export const DOCS_SOURCE_DIR = "packages/core/docs/content";

export function docSourceSlug(path: string): string {
  return path.replace(/^\/docs\//, "").replace(/\/$/, "");
}

export function docSourceFilePath(path: string): string {
  return `${DOCS_SOURCE_DIR}/${docSourceSlug(path)}.mdx`;
}

export function docRawMarkdownUrl(path: string): string {
  return `https://raw.githubusercontent.com/${DOCS_REPO_OWNER}/${DOCS_REPO_NAME}/${DOCS_REPO_BRANCH}/${docSourceFilePath(path)}`;
}
