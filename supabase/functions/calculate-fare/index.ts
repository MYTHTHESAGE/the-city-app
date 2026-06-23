import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Fare config ──────────────────────────────────────────────────────────────
// All amounts in the app's base currency unit (e.g. NGN).

const FARE_CONFIG = {
  // Minimum total fare regardless of distance
  minimum_fare: 300,

  // Per-vehicle-type rates
  vehicles: {
    car:       { base: 500, per_km: 150 },
    motorbike: { base: 300, per_km:  80 },
    tricycle:  { base: 1200, per_km: 200 },
    bicycle:   { base: 200, per_km:  50 },
    van:       { base: 800, per_km: 200 },
    truck:     { base: 1200, per_km: 250 },
    // Default when vehicle_type is unknown / not provided
    default:   { base: 1200, per_km: 200 },
  } as Record<string, { base: number; per_km: number }>,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalculateFareRequest {
  distance_km: number;
  vehicle_type?: string;
  // Optional — reserved for future surge pricing / location adjustments
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
}

interface CalculateFareResponse {
  vehicle_type: string;
  distance_km: number;
  base_fare: number;
  distance_fare: number;
  total_fare: number;
  currency: string;
  breakdown: {
    label: string;
    amount: number;
  }[];
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: CalculateFareRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { distance_km, vehicle_type = "default" } = body;

  // Validation
  if (distance_km == null) {
    return json({ error: "distance_km is required" }, 400);
  }
  if (typeof distance_km !== "number" || !isFinite(distance_km) || distance_km < 0) {
    return json({ error: "distance_km must be a non-negative finite number" }, 400);
  }
  if (distance_km > 500) {
    return json({ error: "distance_km exceeds maximum supported distance (500 km)" }, 400);
  }

  // Look up rate — fall back to "default" if vehicle_type unknown
  const rates =
    FARE_CONFIG.vehicles[vehicle_type] ?? FARE_CONFIG.vehicles["default"];

  const resolvedType = FARE_CONFIG.vehicles[vehicle_type] ? vehicle_type : "default";

  const base_fare = round2(rates.base);
  const distance_fare = round2(rates.per_km * distance_km);
  const raw_total = base_fare + distance_fare;
  const total_fare = round2(Math.max(raw_total, FARE_CONFIG.minimum_fare));

  const response: CalculateFareResponse = {
    vehicle_type: resolvedType,
    distance_km: round2(distance_km),
    base_fare,
    distance_fare,
    total_fare,
    currency: "NGN",
    breakdown: [
      { label: "Base fare", amount: base_fare },
      { label: `Distance (${round2(distance_km)} km × ${rates.per_km})`, amount: distance_fare },
      ...(raw_total < FARE_CONFIG.minimum_fare
        ? [{ label: "Minimum fare adjustment", amount: round2(FARE_CONFIG.minimum_fare - raw_total) }]
        : []),
    ],
  };

  return json(response, 200);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
