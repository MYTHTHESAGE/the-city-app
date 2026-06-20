import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Package, Plus, Settings as SettingsIcon, Star } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorOrdersRealtime } from "@/hooks/use-vendor-orders-realtime";
import {
  fetchAllProductsByVendor,
  fetchVendorById,
  fetchVendorOrders,
  fetchVendorSalesStats,
  updateOrderStatus,
} from "@/lib/queries";

export const Route = createFileRoute("/vendor/")({
  head: () => ({ meta: [{ title: "Vendor dashboard — The City App" }] }),
  component: VendorDashboard,
});

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1400&q=70";
const FALLBACK_PRODUCT =
  "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=70";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";

function VendorDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [orderIdx, setOrderIdx] = useState(0);

  // Live order updates — invalidates pending-orders + sales on every INSERT/UPDATE
  useVendorOrdersRealtime(user?.id);

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: () => fetchVendorById(user!.id),
    enabled: !!user,
  });

  const { data: salesOrders, isLoading: salesLoading } = useQuery({
    queryKey: ["vendor-sales", user?.id],
    queryFn: () => fetchVendorSalesStats(user!.id),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const { data: pendingOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["vendor-pending-orders", user?.id],
    queryFn: () => fetchVendorOrders(user!.id, ["pending", "confirmed", "preparing", "ready"]),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["all-products", user?.id],
    queryFn: () => fetchAllProductsByVendor(user!.id),
    enabled: !!user,
  });

  const revenue = (salesOrders ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
  const orderCount = (salesOrders ?? []).length;

  const sorted = [...(pendingOrders ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const safeIdx = sorted.length > 0 ? orderIdx % sorted.length : 0;
  const order = sorted[safeIdx];

  const invalidateOrders = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["vendor-pending-orders", user?.id] });
    qc.invalidateQueries({ queryKey: ["vendor-sales", user?.id] });
  }, [qc, user?.id]);

  const { mutate: advanceStatus, isPending: advancing } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      invalidateOrders();
      toast.success("Order updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getNextStatus = (current: OrderStatus, method: string): string | null => {
    if (current === "pending") return "confirmed";
    if (current === "confirmed") return "preparing";
    if (current === "preparing") return "ready";
    if (current === "ready" && method === "pickup") return "picked_up";
    if (current === "ready" && method === "delivery") return "picked_up";
    return null;
  };

  const getActionLabel = (current: OrderStatus, method: string): string | null => {
    if (current === "pending") return "Confirm order";
    if (current === "confirmed") return "Start preparing";
    if (current === "preparing") return "Mark ready";
    if (current === "ready" && method === "pickup") return "Mark picked up";
    if (current === "ready" && method === "delivery") return "Driver called";
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <section className="overflow-hidden rounded-3xl shadow-elegant">
        <div className="relative h-36 sm:h-44">
          {vendor === undefined ? (
            <div className="h-full w-full animate-pulse bg-secondary" />
          ) : (
            <img
              src={vendor?.cover_url ?? FALLBACK_COVER}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/30 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                Welcome back
              </p>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                {vendor?.business_name ?? "…"}
              </h1>
              {vendor?.location_in_camp && (
                <p className="text-xs text-foreground/80">{vendor.location_in_camp}</p>
              )}
            </div>
            <Link
              to="/vendor/settings"
              className="glass grid h-10 w-10 place-items-center rounded-full"
              aria-label="Vendor settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-3 gap-2">
        <Link
          to="/vendor/sales"
          className="glass rounded-2xl p-3 text-center shadow-soft transition-transform hover:scale-[1.01]"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Today's Revenue</p>
          {salesLoading ? (
            <div className="mx-auto mt-1.5 h-4 w-16 animate-pulse rounded bg-secondary" />
          ) : (
            <p className="mt-1 text-sm font-bold text-foreground sm:text-base">
              ₦{revenue.toLocaleString()}
            </p>
          )}
        </Link>
        <Link
          to="/vendor/sales"
          className="glass rounded-2xl p-3 text-center shadow-soft transition-transform hover:scale-[1.01]"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orders Today</p>
          {salesLoading ? (
            <div className="mx-auto mt-1.5 h-4 w-10 animate-pulse rounded bg-secondary" />
          ) : (
            <p className="mt-1 text-sm font-bold text-foreground sm:text-base">{orderCount}</p>
          )}
        </Link>
        <Link
          to="/vendor/ratings"
          className="glass rounded-2xl p-3 text-center shadow-soft transition-transform hover:scale-[1.01]"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</p>
          <p className="mt-1 flex items-center justify-center gap-0.5 text-sm font-bold text-foreground sm:text-base">
            {vendor?.rating != null ? (
              <>
                <Star className="h-3.5 w-3.5 fill-[#FFD66B] text-[#FFD66B]" />
                {Number(vendor.rating).toFixed(1)}
              </>
            ) : (
              "—"
            )}
          </p>
        </Link>
      </section>

      {/* Pending orders carousel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active orders
          </h2>
          {sorted.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {safeIdx + 1}/{sorted.length} · oldest first
            </span>
          )}
        </div>

        {ordersLoading && (
          <div className="h-48 animate-pulse rounded-3xl bg-secondary" />
        )}

        {!ordersLoading && sorted.length === 0 && (
          <div className="glass rounded-3xl p-6 text-center shadow-soft">
            <p className="text-sm font-semibold text-foreground">No active orders</p>
            <p className="text-xs text-muted-foreground">New orders will appear here in real time.</p>
          </div>
        )}

        {!ordersLoading && order && (() => {
          const customer = (order.profiles as { full_name: string } | null)?.full_name ?? "Customer";
          const items = order.order_items as { product_name: string; quantity: number }[];
          const placedAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });
          const status = order.status as OrderStatus;
          const nextStatus = getNextStatus(status, order.method);
          const actionLabel = getActionLabel(status, order.method);

          return (
            <div className="glass rounded-3xl p-4 shadow-elegant">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Order · {order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm font-bold text-foreground">{customer}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                    {status.replace(/_/g, " ")}
                  </span>
                  <p className="mt-1 text-[10px] text-muted-foreground">{placedAgo}</p>
                </div>
              </div>

              <ul className="mt-3 space-y-1 rounded-2xl bg-secondary/40 p-3 text-sm">
                {items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-foreground">
                      <span className="mr-1.5 font-bold text-primary">{it.quantity}×</span>
                      {it.product_name}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {order.method === "delivery" && order.delivery_address
                    ? `Deliver to: ${order.delivery_address}`
                    : "Self pickup"}
                </span>
                <span className="font-bold text-foreground">₦{Number(order.total).toLocaleString()}</span>
              </div>

              <div className="mt-4 flex gap-2">
                {actionLabel && nextStatus && (
                  <button
                    disabled={advancing}
                    onClick={() => advanceStatus({ id: order.id, status: nextStatus })}
                    className="bg-gradient-primary flex-1 rounded-full px-4 py-2.5 text-xs font-bold text-on-primary shadow-soft disabled:opacity-60"
                  >
                    {advancing ? "Updating…" : actionLabel}
                  </button>
                )}
                <button
                  disabled={advancing}
                  onClick={() => advanceStatus({ id: order.id, status: "cancelled" })}
                  className="rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {sorted.length > 1 && (
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => setOrderIdx((i) => (i - 1 + sorted.length) % sorted.length)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <button
                    onClick={() => setOrderIdx((i) => (i + 1) % sorted.length)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* Product catalog preview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Product catalog
          </h2>
          <Link to="/vendor/products" className="text-xs font-semibold text-primary">
            Show all →
          </Link>
        </div>

        {productsLoading && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 w-44 shrink-0 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        )}

        {!productsLoading && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(products ?? []).slice(0, 6).map((p) => (
              <article key={p.id} className="glass w-44 shrink-0 overflow-hidden rounded-2xl shadow-soft">
                <img
                  src={p.image_url ? `${p.image_url}?t=${new Date(p.updated_at).getTime()}` : FALLBACK_PRODUCT}
                  alt={p.name}
                  className="h-24 w-full object-cover"
                />
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ₦{Number(p.price).toLocaleString()} · {p.stock_status?.replace("_", " ") ?? "in stock"}
                  </p>
                  <Link
                    to="/vendor/products"
                    className="mt-2 flex items-center justify-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground"
                  >
                    Edit
                  </Link>
                </div>
              </article>
            ))}
            <Link
              to="/vendor/products"
              className="grid w-44 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-border bg-card/40 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <span className="flex flex-col items-center gap-1 p-6">
                <Plus className="h-5 w-5" /> Add product
              </span>
            </Link>
          </div>
        )}
      </section>

      {/* Storefront setup */}
      <section>
        <Link
          to="/vendor/storefront"
          className="glass flex items-center justify-between rounded-3xl p-4 shadow-soft transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-on-primary">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Edit your storefront</p>
              <p className="text-[11px] text-muted-foreground">Logo, cover image, description</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>

      {/* Settings shortcut */}
      <Link
        to="/vendor/settings"
        className="glass flex items-center justify-between rounded-3xl p-4 shadow-soft"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-foreground">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Account & business settings</p>
            <p className="text-[11px] text-muted-foreground">Edit registration details</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
