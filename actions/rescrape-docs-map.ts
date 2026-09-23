import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { rescrapeDocsMap } from "../server/lib/docs-map-store.js";

export default defineAction({
  description:
    "Re-fetch the agent-native.com/docs navigation and upsert page paths/titles into the docs map, preserving existing topic keywords for pages already known.",
  schema: z.object({}),
  run: async () => {
    try {
      return await rescrapeDocsMap();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fail(message);
    }
  },
});
