import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { deleteDocsMapEntry } from "../server/lib/docs-map-store.js";

export default defineAction({
  description: "Remove one entry from the editable docs map by path.",
  schema: z.object({
    path: z.string().describe("Doc path to remove"),
  }),
  http: { method: "DELETE" },
  run: async ({ path }) => {
    await deleteDocsMapEntry(path);
    return { path };
  },
});
