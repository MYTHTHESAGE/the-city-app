import { useEffect, useRef, useState } from "react";
import { RCCG_CAMP } from "@/lib/directions";
export { RCCG_CAMP };

export type LocationState =
  | { status: "loading" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied"; lat: number; lng: number } // fallback coords
  | { status: "unavailable"; lat: number; lng: number }; // no geolocation API

/**
 * Returns the user's current location via the Geolocation API.
 * Falls back to RCCG Camp centre on denied or unavailable.
 * Safe to call on SSR — the initial state is `{ status: "loading" }`.
 */
export function useUserLocation(): LocationState {
  const [state, setState] = useState<LocationState>({ status: "loading" });
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", ...RCCG_CAMP });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "granted",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        // Keep tracking for realtime updates on the map
        watchRef.current = navigator.geolocation.watchPosition(
          (p) =>
            setState({ status: "granted", lat: p.coords.latitude, lng: p.coords.longitude }),
          () => {}, // silent on watch errors — last known position stays valid
          { enableHighAccuracy: false, maximumAge: 10_000 },
        );
      },
      () => {
        setState({ status: "denied", ...RCCG_CAMP });
      },
      { timeout: 8000, maximumAge: 30_000 },
    );

    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  return state;
}

/** Convenience: extract `{ lat, lng }` or fall back to camp centre. */
export function resolveCoords(loc: LocationState): { lat: number; lng: number } {
  if (loc.status === "loading") return RCCG_CAMP;
  return { lat: loc.lat, lng: loc.lng };
}
