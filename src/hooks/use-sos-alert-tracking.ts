import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Passenger-side: subscribes to UPDATE events on a single sos_alerts row
 * and INSERT events on its sos_status_history rows.
 *
 * Invalidates:
 *   - ["sos-alert", alertId]    — tracking card (status, timestamps)
 *   - ["sos-history", alertId]  — status timeline if rendered
 *
 * RLS `sos_select_own_user` and `sos_history_select_own_user` ensure only
 * the alert owner receives these events.
 */
export function useSosAlertTracking(alertId: string | null | undefined) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!alertId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["sos-alert", alertId] });
      qc.invalidateQueries({ queryKey: ["sos-history", alertId] });
    };

    const channel = supabase
      .channel(`sos-alert-tracking:${alertId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sos_alerts",
          filter: `id=eq.${alertId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sos_status_history",
          filter: `alert_id=eq.${alertId}`,
        },
        invalidate,
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useSosAlertTracking] channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [alertId, qc]);
}
