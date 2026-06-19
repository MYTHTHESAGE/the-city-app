import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/lib/notifications";

type NotificationContextValue = Record<string, never>;

const NotificationContext = createContext<NotificationContextValue | null>(null);

const TYPE_ICON: Record<Notification["type"], string> = {
  ride_update: "🚗",
  order_update: "🛍️",
  sos_update: "🚨",
  sos_alert: "🆘",
  wallet_credit: "💰",
  wallet_debit: "💸",
  driver_request: "🏍️",
  system: "📢",
};

function fireToast(n: Notification) {
  const icon = TYPE_ICON[n.type] ?? "🔔";
  const isUrgent = n.type === "sos_update" || n.type === "sos_alert";

  if (isUrgent) {
    toast.error(`${icon} ${n.title}`, {
      description: n.body,
      duration: 8000,
    });
  } else {
    toast(n.title, {
      description: n.body,
      icon,
      duration: 5000,
    });
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`notifications:${user.id}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          // Fire toast immediately
          fireToast(n);
          // Invalidate queries so list + badge refresh
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[NotificationProvider] Realtime channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, queryClient]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
