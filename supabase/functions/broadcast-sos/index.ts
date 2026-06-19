import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface BroadcastSosRequest {
  sos_alert_id: string;
  alert_type: "health" | "security";
  latitude: number;
  longitude: number;
  radius_m?: number; // default 3000
}

interface ResponderCandidate {
  responder_id: string;
  full_name: string;
  role: string;
  distance_m: number;
}

interface BroadcastSosResponse {
  alert_id: string;
  status: "dispatched" | "no_responders";
  alert_type: "health" | "security";
  candidates: ResponderCandidate[];
  notifications_sent: number;
  attempt_number: number;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: BroadcastSosRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    sos_alert_id,
    alert_type,
    latitude,
    longitude,
    radius_m = 3000,
  } = body;

  // ── Validate input ──────────────────────────────────────────────────────────
  if (!sos_alert_id || !alert_type || latitude == null || longitude == null) {
    return json(
      { error: "sos_alert_id, alert_type, latitude and longitude are required" },
      400,
    );
  }
  if (alert_type !== "health" && alert_type !== "security") {
    return json({ error: "alert_type must be 'health' or 'security'" }, 400);
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return json({ error: "latitude and longitude must be numbers" }, 400);
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return json({ error: "latitude/longitude out of valid range" }, 400);
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── 1. Verify alert exists, belongs to a user, and is still dispatchable ────
  const { data: alert, error: alertErr } = await serviceClient
    .from("sos_alerts")
    .select("id, user_id, type, status, location_address")
    .eq("id", sos_alert_id)
    .maybeSingle();

  if (alertErr) return json({ error: alertErr.message }, 500);
  if (!alert) return json({ error: "SOS alert not found" }, 404);
  if (!["pending", "dispatched"].includes(alert.status)) {
    return json({ error: `Alert is already in status '${alert.status}'` }, 409);
  }
  // Verify alert_type matches the stored type
  if (alert.type !== alert_type) {
    return json(
      { error: `alert_type mismatch: stored type is '${alert.type}'` },
      422,
    );
  }

  // ── 2. Determine attempt number ─────────────────────────────────────────────
  const { data: prevAttempts } = await serviceClient
    .from("sos_dispatch_log")
    .select("attempt_number")
    .eq("alert_id", sos_alert_id)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const attemptNumber = (prevAttempts?.attempt_number ?? 0) + 1;

  // ── 3. Find nearby online responders ────────────────────────────────────────
  const { data: nearby, error: nearbyErr } = await serviceClient.rpc(
    "find_nearby_responders",
    {
      p_lat: latitude,
      p_lng: longitude,
      p_sos_type: alert_type,
      p_radius_m: radius_m,
    },
  );

  if (nearbyErr) {
    await logAttempt(serviceClient, {
      alert_id: sos_alert_id, attempt_number: attemptNumber,
      alert_type, lat: latitude, lng: longitude, radius_m,
      candidates: [], notifications_sent: 0,
      status: "error", error_message: nearbyErr.message,
    });
    return json({ error: nearbyErr.message }, 500);
  }

  const candidates: ResponderCandidate[] = (nearby ?? []).map(
    (row: Record<string, unknown>) => ({
      responder_id: row.responder_id as string,
      full_name: row.full_name as string,
      role: row.role as string,
      distance_m: row.distance_m as number,
    }),
  );

  // ── 4. Handle no responders found ───────────────────────────────────────────
  if (candidates.length === 0) {
    await logAttempt(serviceClient, {
      alert_id: sos_alert_id, attempt_number: attemptNumber,
      alert_type, lat: latitude, lng: longitude, radius_m,
      candidates: [], notifications_sent: 0, status: "no_responders",
    });

    const response: BroadcastSosResponse = {
      alert_id: sos_alert_id, status: "no_responders",
      alert_type, candidates: [], notifications_sent: 0, attempt_number: attemptNumber,
    };
    return json(response, 200);
  }

  // ── 5. Advance alert to 'dispatched' ────────────────────────────────────────
  const now = new Date().toISOString();
  const { error: updateErr } = await serviceClient
    .from("sos_alerts")
    .update({ status: "dispatched", dispatched_at: now })
    .eq("id", sos_alert_id)
    .in("status", ["pending", "dispatched"]);

  if (updateErr) {
    await logAttempt(serviceClient, {
      alert_id: sos_alert_id, attempt_number: attemptNumber,
      alert_type, lat: latitude, lng: longitude, radius_m,
      candidates, notifications_sent: 0,
      status: "error", error_message: updateErr.message,
    });
    return json({ error: updateErr.message }, 500);
  }

  // The DB trigger `on_sos_status_change` writes a sos_status_history row
  // automatically. We insert an explicit initial history row for the dispatch
  // event only if this is the first attempt (pending → dispatched transition).
  if (attemptNumber === 1) {
    await serviceClient.from("sos_status_history").insert({
      alert_id: sos_alert_id,
      status: "dispatched",
      changed_by: null, // service_role dispatch — no user actor
      note: `Broadcast to ${candidates.length} responder(s) within ${radius_m}m`,
    });
  }

  // ── 6. Write a notification for each responder ──────────────────────────────
  const typeLabel = alert_type === "health" ? "Medical" : "Security";
  const locationHint = alert.location_address
    ? ` near ${alert.location_address}`
    : "";

  const notifications = candidates.map((c) => ({
    user_id: c.responder_id,
    type: "sos_alert",
    title: `🚨 ${typeLabel} SOS alert${locationHint}`,
    body: `A ${alert_type} emergency has been reported. You are within ${Math.round(c.distance_m)}m. Tap to respond.`,
    data: {
      alert_id: sos_alert_id,
      alert_type,
      latitude,
      longitude,
      distance_m: Math.round(c.distance_m),
    },
    is_read: false,
  }));

  let notificationsSent = 0;
  const { error: notifErr } = await serviceClient
    .from("notifications")
    .insert(notifications);

  if (notifErr) {
    // Non-fatal: alert is dispatched, notifications failure is logged but
    // does not roll back the status change.
    console.error("[broadcast-sos] notifications insert failed:", notifErr.message);
  } else {
    notificationsSent = notifications.length;
  }

  // ── 7. Log the dispatch attempt ──────────────────────────────────────────────
  await logAttempt(serviceClient, {
    alert_id: sos_alert_id, attempt_number: attemptNumber,
    alert_type, lat: latitude, lng: longitude, radius_m,
    candidates, notifications_sent: notificationsSent, status: "dispatched",
  });

  const response: BroadcastSosResponse = {
    alert_id: sos_alert_id,
    status: "dispatched",
    alert_type,
    candidates,
    notifications_sent: notificationsSent,
    attempt_number: attemptNumber,
  };
  return json(response, 200);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logAttempt(
  client: ReturnType<typeof createClient>,
  params: {
    alert_id: string;
    attempt_number: number;
    alert_type: string;
    lat: number;
    lng: number;
    radius_m: number;
    candidates: ResponderCandidate[];
    notifications_sent: number;
    status: "dispatched" | "no_responders" | "error";
    error_message?: string;
  },
) {
  await client.from("sos_dispatch_log").insert({
    alert_id: params.alert_id,
    attempt_number: params.attempt_number,
    alert_type: params.alert_type,
    lat: params.lat,
    lng: params.lng,
    radius_m: params.radius_m,
    candidates: params.candidates,
    notifications_sent: params.notifications_sent,
    status: params.status,
    error_message: params.error_message ?? null,
  });
}
