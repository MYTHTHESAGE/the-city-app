import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchRideById } from "@/lib/queries";
import { CityMap, DriverMarker, UserLocationMarker } from "@/components/map/city-map";
import { MapRoutePolyline, ServiceAreaPolygon } from "@/components/map/map-overlays";
import { getRoute, parsePostgisPoint, type LatLng } from "@/lib/directions";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/track/$rideId")({
  head: () => ({ meta: [{ title: "Live Ride Tracker — The City App" }] }),
  component: LiveTracker,
});

function LiveTracker() {
  const { rideId } = Route.useParams();
  
  // Local state for realtime driver location since we may not have auth to refresh the query efficiently,
  // or we can just invalidate the query. But for public tracking, subscribing anonymously to public table changes is fine.
  // Wait, `driver_profiles` might be secured by RLS. If it's public for tracking, the policy must allow it.
  
  const { data: ride, refetch } = useQuery({
    queryKey: ["public-ride", rideId],
    queryFn: () => fetchRideById(rideId),
  });

  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; polyline: string } | null>(null);

  useEffect(() => {
    if (!ride?.driver_profiles?.id) return;
    
    // Subscribe to driver location updates
    const channel = supabase
      .channel(`public-track-${ride.driver_profiles.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "driver_profiles",
          filter: `id=eq.${ride.driver_profiles.id}`,
        },
        () => {
          refetch(); // Simplest way to get new coords + status
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ride?.driver_profiles?.id, refetch]);

  useEffect(() => {
    if (!ride) return;
    
    const driverLoc = parsePostgisPoint(ride.driver_profiles?.current_location);
    const pickupLoc = parsePostgisPoint(ride.pickup_location);
    const dropoffLoc = parsePostgisPoint(ride.dropoff_location);

    const vehicleType = ride.driver_profiles?.vehicle_type;

    let origin: LatLng | null = null;
    let dest: LatLng | null = null;

    const status = ride.status;
    if (status === "driver_assigned" || status === "driver_enroute" || status === "driver_arrived") {
      if (driverLoc && pickupLoc) {
        origin = driverLoc;
        dest = pickupLoc;
      }
    } else if (status === "in_progress") {
      if (pickupLoc && dropoffLoc) {
        origin = pickupLoc;
        dest = dropoffLoc;
      }
    }

    if (origin && dest) {
      getRoute(origin, dest, vehicleType)
        .then(setRouteInfo)
        .catch(console.error);
    } else {
      setRouteInfo(null);
    }
  }, [ride?.status, ride?.driver_profiles?.current_location, ride?.pickup_location, ride?.dropoff_location]);

  if (!ride) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading ride details…</p>
      </div>
    );
  }

  const driverLoc = parsePostgisPoint(ride.driver_profiles?.current_location);
  const pickupLoc = parsePostgisPoint(ride.pickup_location);
  const dropoffLoc = parsePostgisPoint(ride.dropoff_location);

  const isActive = ["driver_assigned", "driver_enroute", "driver_arrived", "in_progress"].includes(ride.status);
  
  // Fallback center to Redemption City if no locations available
  const center = driverLoc || pickupLoc || { lat: 6.8286, lng: 3.6335 };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <div className="relative flex-1">
        <CityMap center={center} zoom={15} className="h-full w-full">
          {pickupLoc && <UserLocationMarker position={pickupLoc} label="Pickup" />}
          {dropoffLoc && <UserLocationMarker position={dropoffLoc} label="Dropoff" />}
          {isActive && driverLoc && (
            <DriverMarker 
              position={driverLoc} 
              name={ride.driver_profiles?.profiles?.full_name ?? undefined} 
              vehicleType={ride.driver_profiles?.vehicle_type ?? undefined} 
            />
          )}
          {isActive && routeInfo && (() => {
            let origin = null;
            let dest = null;
            if (ride.status === "in_progress") {
              origin = pickupLoc; dest = dropoffLoc;
            } else {
              origin = driverLoc; dest = pickupLoc;
            }
            return origin && dest ? (
              <MapRoutePolyline origin={origin} destination={dest} encodedPolyline={routeInfo.polyline} />
            ) : null;
          })()}
          <ServiceAreaPolygon />
        </CityMap>
        
        {/* Top Floating Header */}
        <div className="absolute top-4 left-4 right-4 z-10 glass rounded-2xl p-4 shadow-elegant flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-foreground">Live Trip Tracker</h1>
            <p className="text-xs text-muted-foreground capitalize">
              Status: {ride.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
             <img src="/icon-192.png" alt="City App" className="w-6 h-6 object-contain rounded" />
          </div>
        </div>

        {/* Bottom Floating Info */}
        <div className="absolute bottom-6 left-4 right-4 z-10 glass rounded-3xl p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-foreground font-bold text-sm">
                   {ride.driver_profiles?.profiles?.full_name?.[0] ?? "D"}
                </div>
                <div>
                   <p className="text-sm font-bold text-foreground">{ride.driver_profiles?.profiles?.full_name ?? "Driver"}</p>
                   <p className="text-xs text-muted-foreground">{ride.driver_profiles?.license_plate ?? "Vehicle"} • {ride.driver_profiles?.vehicle_type?.replace("_", " ")}</p>
                </div>
             </div>
             {routeInfo && isActive && (
               <div className="text-right">
                 <p className="text-xs text-primary font-bold flex items-center gap-1 justify-end">
                   <Clock className="w-3.5 h-3.5" /> ETA: {routeInfo.duration}m
                 </p>
                 <p className="text-[10px] text-muted-foreground">{routeInfo.distance.toFixed(1)} km</p>
               </div>
             )}
          </div>
          <div className="bg-secondary/40 rounded-2xl p-3 text-xs">
             <p className="truncate text-foreground"><span className="text-muted-foreground font-semibold">From:</span> {ride.pickup_address}</p>
             <p className="truncate text-foreground mt-1.5"><span className="text-muted-foreground font-semibold">To:</span> {ride.dropoff_address}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
