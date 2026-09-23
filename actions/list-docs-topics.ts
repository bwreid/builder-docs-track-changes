import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { AGENT_NATIVE_DOCS, DOCS_BASE_URL } from "../server/lib/agent-native-docs-map.js";

export default defineAction({
  description:
    "List the maintained map of agent-native.com/docs pages to topic keywords. Use this before suggesting which docs need updating in a change report — pick paths from this list only, never invent a doc URL.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    return {
      baseUrl: DOCS_BASE_URL,
      docs: Object.entries(AGENT_NATIVE_DOCS).map(([path, entry]) => ({
        path,
        title: entry.title,
        topics: entry.topics,
      })),
    };
  },
});
