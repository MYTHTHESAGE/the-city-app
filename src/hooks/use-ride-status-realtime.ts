import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendLocalNotification } from "@/lib/notifications";

const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

/**
 * Subscribes to UPDATE events on a single `ride_requests` row.
 * Invalidates `["ride", rideId]` on every status change so the ride screen
 * reflects updates instantly without polling.
 *
 * When the ride reaches a terminal status (completed / cancelled), also
 * invalidates the history and activity feeds so they show the final state.
 *
 * The channel is torn down when `rideId` changes (user starts a new ride)
 * or when the component unmounts. Supabase Realtime handles reconnection
 * transparently — no manual retry logic is needed.
 */
export function useRideStatusRealtime(
  rideId: string | null | undefined,
  userId: string | undefined,
) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!rideId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`ride-status:${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ride_requests",
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["ride", rideId] });

          const newStatus = (payload.new as { status?: string }).status;
          
          if (newStatus === "driver_arrived") {
            sendLocalNotification("Your driver has arrived!", { body: "Please meet your driver at the pickup location." });
          } else if (newStatus === "driver_assigned") {
            sendLocalNotification("Driver assigned", { body: "A driver is on their way." });
          }

          if (newStatus && TERMINAL_STATUSES.has(newStatus)) {
            if (userId) {
              qc.invalidateQueries({ queryKey: ["user-rides", userId] });
              qc.invalidateQueries({ queryKey: ["activity", userId] });
              qc.invalidateQueries({ queryKey: ["active-ride", userId] });
            }
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useRideStatusRealtime] channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [rideId, userId, qc]);
}
