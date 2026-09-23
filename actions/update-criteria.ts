import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { setCriteria } from "../server/lib/criteria-store.js";

export default defineAction({
  description:
    "Save the team's editable guidance for how the agent should decide which docs need updating and what to recommend.",
  schema: z.object({
    selectionCriteria: z.string().describe("What to look for when deciding a doc needs updating"),
    outputFormat: z.string().describe("How to format the summary and doc suggestions"),
    outputTone: z.string().describe("Tone to write with"),
  }),
  run: async ({ selectionCriteria, outputFormat, outputTone }) => {
    return await setCriteria({ selectionCriteria, outputFormat, outputTone });
  },
});
