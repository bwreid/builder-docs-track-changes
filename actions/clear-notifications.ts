import { defineAction, fail } from "@agent-native/core/action";
import { deleteNotification, listNotifications } from "@agent-native/core/notifications";
import { z } from "zod";

export default defineAction({
  description: "Delete every notification in the current user's inbox.",
  schema: z.object({}),
  run: async (_args, ctx) => {
    const owner = ctx?.userEmail;
    if (!owner) fail("Not authenticated.", { statusCode: 401 });

    const notifications = await listNotifications(owner, { limit: 200 });
    await Promise.all(notifications.map((n) => deleteNotification(n.id, owner)));

    return { deleted: notifications.length };
  },
});
