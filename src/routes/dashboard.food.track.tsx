import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { CircleCheck as CheckCircle2, ChevronDown, ChevronUp, Clock, Package, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useOrderTracking } from "@/hooks/use-order-tracking";
import { fetchOrderById, fetchUserOrders } from "@/lib/queries";
import { RCCG_CAMP } from "@/hooks/use-user-location";
import { parsePostgisPoint, getRoute, type LatLng } from "@/lib/directions";
import { MapRoutePolyline, ServiceAreaPolygon } from "@/components/map/map-overlays";
import { CityMap, DriverMarker, UserLocationMarker, VendorMarker } from "@/components/map/city-map";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/food/track")({
  head: () => ({ meta: [{ title: "Order tracking — The City App" }] }),
  validateSearch: z.object({ orderId: z.string().optional() }),
  component: Tracking,
});

const STATUS_STEPS = [
  { id: "pending", label: "Order placed", sub: "Waiting for vendor confirmation" },
  { id: "confirmed", label: "Confirmed", sub: "Vendor received your order" },
  { id: "preparing", label: "Being prepared", sub: "Vendor is preparing now" },
  { id: "ready", label: "Ready", sub: "Order is ready for pickup" },
  { id: "picked_up", label: "Picked up", sub: "Driver collected the order" },
  { id: "delivered", label: "Delivered", sub: "Enjoy your meal!" },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.id);

function Tracking() {
  const { orderId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
    polyline: string;
  } | null>(null);



  // Realtime subscription — invalidates ["order", orderId] on any status change
  useOrderTracking(orderId);

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrderById(orderId!),
    enabled: !!orderId,
    refetchInterval: 60_000,
  });

  // Realtime subscription for driver location updates
  useEffect(() => {
    const driverId = order?.driver_profiles?.id;
    if (!driverId || !orderId) return;

    const channel = supabase
      .channel(`delivery-driver-location:${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "driver_profiles",
          filter: `id=eq.${driverId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.driver_profiles?.id, orderId]);

  // Calculate directions & ETA dynamically
  useEffect(() => {
    if (!order) {
      setRouteInfo(null);
      return;
    }

    const customerCoords = parsePostgisPoint(order.delivery_location) || RCCG_CAMP;
    const vendorCoords = parsePostgisPoint(order.vendor_profiles?.pickup_location);
    const driverCoords = parsePostgisPoint(order.driver_profiles?.current_location);
    const vehicleType = order.driver_profiles?.vehicle_type;

    let origin: LatLng | null = null;
    let dest: LatLng | null = null;

    if (driverCoords) {
      if (order.status === "picked_up" || order.status === "out_for_delivery") {
        origin = driverCoords;
        dest = customerCoords;
      } else if (vendorCoords) {
        origin = driverCoords;
        dest = vendorCoords;
      }
    } else if (vendorCoords) {
      origin = vendorCoords;
      dest = customerCoords;
    }

    if (origin && dest) {
      getRoute(origin, dest, vehicleType)
        .then((res) => setRouteInfo(res))
        .catch((err) => console.error("Failed to get food delivery route:", err));
    } else {
      setRouteInfo(null);
    }
  }, [order?.status, order?.delivery_location, order?.vendor_profiles?.pickup_location, order?.driver_profiles?.current_location]);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["user-orders", user?.id],
    queryFn: () => fetchUserOrders(user!.id, 15),
    enabled: !!user && showHistory,
  });

  const currentStatusIdx = order ? STATUS_ORDER.indexOf(order.status) : -1;
  const vendor = order?.vendor_profiles as { business_name: string } | null;
  const items = order?.order_items as { id: string; product_name: string; product_price: number; quantity: number; subtotal: number }[] | undefined;

  if (!orderId) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Order tracking</h1>
          <p className="text-xs text-muted-foreground">Your recent food orders.</p>
        </div>
        <OrderHistorySection
          userId={user?.id}
          onSelect={(id) => navigate({ to: "/dashboard/food/track", search: { orderId: id } })}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl bg-secondary" />
        <div className="h-48 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Order not found</p>
          <p className="text-xs text-muted-foreground">This order may have been removed.</p>
          <Link to="/dashboard/food" className="mt-2 block text-xs text-primary">Browse vendors</Link>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === "delivered" || order.status === "picked_up";
  const isCancelled = order.status === "cancelled";

  let prepEtaStr = "";
  if ((order.status === "confirmed" || order.status === "preparing") && order.confirmed_at && order.prep_time_minutes) {
    const confirmedAt = new Date(order.confirmed_at);
    const expectedReadyAt = new Date(confirmedAt.getTime() + order.prep_time_minutes * 60000);
    const now = new Date();
    if (expectedReadyAt > now) {
      const diffMins = Math.ceil((expectedReadyAt.getTime() - now.getTime()) / 60000);
      prepEtaStr = `Ready in ~${diffMins} min`;
    } else {
      prepEtaStr = "Should be ready soon";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Tracking order</h1>
          <p className="text-xs text-muted-foreground">
            {vendor?.business_name ?? "Order"} · {order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="glass grid h-9 w-9 place-items-center rounded-full text-muted-foreground"
          aria-label="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className={`overflow-hidden rounded-3xl p-5 shadow-elegant relative ${isCancelled ? "bg-emergency/10 border border-emergency/30" : "bg-gradient-primary text-on-primary"}`}>
        <p className={`text-xs uppercase tracking-wider ${isCancelled ? "text-emergency" : "text-on-primary-soft"}`}>
          Current status
        </p>
        <p className={`mt-1 text-2xl font-bold ${isCancelled ? "text-emergency" : ""}`}>
          {STATUS_STEPS.find((s) => s.id === order.status)?.label ?? order.status.replace(/_/g, " ")}
        </p>
        <p className={`text-sm ${isCancelled ? "text-muted-foreground" : "text-on-primary-soft"}`}>
          {isCancelled
            ? "Your order was cancelled."
            : STATUS_STEPS.find((s) => s.id === order.status)?.sub ?? ""}
        </p>
        {prepEtaStr && (
          <div className="absolute top-5 right-5 rounded-full bg-background/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            {prepEtaStr}
          </div>
        )}
      </div>

      {/* Map Tracking */}
      {!isCancelled && (
        <div className="relative h-[240px] sm:h-[280px]">
          <CityMap
            center={parsePostgisPoint(order.delivery_location) || RCCG_CAMP}
            zoom={15}
            className="h-full w-full rounded-3xl"
          >
            {/* Geofence polygon */}
            <ServiceAreaPolygon />

            {/* Customer location */}
            {(() => {
              const customerCoords = parsePostgisPoint(order.delivery_location);
              return customerCoords ? (
                <UserLocationMarker position={customerCoords} label="You" />
              ) : null;
            })()}

            {/* Vendor location */}
            {(() => {
              const vendorCoords = parsePostgisPoint(order.vendor_profiles?.pickup_location);
              return vendorCoords ? (
                <VendorMarker
                  position={vendorCoords}
                  name={order.vendor_profiles?.business_name ?? undefined}
                />
              ) : null;
            })()}

            {/* Driver location */}
            {(() => {
              const driverCoords = parsePostgisPoint(order.driver_profiles?.current_location);
              return driverCoords ? (
                <DriverMarker
                  position={driverCoords}
                  name={order.driver_profiles?.profiles?.full_name ?? undefined}
                  vehicleType={order.driver_profiles?.vehicle_type ?? undefined}
                />
              ) : null;
            })()}

            {/* Route polyline overlay */}
            {(() => {
              const customerCoords = parsePostgisPoint(order.delivery_location) || RCCG_CAMP;
              const vendorCoords = parsePostgisPoint(order.vendor_profiles?.pickup_location);
              const driverCoords = parsePostgisPoint(order.driver_profiles?.current_location);

              let origin: LatLng | null = null;
              let dest: LatLng | null = null;

              if (driverCoords) {
                if (order.status === "picked_up" || order.status === "out_for_delivery") {
                  origin = driverCoords;
                  dest = customerCoords;
                } else if (vendorCoords) {
                  origin = driverCoords;
                  dest = vendorCoords;
                }
              } else if (vendorCoords) {
                origin = vendorCoords;
                dest = customerCoords;
              }

              return origin && dest && routeInfo ? (
                <MapRoutePolyline
                  origin={origin}
                  destination={dest}
                  encodedPolyline={routeInfo.polyline}
                />
              ) : null;
            })()}
          </CityMap>

          {/* Floating ETA card */}
          {routeInfo && (
            <div className="glass absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl p-2.5 shadow-elegant text-[11px] font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span>
                  {order.driver_id
                    ? order.status === "picked_up" || order.status === "out_for_delivery"
                      ? "Driver arriving in:"
                      : "Driver reaching vendor in:"
                    : "Estimated delivery time:"}
                </span>
                <span className="text-primary font-bold">{routeInfo.duration} mins</span>
              </span>
              <span className="text-muted-foreground">({routeInfo.distance.toFixed(1)} km)</span>
            </div>
          )}
        </div>
      )}

      {/* Progress steps */}
      {!isCancelled && (
        <section className="glass rounded-2xl p-4 shadow-soft">
          <ol className="space-y-3">
            {STATUS_STEPS.map((s, i) => {
              const done = i < currentStatusIdx;
              const active = i === currentStatusIdx;
              return (
                <li key={s.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      done
                        ? "bg-success text-white"
                        : active
                          ? "bg-gradient-primary text-on-primary shadow-soft"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div>
                    <p className={`text-sm ${active ? "font-bold text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Order summary */}
      <section className="glass rounded-2xl p-4 shadow-soft">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Order summary
        </p>
        {(items ?? []).map((it) => (
          <div key={it.id} className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-foreground">
              <span className="mr-1.5 font-bold text-primary">{it.quantity}×</span>
              {it.product_name}
            </span>
            <span className="font-semibold text-foreground">₦{Number(it.subtotal).toLocaleString()}</span>
          </div>
        ))}
        <div className="mt-2 border-t border-border/60 pt-2 text-sm">
          {Number(order.delivery_fee) > 0 && (
            <div className="flex items-center justify-between py-1 text-muted-foreground">
              <span>Delivery fee</span>
              <span>₦{Number(order.delivery_fee).toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-1 font-bold text-foreground">
            <span>Total</span>
            <span>₦{Number(order.total).toLocaleString()}</span>
          </div>
        </div>
        {order.delivery_address && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Deliver to: {order.delivery_address}
          </p>
        )}
      </section>

      {isDelivered && (
        <Link
          to="/dashboard"
          className="bg-gradient-primary block rounded-full px-5 py-3.5 text-center text-sm font-bold text-on-primary shadow-elegant"
        >
          <CheckCircle2 className="mr-1.5 inline h-4 w-4" /> Done — back to dashboard
        </Link>
      )}

      {isCancelled && (
        <Link
          to="/dashboard/food"
          className="block rounded-full border border-border bg-card px-5 py-3.5 text-center text-sm font-semibold text-foreground"
        >
          Order again
        </Link>
      )}

      {/* Order history accordion */}
      <section className="glass rounded-2xl shadow-soft">
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex w-full items-center justify-between p-4 text-sm font-semibold text-foreground"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Order history
          </span>
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showHistory && (
          <div className="border-t border-border/60 px-4 pb-4">
            {historyLoading && <p className="pt-3 text-xs text-muted-foreground">Loading…</p>}
            {!historyLoading && (history ?? []).length === 0 && (
              <p className="pt-3 text-xs text-muted-foreground">No past orders.</p>
            )}
            {!historyLoading && (history ?? []).length > 0 && (
              <ul className="mt-2 divide-y divide-border/60">
                {(history ?? []).map((o) => {
                  const v = o.vendor_profiles as { business_name: string } | null;
                  const isActive = o.id === orderId;
                  return (
                    <li key={o.id}>
                      <button
                        onClick={() => navigate({ to: "/dashboard/food/track", search: { orderId: o.id } })}
                        className={`flex w-full items-center justify-between py-2.5 text-xs text-left ${isActive ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {v?.business_name ?? "Order"}
                          </p>
                          <p className="capitalize text-muted-foreground">
                            {o.status.replace(/_/g, " ")} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <span className="ml-3 shrink-0 font-semibold text-foreground">₦{Number(o.total).toLocaleString()}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function OrderHistorySection({
  userId,
  onSelect,
}: {
  userId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["user-orders", userId],
    queryFn: () => fetchUserOrders(userId!, 20),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">No orders yet</p>
        <p className="text-xs text-muted-foreground">Place your first order to see it here.</p>
        <Link to="/dashboard/food" className="mt-3 block text-xs font-semibold text-primary">
          Browse vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl shadow-soft divide-y divide-border/60">
      {orders.map((o) => {
        const v = o.vendor_profiles as { business_name: string } | null;
        return (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{v?.business_name ?? "Order"}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {o.status.replace(/_/g, " ")} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
              </p>
            </div>
            <span className="ml-3 shrink-0 text-sm font-bold text-foreground">₦{Number(o.total).toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
}
