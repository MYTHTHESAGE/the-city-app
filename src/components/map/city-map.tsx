import { useEffect, useState, type ReactNode } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import { RCCG_CAMP } from "@/hooks/use-user-location";

// ─── Constants ────────────────────────────────────────────────────────────────

// VITE_GOOGLE_MAPS_MAP_ID: Set in .env to use a Cloud-styled map.
// Falls back to the Google-provided test ID that works without a billing project.
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

interface CityMapProps {
  center?: LatLng;
  zoom?: number;
  className?: string;
  children?: ReactNode;
}

// ─── Main Map Component ───────────────────────────────────────────────────────

/**
 * Reusable Google Maps container.
 * – Reads `VITE_GOOGLE_MAPS_API_KEY` from env; shows a placeholder if missing.
 * – SSR-safe: defers mounting until client hydration.
 * – Centres on Redemption City (RCCG Camp) by default.
 * – Accepts any `@vis.gl/react-google-maps` marker children.
 */
export function CityMap({ center, zoom = 16, className, children }: CityMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const baseClass = cn("relative h-full w-full overflow-hidden rounded-3xl", className);

  if (!mounted) {
    return (
      <div className={baseClass}>
        <div className="absolute inset-0 animate-pulse rounded-3xl bg-secondary" />
      </div>
    );
  }

  if (!API_KEY) {
    return (
      <div className={cn(baseClass, "flex items-center justify-center bg-secondary/50")}>
        <div className="text-center px-4">
          <p className="text-xs font-semibold text-foreground">Map unavailable</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable maps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        mapId={MAP_ID}
        defaultCenter={center ?? RCCG_CAMP}
        center={center}
        defaultZoom={zoom}
        className="h-full w-full"
        disableDefaultUI
        gestureHandling="greedy"
        colorScheme="FOLLOW_SYSTEM"
        reuseMaps
      >
        {children}
      </Map>
    </APIProvider>
  );
}

// ─── Marker components ────────────────────────────────────────────────────────

/**
 * Pulsing blue dot — the current user's location.
 */
export function UserLocationMarker({ position, label = "You" }: { position: LatLng; label?: string }) {
  return (
    <AdvancedMarker position={position} title={label}>
      <div className="relative flex items-center justify-center">
        <span className="absolute h-10 w-10 rounded-full bg-primary/30 animate-ping" />
        <div className="relative h-5 w-5 rounded-full bg-primary shadow-elegant ring-2 ring-background" />
      </div>
    </AdvancedMarker>
  );
}

/**
 * Blurred red circle for heatmaps.
 */
export function DemandMarker({ position, weight = 1 }: { position: LatLng; weight?: number }) {
  const size = 30 + weight * 10;
  const opacity = Math.min(0.8, 0.3 + weight * 0.1);
  return (
    <AdvancedMarker position={position}>
      <div 
        style={{ 
          width: size, 
          height: size, 
          background: `radial-gradient(circle, rgba(239,68,68,${opacity}) 0%, rgba(239,68,68,0) 70%)`,
          borderRadius: '50%',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }} 
      />
    </AdvancedMarker>
  );
}

/**
 * Vehicle icon for a nearby / assigned driver.
 */
export function DriverMarker({
  position,
  name,
  vehicleType,
}: {
  position: LatLng;
  name?: string;
  vehicleType?: string;
}) {
  const emoji = vehicleEmoji(vehicleType);
  return (
    <AdvancedMarker position={position} title={name ? `${name} · ${vehicleType ?? ""}` : vehicleType}>
      <div className="bg-gradient-primary flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-on-primary shadow-elegant whitespace-nowrap">
        <span aria-hidden>{emoji}</span>
        {name && <span>{name.split(" ")[0]}</span>}
      </div>
    </AdvancedMarker>
  );
}

/**
 * Flashing red pin for a reported SOS / emergency location.
 */
export function EmergencyMarker({
  position,
  label = "Emergency",
  type,
}: {
  position: LatLng;
  label?: string;
  type?: "health" | "security";
}) {
  const emoji = type === "health" ? "🏥" : type === "security" ? "🛡️" : "🆘";
  return (
    <AdvancedMarker position={position} title={label}>
      <div className="relative flex flex-col items-center">
        <div className="absolute inset-0 m-auto h-9 w-9 rounded-full bg-destructive/30 animate-pulse" />
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-destructive shadow-elegant ring-2 ring-background">
          <span className="text-sm" aria-hidden>{emoji}</span>
        </div>
        <div className="-mt-0.5 h-2 w-0.5 bg-destructive" />
      </div>
    </AdvancedMarker>
  );
}

/**
 * Primary-colour pin for a responder's location.
 */
export function ResponderMarker({
  position,
  name,
}: {
  position: LatLng;
  name?: string;
}) {
  return (
    <AdvancedMarker position={position} title={name ?? "Responder"}>
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary shadow-elegant ring-2 ring-background">
          <span className="text-sm" aria-hidden>🦺</span>
        </div>
        <div className="-mt-0.5 h-2 w-0.5 bg-primary" />
      </div>
    </AdvancedMarker>
  );
}

/**
 * Vendor / pickup-point marker for food delivery screens.
 */
export function VendorMarker({
  position,
  name,
}: {
  position: LatLng;
  name?: string;
}) {
  return (
    <AdvancedMarker position={position} title={name ?? "Vendor"}>
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 shadow-elegant ring-2 ring-background">
          <span className="text-sm" aria-hidden>🛍️</span>
        </div>
        <div className="-mt-0.5 h-2 w-0.5 bg-amber-500" />
      </div>
    </AdvancedMarker>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function vehicleEmoji(type?: string | null): string {
  switch (type) {
    case "motorbike": return "🏍️";
    case "tricycle":  return "🛺";
    case "bicycle":   return "🚲";
    case "van":       return "🚐";
    case "truck":     return "🚚";
    default:          return "🚗";
  }
}
