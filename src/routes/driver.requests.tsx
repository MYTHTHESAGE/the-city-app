import { createFileRoute } from "@tanstack/react-router";
import { Car, Package } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { acceptDriverRequest, declineDriverRequest, fetchDriverRequests } from "@/lib/queries";

export const Route = createFileRoute("/driver/requests")({
  head: () => ({ meta: [{ title: "All requests — The City App" }] }),
  component: AllRequests,
});

function AllRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rawRequests, isLoading } = useQuery({
    queryKey: ["driver-requests", user?.id],
    queryFn: () => fetchDriverRequests(user!.id),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  type RawRequest = NonNullable<typeof rawRequests>[number];

  const requests = (rawRequests ?? []).map((r: RawRequest) => {
    if (r.request_type === "ride") {
      const ride = r.ride_requests as {
        id: string;
        pickup_address: string;
        dropoff_address: string;
        fare: number;
        profiles?: { full_name: string } | null;
      } | null;
      return {
        id: r.id,
        linkedId: ride?.id ?? "",
        kind: "ride" as const,
        customer: ride?.profiles?.full_name ?? "Customer",
        from: ride?.pickup_address ?? "—",
        to: ride?.dropoff_address ?? "—",
        fare: Number(ride?.fare ?? 0),
        km: Number(r.distance_m ?? 0) / 1000,
      };
    } else {
      const order = r.orders as {
        id: string;
        delivery_address: string;
        total: number;
        profiles?: { full_name: string } | null;
        vendor_profiles?: { business_name: string; location_in_camp: string } | null;
      } | null;
      return {
        id: r.id,
        linkedId: order?.id ?? "",
        kind: "delivery" as const,
        customer: order?.profiles?.full_name ?? "Customer",
        from: order?.vendor_profiles?.location_in_camp ?? "Vendor",
        to: order?.delivery_address ?? "—",
        fare: Number(order?.total ?? 0),
        km: Number(r.distance_m ?? 0) / 1000,
      };
    }
  });

  const sorted = [...requests].sort((a, b) => a.km - b.km);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["driver-requests", user?.id] });
    qc.invalidateQueries({ queryKey: ["driver-stats", user?.id] });
  };

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: ({ id, linkedId, kind }: { id: string; linkedId: string; kind: "ride" | "delivery" }) =>
      acceptDriverRequest(id, user!.id, kind, linkedId),
    onSuccess: () => { invalidate(); toast.success("Request accepted."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: decline, isPending: declining } = useMutation({
    mutationFn: (id: string) => declineDriverRequest(id),
    onSuccess: () => { invalidate(); toast.success("Request declined."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const busy = accepting || declining;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">All requests</h1>
        <p className="text-xs text-muted-foreground">Sorted by proximity to you.</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No pending requests</p>
          <p className="text-xs text-muted-foreground">New requests will appear here as they come in.</p>
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <li key={r.id} className="glass rounded-2xl p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                  {r.kind === "ride" ? <Car className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                  {r.kind}
                </span>
                <span className="text-[11px] text-muted-foreground">{r.km.toFixed(1)} km</span>
              </div>
              <p className="mt-2 text-sm font-bold text-foreground">{r.customer}</p>
              <p className="text-xs text-muted-foreground">{r.from} → {r.to}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">₦{r.fare.toLocaleString()}</p>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => decline(r.id)}
                    className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold text-foreground disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => accept({ id: r.id, linkedId: r.linkedId, kind: r.kind })}
                    className="bg-gradient-primary rounded-full px-4 py-1.5 text-xs font-bold text-on-primary shadow-soft disabled:opacity-50"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
