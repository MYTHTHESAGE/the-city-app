import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, Landmark, ChevronRight, TrendingUp } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { fetchDriverStats } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/driver/earnings")({
  beforeLoad: () => requireAuth({ allowedRoles: ["driver", "super_admin"] }),
  head: () => ({ meta: [{ title: "My Earnings — The City App" }] }),
  component: DriverEarnings,
});

type DayEarning = {
  day: string;
  amount: number;
};

const WEEKLY_EARNINGS: DayEarning[] = [
  { day: "Mon", amount: 4800 },
  { day: "Tue", amount: 6200 },
  { day: "Wed", amount: 7500 },
  { day: "Thu", amount: 5100 },
  { day: "Fri", amount: 9400 },
  { day: "Sat", amount: 11200 },
  { day: "Sun", amount: 8300 },
];

function DriverEarnings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["driver-stats", user?.id],
    queryFn: () => fetchDriverStats(user!.id),
    enabled: !!user,
  });

  const todayEarnings = stats?.earnings ?? 0;
  const weeklyTotal = WEEKLY_EARNINGS.reduce((s, d) => s + d.amount, 0) + todayEarnings;
  const maxAmount = Math.max(...WEEKLY_EARNINGS.map((d) => d.amount), todayEarnings);

  const handleRequestPayout = () => {
    if (weeklyTotal === 0) {
      toast.error("No earnings available for payout.");
      return;
    }
    setRequesting(true);
    setTimeout(() => {
      setRequesting(false);
      toast.success(`Payout of ₦${weeklyTotal.toLocaleString()} requested! Funds will arrive in your bank account shortly.`);
    }, 1500);
  };

  return (
    <div className="space-y-5">
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
          <Wallet className="h-5 w-5 text-primary" />
          Earnings Analysis
        </h1>
        <p className="text-xs text-muted-foreground">
          Track your daily totals, weekly performance, and request payouts.
        </p>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-5 shadow-soft">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Today's Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">₦{todayEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
            <TrendingUp className="h-3 w-3 text-success animate-pulse" /> Live updates
          </p>
        </div>
        <div className="glass rounded-3xl p-5 shadow-soft">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold text-foreground mt-1">₦{weeklyTotal.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Mon – Sun breakdown</p>
        </div>
      </section>

      {/* Weekly Chart */}
      <section className="glass rounded-3xl p-5 shadow-elegant space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Weekly Performance
        </h3>
        <div className="flex h-40 items-end justify-between gap-1 pt-4 px-2">
          {WEEKLY_EARNINGS.map((d, i) => {
            const pct = maxAmount > 0 ? (d.amount / maxAmount) * 100 : 0;
            return (
              <div key={i} className="flex flex-col items-center flex-1 group">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[9px] font-bold rounded px-1 py-0.5 -mt-6 absolute">
                  ₦{d.amount}
                </span>
                <div className="h-28 w-full flex items-end justify-center">
                  <div
                    className="w-4/5 bg-gradient-primary rounded-t-lg transition-all duration-500 hover:opacity-85"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-2 font-medium">{d.day}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payout Actions */}
      <section className="glass rounded-3xl p-5 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-foreground">
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Bank Account Payout</p>
            <p className="text-[11px] text-muted-foreground">Verified Account · OPay (01******56)</p>
          </div>
        </div>

        <button
          onClick={handleRequestPayout}
          disabled={requesting}
          className="bg-gradient-primary w-full rounded-full py-3 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
        >
          {requesting ? "Processing Payout..." : `Request Payout (₦${weeklyTotal.toLocaleString()})`}
        </button>
      </section>
    </div>
  );
}
