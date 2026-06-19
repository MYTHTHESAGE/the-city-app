import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, BellOff, Car, CheckCheck, CircleAlert, Package, ShoppingBag, Siren, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<Notification["type"], typeof Bell> = {
  ride_update: Car,
  order_update: ShoppingBag,
  sos_update: Siren,
  sos_alert: Siren,
  wallet_credit: Wallet,
  wallet_debit: Wallet,
  driver_request: Package,
  system: CircleAlert,
};

const TYPE_COLORS: Record<Notification["type"], string> = {
  ride_update: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  order_update: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  sos_update: "bg-destructive/10 text-destructive",
  sos_alert: "bg-destructive/10 text-destructive",
  wallet_credit: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  wallet_debit: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  driver_request: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  system: "bg-accent text-accent-foreground",
};

// ─── Unread badge (used externally) ───────────────────────────────────────────

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications-unread", user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });
}

// ─── Notification center sheet ────────────────────────────────────────────────

export function NotificationCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unread = 0 } = useUnreadCount();

  const {
    data: notifications,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user && open,
    staleTime: 15_000,
  });

  const { mutate: markRead } = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", user?.id] });
    },
  });

  const { mutate: markAll, isPending: markingAll } = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", user?.id] });
      toast.success("All notifications marked as read.");
    },
    onError: () => toast.error("Could not mark all as read."),
  });

  return (
    <>
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
        className="glass relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Backdrop + sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-border bg-background shadow-elegant sm:inset-x-auto sm:right-4 sm:bottom-auto sm:top-16 sm:w-96 sm:rounded-3xl sm:border">
            {/* Handle */}
            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-bold text-foreground">Notifications</h2>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => markAll()}
                    disabled={markingAll}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <ul className="divide-y divide-border/60 px-4 py-2">
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex items-start gap-3 py-3.5">
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-2xl bg-secondary" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
                        <div className="h-2.5 w-full animate-pulse rounded bg-secondary" />
                        <div className="h-2 w-1/3 animate-pulse rounded bg-secondary" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {isError && (
                <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                  <BellOff className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Could not load notifications</p>
                  <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
                </div>
              )}

              {!isLoading && !isError && (!notifications || notifications.length === 0) && (
                <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">All caught up</p>
                  <p className="text-xs text-muted-foreground">No notifications yet. We'll let you know when something happens.</p>
                </div>
              )}

              {!isLoading && !isError && notifications && notifications.length > 0 && (
                <ul className="divide-y divide-border/60">
                  {notifications.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onRead={() => !n.is_read && markRead(n.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotificationRow({
  notification: n,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  const Icon = TYPE_ICONS[n.type] ?? Bell;
  const colorClass = TYPE_COLORS[n.type] ?? "bg-secondary text-foreground";

  return (
    <li
      onClick={onRead}
      className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40 ${
        n.is_read ? "opacity-60" : ""
      }`}
    >
      <span
        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${colorClass}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${n.is_read ? "font-normal text-foreground" : "font-semibold text-foreground"}`}>
            {n.title}
          </p>
          {!n.is_read && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
    </li>
  );
}
