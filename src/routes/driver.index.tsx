import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useUserLocation, resolveCoords } from "@/hooks/use-user-location";
import {
  Bike,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CityMap, UserLocationMarker, VendorMarker } from "@/components/map/city-map";
import { MapRoutePolyline, ServiceAreaPolygon } from "@/components/map/map-overlays";
import { parsePostgisPoint, type LatLng } from "@/lib/directions";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchDriverProfile,
  fetchDriverRequests,
  fetchDriverStats,
  updateDriverStatus,
  acceptDriverRequest,
  declineDriverRequest,
  updateDriverProfile,
} from "@/lib/queries";

export const Route = createFileRoute("/driver/")({
  head: () => ({ meta: [{ title: "Driver dashboard — The City App" }] }),
  component: DriverDashboard,
});

type Req = {
  id: string;
  linkedId: string;
  kind: "ride" | "delivery";
  customer: string;
  vendor?: string;
  pickup: string;
  dropoff: string;
  fare: number;
  distanceKm: number;
  pickupCoords?: LatLng | null;
  dropoffCoords?: LatLng | null;
};

function DriverDashboard() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const userLocation = useUserLocation();
  const userCoords = resolveCoords(userLocation);

  const [tab, setTab] = useState<"ride" | "delivery">("ride");
  const [active, setActive] = useState<Req | null>(null);
  const [phase, setPhase] = useState<"accepted" | "picked" | "dropped">("accepted");

  const { data: driverProfile } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: () => fetchDriverProfile(user!.id),
    enabled: !!user,
  });

  // Periodic GPS tracking & broadcasting for online/busy drivers
  useEffect(() => {
    const isTracking = driverProfile?.status === "online" || driverProfile?.status === "busy";
    if (!isTracking || !user) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn("Geolocation not supported on this device.");
      return;
    }

    let lastLat = 0;
    let lastLng = 0;

    const handleCoordsUpdate = async (lat: number, lng: number) => {
      const diff = Math.abs(lat - lastLat) + Math.abs(lng - lastLng);
      if (diff < 0.00005 && lastLat !== 0) return;

      lastLat = lat;
      lastLng = lng;

      try {
        await updateDriverProfile(user.id, {
          current_location: `POINT(${lng} ${lat})`
        });
      } catch (err) {
        console.error("Failed to broadcast driver location:", err);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        handleCoordsUpdate(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error("Driver GPS watch error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driverProfile?.status, user?.id]);

  const online = driverProfile?.status === "online";

  const { data: stats } = useQuery({
    queryKey: ["driver-stats", user?.id],
    queryFn: () => fetchDriverStats(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: rawRequests } = useQuery({
    queryKey: ["driver-requests", user?.id],
    queryFn: () => fetchDriverRequests(user!.id),
    enabled: !!user && online,
    refetchInterval: 60_000,
  });

  type RawReq = NonNullable<typeof rawRequests>[number];

  const allRequests: Req[] = (rawRequests ?? []).map((r: RawReq) => {
    if (r.request_type === "ride") {
      const ride = r.ride_requests as {
        id: string;
        pickup_address: string;
        dropoff_address: string;
        pickup_location: any;
        dropoff_location: any;
        fare: number;
        profiles?: { full_name: string } | null;
      } | null;
      return {
        id: r.id,
        linkedId: ride?.id ?? "",
        kind: "ride" as const,
        customer: ride?.profiles?.full_name ?? "Customer",
        pickup: ride?.pickup_address ?? "—",
        dropoff: ride?.dropoff_address ?? "—",
        fare: Number(ride?.fare ?? 0),
        distanceKm: Number(r.distance_m ?? 0) / 1000,
        pickupCoords: parsePostgisPoint(ride?.pickup_location),
        dropoffCoords: parsePostgisPoint(ride?.dropoff_location),
      };
    } else {
      const order = r.orders as {
        id: string;
        delivery_address: string;
        delivery_location: any;
        total: number;
        profiles?: { full_name: string } | null;
        vendor_profiles?: {
          business_name: string;
          location_in_camp: string;
          pickup_location: any;
        } | null;
      } | null;
      return {
        id: r.id,
        linkedId: order?.id ?? "",
        kind: "delivery" as const,
        customer: order?.profiles?.full_name ?? "Customer",
        vendor: order?.vendor_profiles?.business_name ?? "Vendor",
        pickup: order?.vendor_profiles?.location_in_camp ?? "Vendor",
        dropoff: order?.delivery_address ?? "—",
        fare: Number(order?.total ?? 0),
        distanceKm: Number(r.distance_m ?? 0) / 1000,
        pickupCoords: parsePostgisPoint(order?.vendor_profiles?.pickup_location),
        dropoffCoords: parsePostgisPoint(order?.delivery_location),
      };
    }
  });

  const rideReqs = allRequests.filter((r) => r.kind === "ride");
  const deliveryReqs = allRequests.filter((r) => r.kind === "delivery");

  const { mutate: toggleOnline } = useMutation({
    mutationFn: () => updateDriverStatus(user!.id, online ? "offline" : "online"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-profile", user?.id] });
      toast.success(online ? "You are now offline" : "You are now online");
      if (!online && typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const accept = (r: Req) => {
    setActive(r);
    setPhase("accepted");
  };

  const completeTrip = () => {
    setActive(null);
    setPhase("accepted");
    qc.invalidateQueries({ queryKey: ["driver-stats", user?.id] });
    qc.invalidateQueries({ queryKey: ["driver-requests", user?.id] });
    toast.success("Trip completed");
  };

  const driverName = profile?.full_name ?? "Driver";
  const plate = driverProfile?.license_plate ?? "—";
  const vehicleModel = driverProfile?.vehicle_type ?? "Vehicle";

  if (active) {
    return active.kind === "ride" ? (
      <ActiveRide
        trip={active}
        driverCoords={userCoords}
        onCancel={() => setActive(null)}
        onComplete={completeTrip}
      />
    ) : (
      <ActiveDelivery
        trip={active}
        driverCoords={userCoords}
        phase={phase}
        setPhase={setPhase}
        onCancel={() => setActive(null)}
        onComplete={completeTrip}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative h-[260px] sm:h-[320px] overflow-hidden rounded-3xl">
        <CityMap center={userCoords} zoom={15}>
          <UserLocationMarker position={userCoords} label="You" />
          <ServiceAreaPolygon />
        </CityMap>
        <div className="glass absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-soft z-10">
          <span className={`h-2 w-2 rounded-full ${online ? "bg-success" : "bg-muted-foreground"}`} />
          {online ? "Online · accepting trips" : "Offline"}
        </div>
      </div>

      <section className="glass flex items-center justify-between rounded-3xl p-4 shadow-soft">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Driver's Dashboard
          </p>
          <p className="mt-0.5 text-lg font-bold text-foreground">{driverName}</p>
          <p className="text-xs text-muted-foreground">{plate} · {vehicleModel}</p>
        </div>
        <Link
          to="/driver/settings"
          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground hover:bg-secondary/70"
          aria-label="Driver settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Link
          to="/driver/earnings"
          className="glass rounded-2xl p-3 text-center shadow-soft transition-transform hover:scale-[1.01]"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Today's Earnings</p>
          <p className="mt-1 text-sm font-bold text-foreground sm:text-base">
            {stats ? `₦${stats.earnings.toLocaleString()}` : "—"}
          </p>
        </Link>
        <Link
          to="/driver/history"
          className="glass rounded-2xl p-3 text-center shadow-soft transition-transform hover:scale-[1.01]"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trips Today</p>
          <p className="mt-1 text-sm font-bold text-foreground sm:text-base">
            {stats ? `${stats.totalTrips} Trips` : "—"}
          </p>
        </Link>
        <div className="glass rounded-2xl p-3 text-center shadow-soft">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</p>
          <p className="mt-1 text-sm font-bold text-foreground sm:text-base">
            {driverProfile?.rating ? `${Number(driverProfile.rating).toFixed(1)} ★` : "—"}
          </p>
        </div>
      </section>

      <section className="glass flex items-center justify-between rounded-3xl p-4 shadow-soft">
        <div>
          <p className="text-sm font-bold text-foreground">
            {online ? "You're online" : "Go online"}
          </p>
          <p className="text-xs text-muted-foreground">
            {online ? "You'll start receiving requests." : "Toggle to start accepting trips."}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={online}
          onClick={() => toggleOnline()}
          className={`relative h-7 w-12 rounded-full transition-colors ${online ? "bg-gradient-primary" : "bg-secondary"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-elegant transition-transform ${
              online ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </section>

      {online && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Incoming requests
            </h2>
            <Link to="/driver/requests" className="text-xs font-semibold text-primary">
              Show more →
            </Link>
          </div>

          <div className="flex gap-2">
            <TabBtn active={tab === "ride"} onClick={() => setTab("ride")} Icon={Car} label="Rides" count={rideReqs.length} />
            <TabBtn active={tab === "delivery"} onClick={() => setTab("delivery")} Icon={Package} label="Deliveries" count={deliveryReqs.length} />
          </div>

          {tab === "ride" ? (
            rideReqs.length > 0 ? (
              <RequestCarousel items={rideReqs} onAccept={accept} />
            ) : (
              <EmptyRequests label="No ride requests right now." />
            )
          ) : (
            deliveryReqs.length > 0 ? (
              <RequestCarousel items={deliveryReqs} onAccept={accept} />
            ) : (
              <EmptyRequests label="No delivery requests right now." />
            )
          )}
        </section>
      )}

      {!online && (
        <div className="glass rounded-3xl p-5 text-center shadow-soft">
          <Bike className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">You're currently offline</p>
          <p className="text-xs text-muted-foreground">
            Toggle online above to start receiving ride and delivery requests near you.
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyRequests({ label }: { label: string }) {
  return (
    <div className="glass rounded-3xl p-5 text-center shadow-soft">
      <p className="text-sm font-semibold text-foreground">No requests</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center shadow-soft">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground sm:text-base">{value}</p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof Car;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-gradient-primary text-on-primary shadow-soft"
          : "border border-border bg-card text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25" : "bg-secondary"}`}>
        {count}
      </span>
    </button>
  );
}

function RequestCarousel({ items, onAccept }: { items: Req[]; onAccept: (r: Req) => void }) {
  const sorted = useMemo(() => [...items].sort((a, b) => a.distanceKm - b.distanceKm), [items]);
  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(idx, sorted.length - 1);
  const r = sorted[safeIdx];
  if (!r) return null;

  return (
    <div className="relative">
      <div className="glass rounded-3xl p-4 shadow-elegant">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            New {r.kind === "ride" ? "trip" : "delivery"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {r.distanceKm.toFixed(1)} km away · {safeIdx + 1}/{sorted.length}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-sm font-bold text-foreground">{r.customer}</p>
          {r.kind === "delivery" && r.vendor && (
            <p className="text-xs text-muted-foreground">Vendor: {r.vendor}</p>
          )}
        </div>

        <div className="mt-3 space-y-2 rounded-2xl bg-secondary/40 p-3">
          <Leg dot="bg-primary" label="Pickup" value={r.pickup} />
          <div className="ml-1.5 h-3 w-px bg-border" />
          <Leg dot="bg-emergency" label={r.kind === "ride" ? "Drop-off" : "Delivery"} value={r.dropoff} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fare</p>
            <p className="text-lg font-bold text-foreground">₦{r.fare.toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIdx((i) => (i + 1) % sorted.length)}
              className="rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground"
            >
              Decline
            </button>
            <button
              onClick={() => onAccept(r)}
              className="bg-gradient-primary rounded-full px-5 py-2.5 text-xs font-bold text-on-primary shadow-elegant"
            >
              Accept
            </button>
          </div>
        </div>
      </div>

      {sorted.length > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => (i - 1 + sorted.length) % sorted.length)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % sorted.length)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function Leg({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ActiveRide({
  trip,
  driverCoords,
  onCancel,
  onComplete,
}: {
  trip: Req;
  driverCoords: LatLng;
  onCancel: () => void;
  onComplete: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="relative h-[280px] sm:h-[340px] overflow-hidden rounded-3xl">
        <CityMap center={driverCoords} zoom={15}>
          <UserLocationMarker position={driverCoords} label="You" />
          {trip.pickupCoords && <UserLocationMarker position={trip.pickupCoords} label="Pickup" />}
          {trip.dropoffCoords && <UserLocationMarker position={trip.dropoffCoords} label="Dropoff" />}
          {trip.pickupCoords && (
            <MapRoutePolyline origin={driverCoords} destination={trip.pickupCoords} />
          )}
          <ServiceAreaPolygon />
        </CityMap>
        <div className="glass absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-soft z-10">
          <Navigation className="h-3.5 w-3.5 text-primary" />
          Navigating to pickup
        </div>
      </div>

      <div className="glass space-y-3 rounded-3xl p-4 shadow-elegant">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p>
            <p className="text-base font-bold text-foreground">{trip.customer}</p>
          </div>
          <span className="rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-bold text-success">
            Accepted
          </span>
        </div>
        <div className="space-y-2 rounded-2xl bg-secondary/40 p-3">
          <Leg dot="bg-primary" label="Pickup" value={trip.pickup} />
          <div className="ml-1.5 h-3 w-px bg-border" />
          <Leg dot="bg-emergency" label="Drop-off" value={trip.dropoff} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ActionBtn Icon={Phone} label="Call" />
          <ActionBtn Icon={MessageCircle} label="Chat" />
          <ActionBtn Icon={MapPin} label="Share" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-emergency/40 bg-emergency/5 px-5 py-3 text-sm font-bold text-emergency"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            className="bg-gradient-primary flex-1 rounded-full px-5 py-3 text-sm font-bold text-on-primary shadow-elegant"
          >
            Complete trip
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveDelivery({
  trip,
  driverCoords,
  phase,
  setPhase,
  onCancel,
  onComplete,
}: {
  trip: Req;
  driverCoords: LatLng;
  phase: "accepted" | "picked" | "dropped";
  setPhase: (p: "accepted" | "picked" | "dropped") => void;
  onCancel: () => void;
  onComplete: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="relative h-[260px] sm:h-[320px] overflow-hidden rounded-3xl">
        <CityMap center={driverCoords} zoom={15}>
          <UserLocationMarker position={driverCoords} label="You" />
          {trip.pickupCoords && <VendorMarker position={trip.pickupCoords} />}
          {trip.dropoffCoords && <UserLocationMarker position={trip.dropoffCoords} label="Customer" />}
          {phase === "accepted" && trip.pickupCoords && (
            <MapRoutePolyline origin={driverCoords} destination={trip.pickupCoords} strokeColor="#9E77ED" />
          )}
          {phase === "picked" && trip.dropoffCoords && (
            <MapRoutePolyline origin={driverCoords} destination={trip.dropoffCoords} strokeColor="#7F56D9" />
          )}
          <ServiceAreaPolygon />
        </CityMap>
        <div className="glass absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-soft z-10">
          <Navigation className="h-3.5 w-3.5 text-primary" />
          {phase === "accepted" ? "Heading to vendor" : phase === "picked" ? "Heading to customer" : "Delivered"}
        </div>
      </div>

      <div className="glass grid grid-cols-2 gap-3 rounded-3xl p-4 shadow-elegant">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendor</p>
          <p className="text-sm font-bold text-foreground">{trip.vendor ?? "Vendor"}</p>
          <p className="text-[11px] text-muted-foreground">{trip.pickup}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p>
          <p className="text-sm font-bold text-foreground">{trip.customer}</p>
          <p className="text-[11px] text-muted-foreground">{trip.dropoff}</p>
        </div>
      </div>

      <div className="glass space-y-3 rounded-3xl p-4 shadow-soft">
        <div className="grid grid-cols-3 gap-2">
          <ActionBtn Icon={Phone} label="Call" />
          <ActionBtn Icon={MessageCircle} label="Chat" />
          <ActionBtn Icon={Camera} label="Send photo" />
        </div>
        {phase === "accepted" && (
          <button
            onClick={() => setPhase("picked")}
            className="bg-gradient-primary w-full rounded-full px-5 py-3 text-sm font-bold text-on-primary shadow-elegant"
          >
            <Check className="mr-1 inline h-4 w-4" /> Picked up order
          </button>
        )}
        {phase === "picked" && (
          <button
            onClick={() => {
              setPhase("dropped");
              onComplete();
            }}
            className="bg-gradient-primary w-full rounded-full px-5 py-3 text-sm font-bold text-on-primary shadow-elegant"
          >
            <Check className="mr-1 inline h-4 w-4" /> Dropped off order
          </button>
        )}
        <button
          onClick={onCancel}
          className="w-full rounded-full border border-border bg-card px-5 py-3 text-xs font-semibold text-foreground"
        >
          <X className="mr-1 inline h-3.5 w-3.5" /> Cancel
        </button>
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
