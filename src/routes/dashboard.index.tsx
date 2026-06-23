import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bike,
  Car,
  Eye,
  EyeOff,
  HeartPulse,
  History,
  MapPin,
  Phone,
  Plus,
  Settings,
  ShoppingBag,
  Siren,
  Sparkles,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWallet, fetchRecentActivity } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [{ title: "Your dashboard — The City App" }],
  }),
  component: DashboardHome,
});

type QuickAction = {
  to: string;
  label: string;
  Icon: typeof Car;
  color: string;
  bg: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { to: "/dashboard/ride", label: "Keke", Icon: Bike, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950" },
  { to: "/dashboard/ride", label: "Car ride", Icon: Car, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950" },
  { to: "/dashboard/food", label: "Food order", Icon: UtensilsCrossed, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950" },
  { to: "/dashboard/food", label: "Market vendors", Icon: Store, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950" },
  { to: "/dashboard/food", label: "Courier", Icon: Truck, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950" },
  { to: "/dashboard/sos", label: "SOS alert", Icon: Siren, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950" },
  { to: "/dashboard/emergency", label: "Medic", Icon: HeartPulse, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950" },
  { to: "/dashboard/emergency", label: "Emergency", Icon: Phone, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950" },
  { to: "/dashboard/ride", label: "Track ride", Icon: MapPin, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950" },
  { to: "/dashboard/food", label: "Order history", Icon: History, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
  { to: "/dashboard/food", label: "Groceries", Icon: ShoppingBag, color: "text-lime-600 dark:text-lime-400", bg: "bg-lime-50 dark:bg-lime-950" },
  { to: "/dashboard/settings", label: "Settings", Icon: Settings, color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type ActivityItem = {
  id: string;
  kind: "ride" | "order" | "sos" | "wallet";
  title: string;
  sub: string;
  amount: string;
  positive: boolean;
  created_at: string;
};

function DashboardHome() {
  const [hidden, setHidden] = useState(false);
  const { profile, user } = useAuth();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => fetchWallet(user!.id),
    enabled: !!user,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["activity", user?.id],
    queryFn: () => fetchRecentActivity(user!.id, 8),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const balance = Number(wallet?.balance ?? 0);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {greeting()}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {firstName}
        </h1>
      </div>

      {/* Wallet Card */}
      <section className="bg-gradient-primary relative overflow-hidden rounded-3xl p-5 text-on-primary shadow-elegant sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl"
          aria-hidden
        />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-on-primary-soft">
            <Sparkles className="h-3.5 w-3.5" />
            City Wallet
          </div>
          <button
            onClick={() => setHidden((h) => !h)}
            className="rounded-full p-1.5 text-on-primary-soft transition-colors hover:bg-white/10"
            aria-label={hidden ? "Show balance" : "Hide balance"}
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="relative mt-4">
          <p className="text-xs text-on-primary-soft">Available balance</p>
          {walletLoading ? (
            <div className="mt-1 h-10 w-36 animate-pulse rounded-xl bg-white/20" />
          ) : (
            <p className="mt-1 text-4xl font-bold tracking-tight">
              {hidden ? "₦ ••••••" : `₦ ${balance.toLocaleString()}`}
            </p>
          )}
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <WalletAction Icon={Plus} label="Deposit" />
          <WalletAction Icon={ArrowUpRight} label="Withdraw" />
          <WalletAction Icon={ArrowDownLeft} label="History" />
        </div>
      </section>

      {/* Quick actions grid */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionTile key={`${action.to}-${action.label}`} {...action} />
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="glass rounded-3xl p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
          <Link to="/dashboard/settings" className="text-xs font-medium text-primary">
            See all
          </Link>
        </div>

        {activityLoading && (
          <div className="mt-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-44 animate-pulse rounded bg-secondary" />
                  <div className="h-2.5 w-28 animate-pulse rounded bg-secondary" />
                </div>
                <div className="h-3.5 w-16 animate-pulse rounded bg-secondary" />
              </div>
            ))}
          </div>
        )}

        {!activityLoading && (!activity || activity.length === 0) && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No activity yet. Make your first ride or order!
          </p>
        )}

        {!activityLoading && activity && activity.length > 0 && (
          <ul className="mt-3 divide-y divide-border/60">
            {(activity as ActivityItem[]).map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const relativeTime = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
  const statusLabel = item.sub.replace(/_/g, " ");

  return (
    <li className="flex items-center justify-between py-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{item.title}</p>
        <p className="text-xs capitalize text-muted-foreground">
          {statusLabel} · {relativeTime}
        </p>
      </div>
      {item.amount && (
        <span className={`ml-3 shrink-0 font-semibold ${item.positive ? "text-success" : "text-foreground"}`}>
          {item.amount}
        </span>
      )}
    </li>
  );
}

function WalletAction({ Icon, label }: { Icon: typeof Plus; label: string }) {
  return (
    <button className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/15 p-3 text-on-primary backdrop-blur-sm transition-colors hover:bg-white/25">
      <Icon className="h-4 w-4" />
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

function QuickActionTile({ to, label, Icon, color, bg }: QuickAction) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center gap-2 rounded-2xl p-2.5 transition-all hover:scale-[1.04] active:scale-95"
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-2xl shadow-soft transition-shadow group-hover:shadow-elegant ${bg}`}
      >
        <Icon className={`h-5 w-5 ${color}`} strokeWidth={2} />
      </span>
      <span className="text-center text-[10px] font-semibold leading-tight text-foreground/80">
        {label}
      </span>
    </Link>
  );
}
