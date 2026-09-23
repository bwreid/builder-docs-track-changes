import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { saveDocsMapEntry } from "../server/lib/docs-map-store.js";

export default defineAction({
  description:
    "Create or update one entry in the editable docs map (path, title, and topic keywords).",
  schema: z.object({
    path: z
      .string()
      .regex(/^\/docs\/[a-z0-9-]*\/?$/, 'Path must look like "/docs/some-page/"')
      .describe('Doc path, e.g. "/docs/what-is-agent-native/"'),
    title: z.string().min(1).describe("Human-readable page title"),
    topics: z.array(z.string()).describe("Topic keywords used to match this page to report themes"),
  }),
  run: async ({ path, title, topics }) => {
    const normalizedPath = path.endsWith("/") ? path : `${path}/`;
    if (!title.trim()) fail("Title is required.");
    await saveDocsMapEntry({
      path: normalizedPath,
      title: title.trim(),
      topics: topics.map((t) => t.trim()).filter(Boolean),
    });
    return { path: normalizedPath };
  },
});
