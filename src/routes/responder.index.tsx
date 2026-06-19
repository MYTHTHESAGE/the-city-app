import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, HeartPulse, Megaphone, Shield, Siren, UserCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPendingSosAlerts } from "@/lib/queries";
import type { UserRole } from "@/lib/database.types";

export const Route = createFileRoute("/responder/")({
  head: () => ({ meta: [{ title: "Responder dashboard — The City App" }] }),
  component: ResponderDashboard,
});

type ResponderRole = "medical_responder" | "security_responder" | "super_admin";

function isResponderRole(role: UserRole | null): role is ResponderRole {
  return role === "medical_responder" || role === "security_responder" || role === "super_admin";
}

function ResponderDashboard() {
  const { user, profile, role } = useAuth();
  const responderRole = isResponderRole(role) ? role : null;

  const { data: activeAlerts } = useQuery({
    queryKey: ["sos-alerts", responderRole],
    queryFn: () => fetchPendingSosAlerts(responderRole!),
    enabled: !!responderRole,
    refetchInterval: 60_000,
    staleTime: 0,
  });

  const alertCount = activeAlerts?.length ?? 0;
  const healthCount = activeAlerts?.filter((a) => a.type === "health").length ?? 0;
  const securityCount = activeAlerts?.filter((a) => a.type === "security").length ?? 0;
  const myCount = activeAlerts?.filter((a) => a.responder_id === user?.id).length ?? 0;

  const name = profile?.full_name?.split(" ")[0] ?? "Responder";
  const typeLabel =
    role === "medical_responder"
      ? "Medical"
      : role === "security_responder"
        ? "Security"
        : "All";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Responder dashboard
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
          {name}
        </h1>
        <p className="text-xs text-muted-foreground">{typeLabel} responder</p>
      </div>

      {/* Live counter strip */}
      <div className="grid grid-cols-4 gap-2">
        <CountCard label="Active" value={alertCount} highlight={alertCount > 0} />
        <CountCard label="Mine" value={myCount} highlight={myCount > 0} primary />
        <CountCard label="Health" value={healthCount} />
        <CountCard label="Security" value={securityCount} />
      </div>

      {/* Quick-access to queue */}
      <Link
        to="/responder/alerts"
        className="glass group flex items-center justify-between rounded-3xl p-5 shadow-elegant transition-all hover:scale-[1.01]"
      >
        <div className="flex items-center gap-4">
          <span
            className={`relative grid h-14 w-14 place-items-center rounded-2xl shadow-soft ${
              alertCount > 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Siren className={`h-6 w-6 ${alertCount > 0 ? "animate-pulse" : ""}`} />
            {alertCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Alert queue</p>
            <p className="text-xs text-muted-foreground">
              {alertCount === 0
                ? "No active alerts"
                : `${alertCount} active${myCount > 0 ? ` · ${myCount} yours` : ""}`}
            </p>
          </div>
        </div>
        <span className="text-sm font-bold text-primary">View →</span>
      </Link>

      {/* My assigned alerts callout */}
      {myCount > 0 && (
        <Link
          to="/responder/alerts"
          className="glass flex items-center gap-3 rounded-2xl border border-primary/30 p-4 shadow-soft"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">
              {myCount} alert{myCount !== 1 ? "s" : ""} assigned to you
            </p>
            <p className="text-xs text-muted-foreground">Tap to manage your active responses</p>
          </div>
        </Link>
      )}

      {/* Quick-access tools grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/responder/broadcast"
          className="glass group flex items-center justify-between rounded-3xl p-4 shadow-soft transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-on-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Send Broadcast</p>
              <p className="text-[11px] text-muted-foreground">Emergency advisory</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/responder/directory"
          className="glass group flex items-center justify-between rounded-3xl p-4 shadow-soft transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-foreground">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">User Directory</p>
              <p className="text-[11px] text-muted-foreground">Health info lookup</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Role-specific tip cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <TipCard
          Icon={HeartPulse}
          title="Health alerts"
          body="Medical emergencies, accidents, injuries."
          color="text-rose-600 dark:text-rose-400"
          bg="bg-rose-50 dark:bg-rose-950"
        />
        <TipCard
          Icon={Shield}
          title="Security alerts"
          body="Threats, theft, or any active safety risk."
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-950"
        />
      </div>
    </div>
  );
}

function CountCard({
  label,
  value,
  highlight = false,
  primary = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  primary?: boolean;
}) {
  return (
    <div
      className={`glass rounded-2xl p-3 text-center shadow-soft ${
        primary && highlight
          ? "ring-1 ring-primary/40"
          : highlight
            ? "ring-1 ring-destructive/40"
            : ""
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          primary && highlight
            ? "text-primary"
            : highlight
              ? "text-destructive"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TipCard({
  Icon,
  title,
  body,
  color,
  bg,
}: {
  Icon: typeof HeartPulse;
  title: string;
  body: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="glass flex items-start gap-3 rounded-2xl p-4 shadow-soft">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
