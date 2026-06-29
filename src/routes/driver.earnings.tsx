import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, Landmark, ChevronRight, TrendingUp } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { fetchDriverStats, fetchWallet, fetchWalletTransactions, requestPayout } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

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
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["driver-stats", user?.id],
    queryFn: () => fetchDriverStats(user!.id),
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => fetchWallet(user!.id),
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: () => fetchWalletTransactions(user!.id, 20),
    enabled: !!user,
  });

  const balance = Number(wallet?.balance ?? 0);
  const todayEarnings = stats?.earnings ?? 0;

  const { mutate: doPayout, isPending: requesting } = useMutation({
    mutationFn: async () => {
      if (balance <= 0) throw new Error("No earnings available for payout.");
      return requestPayout(user!.id, balance);
    },
    onSuccess: () => {
      toast.success(`Payout of ₦${balance.toLocaleString()} requested!`);
      qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold text-foreground mt-1">₦{balance.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Ready for payout</p>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="glass rounded-3xl p-5 shadow-elegant space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Transactions
        </h3>
        {!transactions && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse bg-secondary rounded-xl" />)}
          </div>
        )}
        {transactions?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No transactions yet.</p>
        )}
        {transactions && transactions.length > 0 && (
          <div className="divide-y divide-border/60">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{tx.type} <span className="text-[10px] text-muted-foreground lowercase">({tx.status})</span></p>
                  <p className="text-xs text-muted-foreground">{tx.description || "Wallet transaction"}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
                </div>
                <div className={`text-sm font-bold ${tx.type === "deposit" || tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                  {tx.type === "deposit" || tx.type === "credit" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
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
          onClick={() => doPayout()}
          disabled={requesting || balance <= 0}
          className="bg-gradient-primary w-full rounded-full py-3 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
        >
          {requesting ? "Processing Payout..." : `Request Payout (₦${balance.toLocaleString()})`}
        </button>
      </section>
    </div>
  );
}
