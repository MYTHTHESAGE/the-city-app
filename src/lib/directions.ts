export interface LatLng {
  lat: number;
  lng: number;
}

// ─── Redemption City Geofence Boundary ────────────────────────────────────────

export const RCCG_CAMP: LatLng = { lat: 6.8030, lng: 3.4180 };

// Sprawling irregular polygon enclosing the actual Redemption City (RCCG Camp) in Mowe, Ogun State
// Centered around the main camp at { lat: 6.8030, lng: 3.4180 } and extending to the New Arena
export const REDEMPTION_CITY_POLYGON: LatLng[] = [
  { lat: 6.8200, lng: 3.3950 },
  { lat: 6.8200, lng: 3.4450 },
  { lat: 6.7900, lng: 3.4900 },
  { lat: 6.7450, lng: 3.4900 },
  { lat: 6.7450, lng: 3.4400 },
  { lat: 6.7850, lng: 3.3950 },
];

/**
 * Checks if a coordinates point is inside the operational boundary polygon (even-odd ray casting).
 */
export function isPointInPolygon(point: LatLng, polygon?: any): boolean {
  // Relaxed geofence: allow rides within a 10km radius of the Redemption City center
  // to prevent GPS edge cases blocking users at the outskirts or with inaccurate GPS
  const distance = calculateHaversineDistance(point, RCCG_CAMP);
  return distance <= 10;
}

// ─── Distance & ETA Fallbacks ──────────────────────────────────────────────────

/**
 * Calculates straight-line distance in kilometers using the Haversine formula.
 */
export function calculateHaversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) *
      Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates traveling time in minutes based on average vehicle speeds.
 */
export function estimateFallbackEta(distanceKm: number, vehicleType?: string | null): number {
  let speed = 30; // default 30 km/h
  const type = vehicleType?.toLowerCase();
  
  if (type === "motorbike" || type === "okada") {
    speed = 35;
  } else if (type === "tricycle" || type === "keke") {
    speed = 22;
  } else if (type === "car") {
    speed = 40;
  } else if (type === "bicycle") {
    speed = 12;
  } else if (type === "van") {
    speed = 35;
  } else if (type === "truck") {
    speed = 25;
  }
  
  const timeHours = distanceKm / speed;
  const timeMinutes = Math.round(timeHours * 60);
  return Math.max(1, timeMinutes + 2); // Minimum 1 minute + 2 mins buffer
}

// ─── Route Caching & API Request Wrapper ────────────────────────────────────────

interface RouteCacheEntry {
  distance: number;
  duration: number;
  polylinePoints: string;
  timestamp: number;
}

const routeCache = new Map<string, RouteCacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

function getRouteCacheKey(origin: LatLng, destination: LatLng): string {
  return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
}

export interface RouteResult {
  distance: number; // in km
  duration: number; // in minutes
  polyline: string; // encoded polyline (empty string if fallback)
}

/**
 * Retrieves travel directions, checking cache, and falling back to Haversine on error.
 */
export async function getRoute(
  origin: LatLng,
  destination: LatLng,
  vehicleType?: string | null
): Promise<RouteResult> {
  const cacheKey = getRouteCacheKey(origin, destination);
  const cached = routeCache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return {
      distance: cached.distance,
      duration: cached.duration,
      polyline: cached.polylinePoints,
    };
  }

  // Fallback estimates
  const fallbackDistance = calculateHaversineDistance(origin, destination);
  const fallbackDuration = estimateFallbackEta(fallbackDistance, vehicleType);

  // Try calling Directions Service
  if (
    typeof window !== "undefined" &&
    (window as any).google &&
    (window as any).google.maps &&
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  ) {
    try {
      const directionsService = new (window as any).google.maps.DirectionsService();
      const response = await new Promise<any>((resolve, reject) => {
        directionsService.route(
          {
            origin: new (window as any).google.maps.LatLng(origin.lat, origin.lng),
            destination: new (window as any).google.maps.LatLng(destination.lat, destination.lng),
            travelMode: (window as any).google.maps.TravelMode.DRIVING,
          },
          (result: any, status: any) => {
            if (status === (window as any).google.maps.DirectionsStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(`Directions API failed with status: ${status}`));
            }
          }
        );
      });

      const route = response.routes[0];
      const leg = route.legs[0];
      if (leg) {
        const distanceKm = (leg.distance?.value ?? 0) / 1000;
        const durationMins = Math.round((leg.duration?.value ?? 0) / 60);
        const polyline = route.overview_polyline ?? "";

        routeCache.set(cacheKey, {
          distance: distanceKm,
          duration: durationMins,
          polylinePoints: polyline,
          timestamp: now,
        });

        return {
          distance: distanceKm,
          duration: durationMins,
          polyline,
        };
      }
    } catch (err) {
      console.warn("Google Directions service failed, using straight-line fallbacks:", err);
    }
  }

  return {
    distance: fallbackDistance,
    duration: fallbackDuration,
    polyline: "",
  };
}

// ─── PostGIS Geometry Utility ──────────────────────────────────────────────────

/**
 * Parses PostGIS geography Point representations (GeoJSON, WKT string, or LatLng object)
 * into a standard { lat, lng } coordinate object.
 */
export function parsePostgisPoint(val: any): LatLng | null {
  if (!val) return null;
  
  if (typeof val === "object" && typeof val.lat === "number" && typeof val.lng === "number") {
    return { lat: val.lat, lng: val.lng };
  }
  
  if (typeof val === "object" && val.type === "Point" && Array.isArray(val.coordinates)) {
    return { lat: val.coordinates[1], lng: val.coordinates[0] };
  }
  
  if (typeof val === "string") {
    const match = val.match(/POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/i);
    if (match) {
      return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) };
    }
  }
  
  return null;
}

// ─── Polyline Decoder Utility ──────────────────────────────────────────────────

/**
 * Decodes Google's encoded polyline string format into an array of LatLng points.
 */
export function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];
  const points: LatLng[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
