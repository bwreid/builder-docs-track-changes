import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { DOCS_BASE_URL, getDocsMap } from "../server/lib/docs-map-store.js";

export default defineAction({
  description:
    "List the maintained map of agent-native.com/docs pages to topic keywords. Use this before suggesting which docs need updating in a change report — pick paths from this list only, never invent a doc URL.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const docsMap = await getDocsMap();
    return {
      baseUrl: DOCS_BASE_URL,
      docs: Object.entries(docsMap).map(([path, entry]) => ({
        path,
        title: entry.title,
        topics: entry.topics,
      })),
    };
  },
});
