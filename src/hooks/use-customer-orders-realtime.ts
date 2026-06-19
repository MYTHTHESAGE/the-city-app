import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Subscribes to UPDATE events on `orders` filtered to a single user.
 * Invalidates the user's order history list and activity feed whenever any
 * of their orders changes status.
 *
 * Mount this at the food layout level so it covers all food sub-routes for
 * the duration of the session. Tears down on userId change or unmount.
 */
export function useCustomerOrdersRealtime(userId: string | undefined) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`customer-orders:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["user-orders", userId] });
          qc.invalidateQueries({ queryKey: ["activity", userId] });
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useCustomerOrdersRealtime] channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, qc]);
}
