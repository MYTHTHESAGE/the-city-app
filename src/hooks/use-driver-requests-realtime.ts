import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

/**
 * Subscribes to Supabase Realtime changes on `driver_requests` scoped to a
 * single driver. Only opens the channel when the driver is online — tears it
 * down immediately when they go offline.
 *
 * On INSERT: invalidates the pending request list so both the dashboard
 * carousel and /driver/requests update in real time.
 * On UPDATE (accept/decline by the system): same invalidation keeps counts
 * accurate.
 *
 * Duplicate prevention: TanStack Query's cache acts as the dedup layer —
 * successive invalidations fetch the latest server state, so the same row
 * never appears twice.
 */
export function useDriverRequestsRealtime(
  driverId: string | undefined,
  isOnline: boolean,
) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Tear down if driver goes offline or logs out
    if (!driverId || !isOnline) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["driver-requests", driverId] });
    };

    const channel = supabase
      .channel(`driver-requests:${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_requests",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          invalidate();
          if (payload.new && payload.new.status === "pending") {
            toast.info("🚨 New Ride Request!", {
              description: "You have a new passenger waiting. Tap to view.",
              duration: 10000,
            });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("New Ride Request!", {
                body: "You have a new passenger waiting in The City App.",
                icon: "/icon-192.png"
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "driver_requests",
          filter: `driver_id=eq.${driverId}`,
        },
        invalidate,
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useDriverRequestsRealtime] channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [driverId, isOnline, qc]);
}
