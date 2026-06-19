import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Subscribes to Supabase Realtime changes on the `orders` table scoped to a
 * single vendor. On INSERT or UPDATE, invalidates the vendor's pending-orders
 * list and today's sales metrics so TanStack Query re-fetches immediately.
 *
 * Call this once at the top of the vendor dashboard component. The channel is
 * torn down on unmount or whenever `vendorId` changes.
 */
export function useVendorOrdersRealtime(vendorId: string | undefined) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!vendorId) return;

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["vendor-pending-orders", vendorId] });
      qc.invalidateQueries({ queryKey: ["vendor-sales", vendorId] });
    };

    const channel = supabase
      .channel(`vendor-orders:${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `vendor_id=eq.${vendorId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `vendor_id=eq.${vendorId}`,
        },
        invalidate,
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useVendorOrdersRealtime] channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [vendorId, qc]);
}
