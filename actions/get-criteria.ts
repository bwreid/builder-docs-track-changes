import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { CRITERIA_DEFAULTS, getCriteria } from "../server/lib/criteria-store.js";

export default defineAction({
  description:
    "Get the team's editable guidance for how the agent should decide which docs need updating and what to recommend.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const current = await getCriteria();
    return { ...current, defaults: CRITERIA_DEFAULTS };
  },
});
