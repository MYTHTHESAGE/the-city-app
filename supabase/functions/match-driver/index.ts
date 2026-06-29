import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchDriverRequest {
  ride_id: string;
  pickup_lat: number;
  pickup_lng: number;
  radius_m?: number;    // default 5000
  max_drivers?: number; // default 5
  preferred_driver_id?: string;
}

interface DriverCandidate {
  driver_id: string;
  full_name: string;
  vehicle_type: string;
  license_plate: string;
  rating: number;
  distance_m: number;
}

interface MatchDriverResponse {
  ride_id: string;
  status: "dispatched" | "no_drivers";
  candidates: DriverCandidate[];
  requests_sent: number;
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

  // Parse + validate body
  let body: MatchDriverRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Default radius is 25 km — Redemption City spans ~10 km; 25 km covers any GPS inaccuracy.
  const { ride_id, pickup_lat, pickup_lng, radius_m = 25000, max_drivers = 5, preferred_driver_id } = body;

  if (!ride_id || pickup_lat == null || pickup_lng == null) {
    return json({ error: "ride_id, pickup_lat and pickup_lng are required" }, 400);
  }
  if (typeof pickup_lat !== "number" || typeof pickup_lng !== "number") {
    return json({ error: "pickup_lat and pickup_lng must be numbers" }, 400);
  }
  if (Math.abs(pickup_lat) > 90 || Math.abs(pickup_lng) > 180) {
    return json({ error: "pickup_lat/pickup_lng out of valid range" }, 400);
  }

  // Use service_role client so we can call find_nearby_drivers() and write
  // driver_requests — both of which are blocked for authenticated users.
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── 1. Verify the ride exists and is still dispatchable ─────────────────────
  const { data: ride, error: rideErr } = await serviceClient
    .from("ride_requests")
    .select("id, status, user_id")
    .eq("id", ride_id)
    .maybeSingle();

  if (rideErr) return json({ error: rideErr.message }, 500);
  if (!ride) return json({ error: "Ride not found" }, 404);
  if (!["pending", "searching"].includes(ride.status)) {
    return json({ error: `Ride is already in status '${ride.status}'` }, 409);
  }

  // ── 2. Determine attempt number (idempotency-aware) ─────────────────────────
  const { data: prevAttempts } = await serviceClient
    .from("driver_match_log")
    .select("attempt_number")
    .eq("ride_id", ride_id)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const attemptNumber = (prevAttempts?.attempt_number ?? 0) + 1;

  // ── 3. Find nearby online drivers (with fallback widening) ──────────────────
  // Try with the given radius first, then widen to 50 km if empty so that
  // GPS inaccuracies never result in "no drivers" when drivers ARE online.
  let nearby: Record<string, unknown>[] | null = null;
  let nearbyErr: { message: string } | null = null;
  let effectiveRadius = radius_m;

  for (const searchRadius of [radius_m, 50000]) {
    effectiveRadius = searchRadius;
    const result = await serviceClient.rpc("find_nearby_drivers", {
      p_lat: pickup_lat,
      p_lng: pickup_lng,
      p_radius_m: searchRadius,
    });
    nearbyErr = result.error as typeof nearbyErr;
    nearby = result.data as typeof nearby;
    if (nearbyErr) break;          // real DB error — stop
    if ((nearby ?? []).length > 0) break; // found someone — stop
  }

  if (nearbyErr) {
    await logAttempt(serviceClient, {
      ride_id, attempt_number: attemptNumber,
      pickup_lat, pickup_lng, radius_m: effectiveRadius,
      candidates: [], requests_sent: 0,
      status: "error", error_message: nearbyErr.message,
    });
    return json({ error: nearbyErr.message }, 500);
  }

  const candidates: DriverCandidate[] = (nearby ?? [])
    .filter((row: Record<string, unknown>) => preferred_driver_id ? row.driver_id === preferred_driver_id : true)
    .slice(0, max_drivers)
    .map((row: Record<string, unknown>) => ({
      driver_id: row.driver_id as string,
      full_name: row.full_name as string,
      vehicle_type: row.vehicle_type as string,
      license_plate: row.license_plate as string,
      rating: row.rating as number,
      distance_m: row.distance_m as number,
    }));

  if (candidates.length === 0) {
    await logAttempt(serviceClient, {
      ride_id, attempt_number: attemptNumber,
      pickup_lat, pickup_lng, radius_m: effectiveRadius,
      candidates: [], requests_sent: 0, status: "no_drivers",
    });

    // Keep ride as 'searching' so the client can retry or widen radius
    await serviceClient
      .from("ride_requests")
      .update({ status: "searching" })
      .eq("id", ride_id);

    const response: MatchDriverResponse = {
      ride_id, status: "no_drivers",
      candidates: [], requests_sent: 0, attempt_number: attemptNumber,
    };
    return json(response, 200);
  }

  // ── 4. Create driver_requests for each candidate ─────────────────────────────
  // Skip drivers who already have a pending request for this ride
  const { data: existing } = await serviceClient
    .from("driver_requests")
    .select("driver_id")
    .eq("ride_id", ride_id)
    .eq("status", "pending");

  const alreadyNotified = new Set((existing ?? []).map((r: { driver_id: string }) => r.driver_id));

  const newRequests = candidates
    .filter((c) => !alreadyNotified.has(c.driver_id))
    .map((c) => ({
      driver_id: c.driver_id,
      request_type: "ride",
      ride_id,
      status: "pending",
      distance_m: Math.round(c.distance_m * 100) / 100,
    }));

  let requestsSent = 0;
  if (newRequests.length > 0) {
    const { error: insertErr } = await serviceClient
      .from("driver_requests")
      .insert(newRequests);

    if (insertErr) {
      await logAttempt(serviceClient, {
        ride_id, attempt_number: attemptNumber,
        pickup_lat, pickup_lng, radius_m,
        candidates, requests_sent: 0,
        status: "error", error_message: insertErr.message,
      });
      return json({ error: insertErr.message }, 500);
    }
    requestsSent = newRequests.length;
  }

  // ── 5. Advance ride to 'searching' ──────────────────────────────────────────
  await serviceClient
    .from("ride_requests")
    .update({ status: "searching" })
    .eq("id", ride_id)
    .eq("status", "pending"); // only advance from pending; searching is fine already

  // ── 6. Log the attempt ───────────────────────────────────────────────────────
  await logAttempt(serviceClient, {
    ride_id, attempt_number: attemptNumber,
    pickup_lat, pickup_lng, radius_m: effectiveRadius,
    candidates, requests_sent: requestsSent, status: "dispatched",
  });

  const response: MatchDriverResponse = {
    ride_id, status: "dispatched",
    candidates, requests_sent: requestsSent, attempt_number: attemptNumber,
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
    ride_id: string;
    attempt_number: number;
    pickup_lat: number;
    pickup_lng: number;
    radius_m: number;
    candidates: DriverCandidate[];
    requests_sent: number;
    status: "dispatched" | "no_drivers" | "error";
    error_message?: string;
  },
) {
  await client.from("driver_match_log").insert({
    ride_id: params.ride_id,
    attempt_number: params.attempt_number,
    pickup_lat: params.pickup_lat,
    pickup_lng: params.pickup_lng,
    radius_m: params.radius_m,
    candidates: params.candidates,
    requests_sent: params.requests_sent,
    status: params.status,
    error_message: params.error_message ?? null,
  });
}
