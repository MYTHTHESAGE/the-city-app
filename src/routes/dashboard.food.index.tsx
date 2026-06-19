import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleAlert as AlertCircle, ChevronDown, ChevronUp, Clock, History, Search, Star } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserOrders, fetchVendors } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/food/")({
  head: () => ({ meta: [{ title: "Food marketplace — The City App" }] }),
  component: FoodMarketplace,
});

const CATEGORY_OPTIONS = [
  { label: "All", value: null },
  { label: "Food & Drink", value: "food_drink" },
  { label: "Groceries", value: "groceries" },
  { label: "Pharmacy", value: "pharmacy" },
  { label: "Electronics", value: "electronics" },
  { label: "Fashion", value: "fashion" },
  { label: "Stationery", value: "stationery" },
  { label: "Services", value: "services" },
  { label: "Other", value: "other" },
];

const FALLBACK_COVERS = [
  "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=70",
];

function FoodMarketplace() {
  const { user } = useAuth();
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: vendors, isLoading, isError, refetch } = useQuery({
    queryKey: ["vendors"],
    queryFn: fetchVendors,
    staleTime: 60_000,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["user-orders", user?.id],
    queryFn: () => fetchUserOrders(user!.id, 10),
    enabled: !!user && showHistory,
  });

  const filtered = (vendors ?? []).filter((v) => {
    const matchesCat = cat == null || v.category === cat;
    const matchesQ = !q || v.business_name.toLowerCase().includes(q.toLowerCase());
    return matchesCat && matchesQ;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          What are you hungry for?
        </h1>
        <p className="text-xs text-muted-foreground">
          Camp vendors delivering across Redemption City.
        </p>
      </div>

      <div className="glass flex items-center gap-2 rounded-2xl p-2 shadow-soft">
        <Search className="ml-2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vendors or dishes"
          className="w-full bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORY_OPTIONS.map((c) => (
          <button
            key={c.label}
            onClick={() => setCat(c.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              cat === c.value
                ? "bg-gradient-primary text-on-primary shadow-soft"
                : "border border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-3xl bg-secondary" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm font-semibold text-foreground">Failed to load vendors</p>
          <button onClick={() => refetch()} className="text-xs text-primary">Retry</button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No vendors found</p>
          <p className="text-xs text-muted-foreground">
            {q ? "Try a different search term." : "No open vendors right now."}
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((v, idx) => (
            <Link
              key={v.id}
              to="/dashboard/food/$vendor"
              params={{ vendor: v.id }}
              className="glass group overflow-hidden rounded-3xl shadow-soft transition-all hover:scale-[1.01] hover:shadow-elegant"
            >
              <div className="relative h-32 overflow-hidden sm:h-36">
                <img
                  src={v.cover_url ?? FALLBACK_COVERS[idx % FALLBACK_COVERS.length]}
                  alt={v.business_name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {v.rating != null && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-[#FFD66B] text-[#FFD66B]" />
                    {Number(v.rating).toFixed(1)}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-foreground">{v.business_name}</p>
                <p className="text-[11px] text-muted-foreground">{v.location_in_camp ?? "Camp"}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> 15–30 min
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Order history */}
      <section className="glass rounded-2xl shadow-soft">
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex w-full items-center justify-between p-4 text-sm font-semibold text-foreground"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" /> Order history
          </span>
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showHistory && (
          <div className="border-t border-border/60 px-4 pb-4">
            {ordersLoading && (
              <div className="space-y-2 pt-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-secondary" />
                ))}
              </div>
            )}
            {!ordersLoading && (orders ?? []).length === 0 && (
              <p className="pt-3 text-xs text-muted-foreground">No past orders yet.</p>
            )}
            {!ordersLoading && (orders ?? []).length > 0 && (
              <ul className="mt-2 divide-y divide-border/60">
                {(orders ?? []).map((o) => {
                  const vendor = (o.vendor_profiles as { business_name: string } | null)?.business_name ?? "Order";
                  return (
                    <li key={o.id}>
                      <Link
                        to="/dashboard/food/track"
                        search={{ orderId: o.id }}
                        className="flex items-center justify-between py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{vendor}</p>
                          <p className="capitalize text-muted-foreground">
                            {o.status.replace(/_/g, " ")} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <span className="ml-3 shrink-0 font-semibold text-foreground">₦{Number(o.total).toLocaleString()}</span>
                      </Link>
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
