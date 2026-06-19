import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Subscribes to UPDATE events on a single order row.
 * Invalidates `["order", orderId]` immediately on any status change so the
 * tracking page re-fetches and reflects the new status without polling.
 *
 * Mount only on the tracking page. The channel is torn down when `orderId`
 * changes (user navigates to a different order) or on unmount.
 */
export function useOrderTracking(orderId: string | undefined) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-tracking:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["order", orderId] });
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useOrderTracking] channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [orderId, qc]);
}
