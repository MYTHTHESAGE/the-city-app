import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CircleCheck as CheckCircle2, ChevronDown, ChevronUp, CircleX, Clock, MapPin, MessageCircle, Navigation, Phone, RefreshCw, Star, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CityMap, DriverMarker, UserLocationMarker } from "@/components/map/city-map";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineDriversMap } from "@/hooks/use-online-drivers-map";
import { useRideStatusRealtime } from "@/hooks/use-ride-status-realtime";
import { useUserLocation, resolveCoords } from "@/hooks/use-user-location";
import {
  cancelRideRequest,
  createRideRequest,
  fetchActiveRide,
  fetchRideById,
  fetchUserRides,
  fetchWallet,
  fetchSavedLocations,
  invokeCalculateFare,
  invokeMatchDriver,
  rateRide,
} from "@/lib/queries";
import { formatDistanceToNow } from "date-fns";
import { isPointInPolygon, parsePostgisPoint, getRoute, type LatLng } from "@/lib/directions";
import { MapRoutePolyline, ServiceAreaPolygon } from "@/components/map/map-overlays";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/ride")({
  head: () => ({ meta: [{ title: "Request a ride — The City App" }] }),
  component: RideRequest,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending — finding drivers",
  searching: "Searching for drivers",
  driver_assigned: "Driver assigned",
  driver_enroute: "Driver en route",
  driver_arrived: "Driver arrived",
  in_progress: "Ride in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ACTIVE_STATUSES = new Set([
  "pending",
  "searching",
  "driver_assigned",
  "driver_enroute",
  "driver_arrived",
  "in_progress",
]);

type ActiveRide = NonNullable<Awaited<ReturnType<typeof fetchRideById>>>;
type DriverProfile = {
  id: string;
  vehicle_type: string | null;
  license_plate: string | null;
  rating: number | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

function RideRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [payment, setPayment] = useState<"wallet" | "cash">("wallet");
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratedRideId, setRatedRideId] = useState<string | null>(null);
  const [fare, setFare] = useState<number | null>(null);
  const [matchStatus, setMatchStatus] = useState<"idle" | "matching" | "dispatched" | "no_drivers">("idle");
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
    polyline: string;
  } | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string>("");



  // Fetch fare whenever pickup+dropoff are both non-empty (debounced by 600ms)
  useEffect(() => {
    if (!pickup.trim() || !dropoff.trim()) { setFare(null); return; }
    const t = setTimeout(() => {
      invokeCalculateFare({ distance_km: 1.5 })
        .then((r) => setFare(r.total_fare))
        .catch(() => setFare(350)); // graceful fallback
    }, 600);
    return () => clearTimeout(t);
  }, [pickup, dropoff]);

  // Realtime subscription — invalidates ["ride", activeRideId] on every status change
  useRideStatusRealtime(activeRideId, user?.id);

  const userLocation = useUserLocation();
  const userCoords = resolveCoords(userLocation);
  const { data: onlineDrivers } = useOnlineDriversMap();

  // Check for an in-progress ride on mount
  const { data: resumedRide, isLoading: resuming } = useQuery({
    queryKey: ["active-ride", user?.id],
    queryFn: () => fetchActiveRide(user!.id),
    enabled: !!user && !activeRideId,
    staleTime: 0,
  });

  useEffect(() => {
    if (resumedRide?.id && !activeRideId) {
      setActiveRideId(resumedRide.id);
    }
  }, [resumedRide, activeRideId]);

  // Poll the active ride's DB status
  const { data: activeRide, refetch: refetchRide } = useQuery({
    queryKey: ["ride", activeRideId],
    queryFn: () => fetchRideById(activeRideId!),
    enabled: !!activeRideId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || !ACTIVE_STATUSES.has(status)) return false;
      return 60_000;
    },
  });

  // Realtime subscription for driver location updates
  useEffect(() => {
    const driverId = activeRide?.driver_profiles?.id;
    if (!driverId || !activeRideId) return;

    const channel = supabase
      .channel(`driver-location:${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "driver_profiles",
          filter: `id=eq.${driverId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["active-ride", user?.id] });
          qc.invalidateQueries({ queryKey: ["ride", activeRideId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRide?.driver_profiles?.id, activeRideId, qc, user?.id]);

  // Calculate directions & ETA dynamically
  useEffect(() => {
    if (!activeRide) {
      setRouteInfo(null);
      return;
    }

    const driverLoc = parsePostgisPoint(activeRide.driver_profiles?.current_location);
    const pickupLoc = parsePostgisPoint(activeRide.pickup_location);
    const dropoffLoc = parsePostgisPoint(activeRide.dropoff_location);

    const vehicleType = activeRide.driver_profiles?.vehicle_type;

    let origin: LatLng | null = null;
    let dest: LatLng | null = null;

    const status = activeRide.status;
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
        .then((res) => {
          setRouteInfo(res);
        })
        .catch((err) => {
          console.error("Failed to get route directions:", err);
        });
    } else {
      setRouteInfo(null);
    }
  }, [activeRide?.status, activeRide?.driver_profiles?.current_location, activeRide?.pickup_location, activeRide?.dropoff_location]);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => fetchWallet(user!.id),
    enabled: !!user,
  });

  const { data: rideHistory } = useQuery({
    queryKey: ["user-rides", user?.id],
    queryFn: () => fetchUserRides(user!.id, 15),
    enabled: !!user && showHistory,
  });

  const { data: savedLocations } = useQuery({
    queryKey: ["saved-locations", user?.id],
    queryFn: () => fetchSavedLocations(user!.id),
    enabled: !!user,
  });

  const { mutate: submitRequest, isPending: requesting } = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not authenticated.");
      if (!isPointInPolygon(userCoords)) {
        throw new Error("Ride services are only available inside the Redemption City operational boundary.");
      }
      if (!pickup.trim()) throw new Error("Enter a pickup location.");
      if (!dropoff.trim()) throw new Error("Enter a destination.");
      const effectiveFare = fare ?? 350;
      if (payment === "wallet" && wallet && Number(wallet.balance) < effectiveFare) {
        throw new Error("Insufficient wallet balance.");
      }
      return createRideRequest({
        user_id: user.id,
        pickup_address: pickup,
        dropoff_address: dropoff,
        fare: effectiveFare,
        payment_method: payment,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      });
    },
    onSuccess: async (rideId) => {
      setActiveRideId(rideId);
      qc.invalidateQueries({ queryKey: ["active-ride", user?.id] });
      // Fire match-driver asynchronously — failure is non-blocking
      setMatchStatus("matching");
      try {
        const result = await invokeMatchDriver({
          ride_id: rideId,
          pickup_lat: userCoords.lat,
          pickup_lng: userCoords.lng,
        });
        setMatchStatus(result.status);
        if (result.status === "no_drivers") {
          toast.warning("No drivers nearby right now. Your request is queued.");
        }
      } catch {
        setMatchStatus("idle");
        // Non-fatal: ride is created, dispatch will be retried
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: doCancel, isPending: cancelling } = useMutation({
    mutationFn: () => {
      if (!activeRideId) throw new Error("No active ride.");
      return cancelRideRequest(activeRideId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ride", activeRideId] });
      qc.invalidateQueries({ queryKey: ["user-rides", user?.id] });
      qc.invalidateQueries({ queryKey: ["active-ride", user?.id] });
      setActiveRideId(null);
      toast.success("Ride cancelled.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: submitRating, isPending: submittingRating } = useMutation({
    mutationFn: () => {
      if (!ratedRideId) throw new Error("No ride to rate.");
      if (!rating) throw new Error("Please select a star rating.");
      return rateRide(ratedRideId, rating);
    },
    onSuccess: () => {
      setShowRateModal(false);
      setRating(0);
      setRatedRideId(null);
      setActiveRideId(null);
      qc.invalidateQueries({ queryKey: ["user-rides", user?.id] });
      qc.invalidateQueries({ queryKey: ["active-ride", user?.id] });
      toast.success("Thanks for your feedback!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Transition to rate modal when ride completes
  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      activeRide?.status === "completed" &&
      prevStatusRef.current !== "completed" &&
      activeRideId &&
      !showRateModal
    ) {
      setRatedRideId(activeRideId);
      setShowRateModal(true);
    }
    prevStatusRef.current = activeRide?.status;
  }, [activeRide?.status]);

  const dismissRide = () => {
    setActiveRideId(null);
    setShowRateModal(false);
    setRating(0);
    setRatedRideId(null);
  };

  const status = activeRide?.status ?? null;
  const isActive = status && ACTIVE_STATUSES.has(status);
  const driverData = activeRide?.driver_profiles as DriverProfile | null;
  const driverName = driverData?.profiles?.full_name ?? null;
  const driverPhone = driverData?.profiles?.phone ?? null;
  const vehicleLabel = [
    driverData?.vehicle_type?.replace("_", " "),
    driverData?.license_plate,
  ]
    .filter(Boolean)
    .join(" · ");

  const converging =
    status === "driver_enroute" ||
    status === "driver_arrived" ||
    status === "in_progress";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {isActive ? "Your ride" : "Request a ride"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isActive ? STATUS_LABEL[status] : "Find a Keke near you in Redemption City."}
          </p>
        </div>
        {isActive && (
          <button
            onClick={() => refetchRide()}
            className="glass grid h-9 w-9 place-items-center rounded-full text-muted-foreground"
            aria-label="Refresh status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Map */}
      <div className="relative h-[280px] sm:h-[340px]">
        <CityMap center={userCoords} zoom={16} className="h-full w-full rounded-3xl">
          <UserLocationMarker position={userCoords} />
          
          {/* Geofence boundary polygon */}
          <ServiceAreaPolygon />

          {/* Active assigned driver marker */}
          {isActive && driverData && activeRide?.driver_profiles && (() => {
            const driverLoc = parsePostgisPoint(activeRide.driver_profiles.current_location);
            return driverLoc ? (
              <DriverMarker
                position={driverLoc}
                name={driverName ?? undefined}
                vehicleType={driverData.vehicle_type ?? undefined}
              />
            ) : null;
          })()}

          {/* Route path polyline */}
          {isActive && routeInfo && (() => {
            const driverLoc = parsePostgisPoint(activeRide?.driver_profiles?.current_location);
            const pickupLoc = parsePostgisPoint(activeRide?.pickup_location);
            const dropoffLoc = parsePostgisPoint(activeRide?.dropoff_location);
            
            const status = activeRide?.status;
            let origin: LatLng | null = null;
            let dest: LatLng | null = null;

            if (status === "driver_assigned" || status === "driver_enroute" || status === "driver_arrived") {
              origin = driverLoc;
              dest = pickupLoc;
            } else if (status === "in_progress") {
              origin = pickupLoc;
              dest = dropoffLoc;
            }

            return origin && dest ? (
              <MapRoutePolyline
                origin={origin}
                destination={dest}
                encodedPolyline={routeInfo.polyline}
              />
            ) : null;
          })()}

          {/* Nearby online drivers when idle */}
          {!isActive && (onlineDrivers ?? []).map((d) => (
            <DriverMarker
              key={d.driver_id}
              position={{ lat: d.lat, lng: d.lng }}
              vehicleType={d.vehicle_type ?? undefined}
            />
          ))}
        </CityMap>
        {status === "driver_arrived" && (
          <div className="glass absolute left-1/2 top-4 -translate-x-1/2 animate-fade-up rounded-full px-4 py-2 text-xs font-semibold text-foreground shadow-elegant">
            <span className="text-success">●</span> Driver arrived
          </div>
        )}
        {status === "in_progress" && (
          <div className="glass absolute left-1/2 top-4 -translate-x-1/2 animate-fade-up rounded-full px-4 py-2 text-xs font-semibold text-foreground shadow-elegant">
            <span className="text-primary">●</span> Ride in progress
          </div>
        )}
      </div>

      {resuming && !activeRideId && (
        <div className="glass flex items-center gap-3 rounded-2xl p-4 shadow-soft">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Checking for active rides…</p>
        </div>
      )}

      {/* ── IDLE: booking form ── */}
      {!activeRideId && !resuming && (
        <>
          <div className="glass space-y-2 rounded-2xl p-3 shadow-soft">
            <LocationRow
              label="Pickup"
              value={pickup}
              onChange={setPickup}
              dot="bg-primary"
              placeholder="e.g. Hostel B, Block 4"
            />
            <div className="ml-5 h-3 w-px bg-border" />
            <LocationRow
              label="Destination"
              value={dropoff}
              onChange={setDropoff}
              dot="bg-emergency"
              placeholder="e.g. Auditorium 1"
            />
          </div>

          {savedLocations && savedLocations.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {savedLocations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setDropoff(loc.address)}
                  className="shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <MapPin className="h-3 w-3 text-primary" />
                  {loc.label}
                </button>
              ))}
            </div>
          )}

          <div className="glass space-y-3 rounded-2xl p-4 shadow-soft">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Schedule for later (optional)</p>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-xs text-muted-foreground">Estimated fare</p>
                {fare != null ? (
                  <p className="text-2xl font-bold text-foreground">₦{fare.toLocaleString()}</p>
                ) : pickup && dropoff ? (
                  <div className="mt-1 h-7 w-20 animate-pulse rounded-lg bg-secondary" />
                ) : (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                )}
              </div>
              <div className="flex gap-2">
                <PayOption
                  active={payment === "wallet"}
                  onClick={() => setPayment("wallet")}
                  label="Wallet"
                  sub={wallet ? `₦${Number(wallet.balance).toLocaleString()}` : "…"}
                />
                <PayOption
                  active={payment === "cash"}
                  onClick={() => setPayment("cash")}
                  label="Cash"
                  sub="On arrival"
                />
              </div>
            </div>
            {payment === "wallet" && wallet && fare != null && Number(wallet.balance) < fare && (
              <p className="text-xs text-destructive">Insufficient balance. Use cash.</p>
            )}
            <button
              onClick={() => submitRequest()}
              disabled={requesting}
              className="bg-gradient-primary w-full rounded-full px-5 py-3 text-sm font-bold text-on-primary shadow-elegant transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {requesting ? "Requesting…" : "Request Driver Now"}
            </button>
          </div>
        </>
      )}

      {/* ── PENDING / SEARCHING ── */}
      {isActive && (status === "pending" || status === "searching") && (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-6 shadow-soft">
          <div className="relative h-14 w-14">
            <span className="absolute inset-0 animate-pulse rounded-full bg-primary/30" />
            <div className="bg-gradient-primary relative grid h-14 w-14 place-items-center rounded-full text-on-primary">
              <Navigation className="h-6 w-6" />
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {status === "pending" ? "Finding nearby drivers…" : "Matching you with a driver…"}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeRide?.pickup_address} → {activeRide?.dropoff_address}
          </p>
          <button
            onClick={() => doCancel()}
            disabled={cancelling}
            className="mt-1 rounded-full border border-border bg-card px-5 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel request"}
          </button>
        </div>
      )}

      {/* ── DRIVER ASSIGNED / EN ROUTE / ARRIVED / IN PROGRESS ── */}
      {isActive && status !== "pending" && status !== "searching" && (
        <div className="glass space-y-4 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                {STATUS_LABEL[status]}
              </p>
              <p className="mt-0.5 truncate text-base font-bold text-foreground">
                {driverName ?? "Driver en route"}
              </p>
              {routeInfo && (
                <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-primary">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    ETA: {routeInfo.duration} mins
                  </span>
                  <span>·</span>
                  <span>
                    Distance: {routeInfo.distance.toFixed(1)} km
                  </span>
                </div>
              )}
              {vehicleLabel && (
                <p className="text-xs text-muted-foreground">{vehicleLabel}</p>
              )}
              {driverData?.rating != null && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-[#FFD66B] text-[#FFD66B]" />
                  {Number(driverData.rating).toFixed(1)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Fare</p>
              <p className="text-2xl font-bold text-foreground">
                {activeRide?.fare ? `₦${Number(activeRide.fare).toLocaleString()}` : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-secondary/40 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">From:</span>{" "}
              {activeRide?.pickup_address}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-foreground">To:</span>{" "}
              {activeRide?.dropoff_address}
            </p>
          </div>

          {driverPhone && (
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`tel:${driverPhone}`}
                className="flex flex-col items-center gap-1 rounded-2xl bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary/70"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
              <ActionBtn Icon={MessageCircle} label="Chat" />
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/track/${activeRideId}`;
                  if (navigator.share) {
                    navigator.share({ title: "Track my ride", url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url);
                    toast.success("Tracking link copied to clipboard");
                  }
                }}
                className="flex flex-col items-center gap-1 rounded-2xl bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary/70"
              >
                <MapPin className="h-4 w-4" />
                Share
              </button>
            </div>
          )}

          {status !== "in_progress" && status !== "driver_arrived" && (
            <button
              onClick={() => doCancel()}
              disabled={cancelling}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-emergency/40 bg-emergency/5 px-5 py-3 text-sm font-bold text-emergency disabled:opacity-50"
            >
              <CircleX className="h-4 w-4" />
              {cancelling ? "Cancelling…" : "Cancel ride"}
            </button>
          )}

          {status === "driver_arrived" && (
            <p className="text-center text-xs text-success">
              Your driver is outside. Board when ready.
            </p>
          )}
        </div>
      )}

      {/* ── COMPLETED (before rating) ── */}
      {activeRide?.status === "completed" && !showRateModal && (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-6 shadow-soft">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-sm font-bold text-foreground">Ride completed</p>
          <p className="text-xs text-muted-foreground">
            {activeRide.pickup_address} → {activeRide.dropoff_address}
          </p>
          <button
            onClick={() => {
              setRatedRideId(activeRide.id);
              setShowRateModal(true);
            }}
            className="bg-gradient-primary rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant"
          >
            Rate your ride
          </button>
          <button onClick={dismissRide} className="text-xs text-muted-foreground">
            Skip
          </button>
        </div>
      )}

      {/* ── CANCELLED ── */}
      {activeRide?.status === "cancelled" && (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-5 shadow-soft">
          <CircleX className="h-8 w-8 text-emergency" />
          <p className="text-sm font-semibold text-foreground">Ride was cancelled</p>
          <button
            onClick={dismissRide}
            className="rounded-full border border-border bg-card px-5 py-2 text-xs font-semibold text-foreground"
          >
            Book another ride
          </button>
        </div>
      )}

      {/* ── RIDE HISTORY ── */}
      {!activeRideId && (
        <section className="glass rounded-2xl shadow-soft">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex w-full items-center justify-between p-4 text-sm font-semibold text-foreground"
          >
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Ride history
            </span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showHistory && (
            <div className="border-t border-border/60 px-4 pb-4">
              {!rideHistory && (
                <div className="space-y-2 pt-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-secondary" />
                  ))}
                </div>
              )}
              {rideHistory && rideHistory.length === 0 && (
                <p className="pt-3 text-xs text-muted-foreground">No rides yet.</p>
              )}
              {rideHistory && rideHistory.length > 0 && (
                <ul className="mt-3 divide-y divide-border/60">
                  {rideHistory.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2.5 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {r.pickup_address} → {r.dropoff_address}
                        </p>
                        <p className="capitalize text-muted-foreground">
                          {STATUS_LABEL[r.status] ?? r.status.replace(/_/g, " ")} ·{" "}
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {r.fare && (
                        <span className="ml-3 shrink-0 font-semibold text-foreground">
                          ₦{Number(r.fare).toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── RATING MODAL ── */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center">
          <div className="glass w-full max-w-md rounded-t-3xl p-5 shadow-elegant sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Rate your trip</p>
              <button onClick={dismissRide} className="text-muted-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`Rate ${n} stars`}>
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      n <= rating
                        ? "fill-[#FFD66B] text-[#FFD66B]"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {rating === 0
                ? "Tap a star to rate"
                : ["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
            </p>
            <button
              onClick={() => submitRating()}
              disabled={submittingRating || rating === 0}
              className="bg-gradient-primary mt-4 w-full rounded-full py-3 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
            >
              {submittingRating
                ? "Submitting…"
                : activeRide?.fare
                  ? `Pay ₦${Number(activeRide.fare).toLocaleString()} & finish`
                  : "Finish ride"}
            </button>
            <button onClick={dismissRide} className="mt-2 w-full py-2 text-xs text-muted-foreground">
              Skip rating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationRow({
  label,
  value,
  onChange,
  dot,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dot: string;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  );
}

function ActionBtn({ Icon, label }: { Icon: typeof Phone; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 rounded-2xl bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/70">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PayOption({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-2 text-left text-xs transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/50"
      }`}
    >
      <p className="font-bold text-foreground">{label}</p>
      <p className="text-muted-foreground">{sub}</p>
    </button>
  );
}
