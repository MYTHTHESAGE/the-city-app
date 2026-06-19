import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/database.types";

type ResponderRole = "medical_responder" | "security_responder" | "super_admin";

/**
 * Subscribes responders to INSERT and UPDATE events on `sos_alerts` and
 * INSERT events on `sos_status_history`.
 *
 * RLS ensures type-based scoping without any client-side filtering:
 *   - medical_responder  → sos_select_health_responders    (type = 'health')
 *   - security_responder → sos_select_security_responders  (type = 'security')
 *   - super_admin        → sos_select_admin                (all rows)
 *   - sos_status_history follows the same access rules via its own policies.
 *
 * Assignment propagation:
 *   When responder A accepts (sos_alerts UPDATE: responder_id set + status →
 *   responder_assigned), ALL responders receive the UPDATE event. Their
 *   ["sos-alerts", role] query re-fetches and the alert now shows as assigned
 *   to responder A — it's still visible but its action buttons are gated on
 *   alert.responder_id === user.id so other responders cannot duplicate-accept.
 *
 * sos_status_history INSERT:
 *   Each status change written by the DB trigger triggers a re-fetch of both
 *   the alert queue AND the status history for open detail panels.
 *
 * Duplicate prevention: TanStack Query cache deduplication — rapid successive
 * invalidations for the same key coalesce into one background refetch.
 *
 * Channel is torn down on role change, userId change, or unmount.
 */
export function useSosAlertsRealtime(
  userId: string | undefined,
  role: UserRole | null,
) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const isResponder =
    role === "medical_responder" ||
    role === "security_responder" ||
    role === "super_admin";

  useEffect(() => {
    if (!userId || !isResponder) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const responderRole = role as ResponderRole;

    const invalidateQueue = () => {
      qc.invalidateQueries({ queryKey: ["sos-alerts", responderRole] });
    };

    const invalidateHistory = (alertId: string | undefined) => {
      if (alertId) {
        qc.invalidateQueries({ queryKey: ["sos-history", alertId] });
      }
      // Also refresh the passenger-facing tracking query if it's open
      if (alertId) {
        qc.invalidateQueries({ queryKey: ["sos-alert", alertId] });
      }
    };

    const channel = supabase
      .channel(`sos-responder:${userId}`)
      // New alert inserted — appears in queue immediately
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_alerts" },
        invalidateQueue,
      )
      // Alert status changed (assignment, en-route, resolved) — refresh queue
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sos_alerts" },
        (payload) => {
          invalidateQueue();
          const alertId = (payload.new as { id?: string }).id;
          invalidateHistory(alertId);
        },
      )
      // Status history row written by DB trigger — refresh detail timeline
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_status_history" },
        (payload) => {
          const alertId = (payload.new as { alert_id?: string }).alert_id;
          invalidateHistory(alertId);
          // A new history row means status changed — also refresh queue
          invalidateQueue();
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useSosAlertsRealtime] channel error:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, role, isResponder, qc]);
}
