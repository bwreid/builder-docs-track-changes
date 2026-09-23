import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { DOCS_BASE_URL, listDocsMap } from "../server/lib/docs-map-store.js";

export default defineAction({
  description: "List the editable docs map shown on the Docs Mapping settings page.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const docs = await listDocsMap();
    return { baseUrl: DOCS_BASE_URL, docs };
  },
});
