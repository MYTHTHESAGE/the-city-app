import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Car, History, Package, Star } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { fetchDriverTripHistory } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/driver/history")({
  beforeLoad: () => requireAuth({ allowedRoles: ["driver", "super_admin"] }),
  head: () => ({ meta: [{ title: "Trip History — The City App" }] }),
  component: DriverHistory,
});

type TripItem = {
  id: string;
  type: "ride" | "delivery";
  customer: string;
  from: string;
  to: string;
  earning: number;
  rating: number;
  timestamp: string;
};

function DriverHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery({
    queryKey: ["driver-history", user?.id],
    queryFn: () => fetchDriverTripHistory(user!.id),
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/driver" })}
          className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Trip History
        </h1>
        <p className="text-xs text-muted-foreground">
          View all your completed rides and deliveries across Redemption City.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center shadow-soft">
          <p className="text-sm font-semibold text-foreground">No completed trips</p>
          <p className="text-xs text-muted-foreground">Your finished trips will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {(history as TripItem[]).map((trip) => {
            const timeLabel = formatDistanceToNow(new Date(trip.timestamp), { addSuffix: true });
            return (
              <li key={trip.id} className="glass rounded-2xl p-4 shadow-soft space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                    {trip.type === "ride" ? (
                      <Car className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Package className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                    )}
                    {trip.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider text-[9px]">
                    Customer
                  </p>
                  <p className="text-sm font-bold text-foreground">{trip.customer}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-t border-b border-border/40">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">From</p>
                    <p className="font-medium text-foreground truncate">{trip.from}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">To</p>
                    <p className="font-medium text-foreground truncate">{trip.to}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Earnings</p>
                    <p className="text-sm font-extrabold text-foreground">₦{trip.earning.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-foreground">{trip.rating.toFixed(1)}</span>
                    <Star className="h-3.5 w-3.5 fill-[#FFD66B] text-[#FFD66B]" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
