import { useActionMutation } from "@agent-native/core/client/hooks";
import { IconBell, IconBellRinging, IconLoader2, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body?: string;
  readAt: string | null;
  createdAt: string;
};

const SEVERITY_CLASS: Record<NotificationRow["severity"], string> = {
  critical: "bg-red-500/20 text-red-700 dark:text-red-300",
  warning: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  info: "bg-muted text-muted-foreground",
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const clearNotifications = useActionMutation("clear-notifications");

  const loadItems = useCallback(async () => {
    const res = await fetch("/_agent-native/notifications?limit=20");
    if (!res.ok) return;
    setItems((await res.json()) as NotificationRow[]);
  }, []);

  const refreshCount = useCallback(async () => {
    const res = await fetch("/_agent-native/notifications/count");
    if (!res.ok) return;
    const data = (await res.json()) as { count: number };
    setUnreadCount(data.count);
  }, []);

  useEffect(() => {
    void refreshCount();
    const interval = setInterval(() => void refreshCount(), 10_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    if (open) void loadItems();
  }, [open, loadItems]);

  const markAllRead = async () => {
    await fetch("/_agent-native/notifications/read-all", { method: "POST" });
    setItems((prev) =>
      prev ? prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })) : prev,
    );
    setUnreadCount(0);
  };

  const dismiss = async (id: string) => {
    await fetch(`/_agent-native/notifications/${id}`, { method: "DELETE" });
    setItems((prev) => (prev ? prev.filter((n) => n.id !== id) : prev));
    void refreshCount();
  };

  const clearAll = () => {
    clearNotifications.mutate(
      {},
      {
        onSuccess: () => {
          setItems([]);
          setUnreadCount(0);
        },
      },
    );
  };

  const hasUnread = unreadCount > 0;
  const Icon = hasUnread ? IconBellRinging : IconBell;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={hasUnread ? `${unreadCount} unread notifications` : "Notifications"}
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        >
          <Icon size={18} aria-hidden />
          {hasUnread && (
            <span
              aria-hidden
              className="absolute -end-0.5 -top-0.5 rounded-full bg-destructive px-1 text-[10px] font-medium leading-[14px] text-destructive-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm font-medium">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
            {items && items.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                disabled={clearNotifications.isPending}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items === null ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <IconLoader2 size={14} className="animate-spin" /> Loading...
            </div>
          ) : items.length > 0 ? (
            items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "group relative border-b border-border px-3 py-2 pe-8 last:border-b-0 hover:bg-accent/40",
                  n.readAt && "opacity-60",
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{n.title}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                      SEVERITY_CLASS[n.severity],
                    )}
                  >
                    {n.severity}
                  </span>
                </div>
                {n.body && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                )}
                <span className="text-[10px] text-muted-foreground/70">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(n.id)}
                  className="absolute end-2 top-2 hidden rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground group-hover:flex"
                >
                  <IconX size={12} />
                </button>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-muted-foreground">No app notifications yet.</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
