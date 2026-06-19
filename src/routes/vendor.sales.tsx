import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorOrdersRealtime } from "@/hooks/use-vendor-orders-realtime";
import { fetchVendorSalesStats } from "@/lib/queries";

export const Route = createFileRoute("/vendor/sales")({
  head: () => ({ meta: [{ title: "Sales summary — The City App" }] }),
  component: Sales,
});

function Sales() {
  const { user } = useAuth();

  useVendorOrdersRealtime(user?.id);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["vendor-sales", user?.id],
    queryFn: () => fetchVendorSalesStats(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  type OrderItem = { product_name: string; quantity: number; subtotal: number };

  const revenue = (orders ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
  const orderCount = (orders ?? []).length;

  const productMap = new Map<string, { sold: number; revenue: number }>();
  for (const order of orders ?? []) {
    const items = (order.order_items ?? []) as OrderItem[];
    for (const item of items) {
      const prev = productMap.get(item.product_name) ?? { sold: 0, revenue: 0 };
      productMap.set(item.product_name, {
        sold: prev.sold + item.quantity,
        revenue: prev.revenue + Number(item.subtotal ?? 0),
      });
    }
  }

  const top = [...productMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Sales summary
        </h1>
        <p className="text-xs text-muted-foreground">Today's performance at a glance.</p>
      </div>

      <section className="bg-gradient-primary overflow-hidden rounded-3xl p-5 text-on-primary shadow-elegant">
        <p className="text-xs uppercase tracking-wider text-on-primary-soft">Revenue today</p>
        {isLoading ? (
          <p className="mt-1 text-3xl font-bold">—</p>
        ) : (
          <p className="mt-1 text-3xl font-bold">₦{revenue.toLocaleString()}</p>
        )}
        <p className="text-sm text-on-primary-soft">{isLoading ? "…" : `${orderCount} orders fulfilled`}</p>
      </section>

      <section className="glass rounded-3xl p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Top selling products</h2>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        )}

        {!isLoading && top.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No orders yet today.</p>
        )}

        {!isLoading && top.length > 0 && (
          <ul className="divide-y divide-border/60">
            {top.map((p) => (
              <li key={p.name} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.sold} sold</p>
                </div>
                <span className="font-bold text-foreground">₦{p.revenue.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isLoading && top.length > 0 && (
        <section className="glass rounded-3xl p-4 shadow-soft">
          <h2 className="text-sm font-bold text-foreground">Product performance</h2>
          <ul className="mt-2 space-y-3">
            {top.map((p) => {
              const pct = revenue > 0 ? Math.round((p.revenue / revenue) * 100) : 0;
              return (
                <li key={p.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{p.name}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="bg-gradient-primary h-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
