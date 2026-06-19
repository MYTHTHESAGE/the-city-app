import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Subscribes online drivers to UPDATE events on `ride_requests`.
 *
 * RLS grants drivers SELECT on ride_requests rows where status = 'pending'
 * (rides_select_pending_pool policy), so Supabase Realtime delivers UPDATE
 * events when a pending ride changes status — e.g. to driver_assigned.
 *
 * On each such UPDATE the driver's request list is invalidated:
 * - The DB trigger `on_ride_accepted` has already set competing driver_requests
 *   rows to "declined", so the next fetch removes them from the list.
 * - Driver stats are also refreshed to capture any completed trips.
 *
 * Channel is only opened when the driver is online and torn down on offline
 * toggle, userId change, or unmount.
 */
export function useRidePoolRealtime(
  driverId: string | undefined,
  isOnline: boolean,
) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!driverId || !isOnline) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const invalidateRequests = () => {
      qc.invalidateQueries({ queryKey: ["driver-requests", driverId] });
    };

    const invalidateStats = () => {
      qc.invalidateQueries({ queryKey: ["driver-stats", driverId] });
    };

    const channel = supabase
      .channel(`ride-pool:${driverId}`)
      // A pending ride was accepted by another driver — our competing
      // driver_requests row has been auto-declined; refresh the list.
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ride_requests",
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status;

          // Ride left the pending pool — remove from our request list
          if (newStatus && newStatus !== "pending") {
            invalidateRequests();
          }

          // Ride completed — driver stats need refreshing
          if (newStatus === "completed") {
            invalidateStats();
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useRidePoolRealtime] channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [driverId, isOnline, qc]);
}
