import { createFileRoute } from "@tanstack/react-router";
import {
  HeartPulse,
  Shield,
  Clock,
  CircleCheck as CheckCircle2,
  Siren,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  assignSosAlert,
  fetchPendingSosAlerts,
  fetchPendingSosAlertsMap,
  fetchResolvedSosAlerts,
  fetchSosStatusHistory,
  updateSosAlertStatus,
  type SosActionStatus,
  updateResponderProfile,
} from "@/lib/queries";
import { CityMap, EmergencyMarker, UserLocationMarker } from "@/components/map/city-map";
import { useUserLocation, resolveCoords } from "@/hooks/use-user-location";
import type { UserRole } from "@/lib/database.types";

export const Route = createFileRoute("/responder/alerts")({
  head: () => ({ meta: [{ title: "Alert queue — The City App" }] }),
  component: AlertQueue,
});

type ResponderRole = "medical_responder" | "security_responder" | "super_admin";

function isResponderRole(role: UserRole | null): role is ResponderRole {
  return (
    role === "medical_responder" ||
    role === "security_responder" ||
    role === "super_admin"
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  dispatched: "Dispatched",
  responder_assigned: "Assigned",
  responder_enroute: "En route",
  on_scene: "On scene",
  resolved: "Resolved",
  false_alarm: "False alarm",
  escalated: "Escalated",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-destructive/10 text-destructive",
  dispatched: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  responder_assigned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  responder_enroute: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  on_scene: "bg-primary/10 text-primary",
  resolved: "bg-success/10 text-success",
  false_alarm: "bg-secondary text-muted-foreground",
  escalated: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-secondary text-muted-foreground",
};

type SosAlert = {
  id: string;
  type: string;
  status: string;
  responder_id: string | null;
  location_address: string | null;
  notes: string | null;
  created_at: string;
  dispatched_at: string | null;
  responder_arrived_at: string | null;
  resolved_at: string | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
    user_profiles: {
      blood_type: string | null;
      allergies: string | null;
      health_info: string | null;
      emergency_contact_name: string | null;
      emergency_contact_phone: string | null;
      emergency_contact_rel: string | null;
    } | null;
  } | null;
};

function AlertQueue() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const responderRole = isResponderRole(role) ? role : null;

  const userLocation = useUserLocation();
  const userCoords = resolveCoords(userLocation);

  // Periodic GPS tracking & broadcasting for active responders
  useEffect(() => {
    if (!responderRole || !user) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn("Geolocation not supported on this device.");
      return;
    }

    let lastLat = 0;
    let lastLng = 0;

    const handleCoordsUpdate = async (lat: number, lng: number) => {
      const diff = Math.abs(lat - lastLat) + Math.abs(lng - lastLng);
      if (diff < 0.00005 && lastLat !== 0) return;

      lastLat = lat;
      lastLng = lng;

      try {
        await updateResponderProfile(user.id, {
          current_location: `POINT(${lng} ${lat})`
        });
      } catch (err) {
        console.error("Failed to broadcast responder location:", err);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        handleCoordsUpdate(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error("Responder GPS watch error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [responderRole, user?.id]);

  const { data: alertsMap } = useQuery({
    queryKey: ["sos-alerts-map", responderRole],
    queryFn: fetchPendingSosAlertsMap,
    enabled: !!responderRole,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const { data: active, isLoading } = useQuery({
    queryKey: ["sos-alerts", responderRole],
    queryFn: () => fetchPendingSosAlerts(responderRole!),
    enabled: !!responderRole,
    refetchInterval: 60_000,
    staleTime: 0,
  });

  const { data: resolved } = useQuery({
    queryKey: ["sos-resolved", responderRole],
    queryFn: () => fetchResolvedSosAlerts(responderRole!),
    enabled: !!responderRole,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sos-alerts", responderRole] });
    qc.invalidateQueries({ queryKey: ["sos-resolved", responderRole] });
  };

  const { mutate: doAssign, isPending: assigning } = useMutation({
    mutationFn: (alertId: string) => {
      if (!user) throw new Error("Not authenticated.");
      return assignSosAlert(alertId, user.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Alert accepted — you are now assigned.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: updateStatus, isPending: updating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SosActionStatus }) =>
      updateSosAlertStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success("Alert updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const alerts = (active ?? []) as SosAlert[];
  const myAlerts = alerts.filter((a) => a.responder_id === user?.id);
  const unassigned = alerts.filter((a) => !a.responder_id);
  const otherAssigned = alerts.filter(
    (a) => a.responder_id && a.responder_id !== user?.id,
  );

  const busy = assigning || updating;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Alert queue
        </h1>
        <p className="text-xs text-muted-foreground">
          {alerts.length === 0
            ? "No active alerts."
            : `${alerts.length} active · ${myAlerts.length} assigned to you`}
        </p>
      </div>

      {/* Overview map */}
      <div className="h-52 sm:h-64">
        <CityMap center={userCoords} zoom={15} className="h-full w-full rounded-3xl">
          <UserLocationMarker position={userCoords} label="You" />
          {(alertsMap ?? []).map((a) => (
            <EmergencyMarker
              key={a.alert_id}
              position={{ lat: a.lat, lng: a.lng }}
              type={a.alert_type as "health" | "security"}
            />
          ))}
        </CityMap>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      )}

      {/* ── My assigned alerts ── */}
      {myAlerts.length > 0 && (
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <UserCheck className="h-3.5 w-3.5" /> Assigned to you
          </p>
          <ul className="space-y-3">
            {myAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                isOwn
                onUpdate={(status) => updateStatus({ id: alert.id, status })}
                disabled={busy}
              />
            ))}
          </ul>
        </section>
      )}

      {/* ── Unassigned pool ── */}
      {unassigned.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Unassigned
          </p>
          <ul className="space-y-3">
            {unassigned.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                isOwn={false}
                onAccept={() => doAssign(alert.id)}
                disabled={busy}
              />
            ))}
          </ul>
        </section>
      )}

      {/* ── Taken by other responders ── */}
      {otherAssigned.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Handled by others
          </p>
          <ul className="space-y-2">
            {otherAssigned.map((alert) => (
              <li
                key={alert.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-xs opacity-60"
              >
                <div className="flex items-center gap-2">
                  {alert.type === "health" ? (
                    <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className="font-medium text-foreground">
                    {alert.profiles?.full_name ?? "Resident"}
                  </span>
                  <span className="text-muted-foreground">
                    · {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[alert.status] ?? ""}`}
                >
                  {STATUS_LABEL[alert.status] ?? alert.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── All clear ── */}
      {!isLoading && alerts.length === 0 && (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl p-8 text-center shadow-soft">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-sm font-semibold text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground">
            New alerts appear here the moment they are sent.
          </p>
        </div>
      )}

      {/* ── Resolved history ── */}
      {resolved && resolved.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Resolved
          </p>
          <ul className="space-y-2">
            {(resolved as unknown as SosAlert[]).map((alert) => (
              <li
                key={alert.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  {alert.type === "health" ? (
                    <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className="font-medium text-foreground">
                    {alert.profiles?.full_name ?? "Resident"}
                  </span>
                  <span className="text-muted-foreground">
                    · {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[alert.status] ?? "bg-secondary text-foreground"}`}
                >
                  {STATUS_LABEL[alert.status] ?? alert.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  isOwn,
  onAccept,
  onUpdate,
  disabled,
}: {
  alert: SosAlert;
  isOwn: boolean;
  onAccept?: () => void;
  onUpdate?: (status: SosActionStatus) => void;
  disabled: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const isHealth = alert.type === "health";

  const { data: history } = useQuery({
    queryKey: ["sos-history", alert.id],
    queryFn: () => fetchSosStatusHistory(alert.id),
    enabled: showHistory,
    staleTime: 0,
  });

  return (
    <li className="glass overflow-hidden rounded-3xl shadow-elegant">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-2 ${
          isHealth ? "bg-rose-500/10" : "bg-amber-500/10"
        }`}
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          {isHealth ? (
            <HeartPulse className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          ) : (
            <Shield className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          )}
          {isHealth ? "Health emergency" : "Security emergency"}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[alert.status] ?? "bg-secondary text-foreground"}`}
        >
          {STATUS_LABEL[alert.status] ?? alert.status}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {/* Resident info */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">
              {alert.profiles?.full_name ?? "Resident"}
            </p>
            {alert.profiles?.phone && (
              <a
                href={`tel:${alert.profiles.phone}`}
                className="text-xs text-primary hover:underline"
              >
                {alert.profiles.phone}
              </a>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
          </div>
        </div>

        {alert.location_address && (
          <p className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-foreground">
            {alert.location_address}
          </p>
        )}

        {alert.notes && (
          <p className="text-xs italic text-muted-foreground">"{alert.notes}"</p>
        )}

        {alert.profiles?.user_profiles && (
          <div className="rounded-2xl border border-rose-200/50 bg-rose-50/10 p-3.5 space-y-2 text-xs dark:border-rose-950/30 dark:bg-rose-950/10">
            <h4 className="font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-wider text-[10px]">
              Health Profile & Emergency Contacts
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Blood Type</p>
                <p className="font-semibold text-foreground">
                  {alert.profiles.user_profiles.blood_type?.replace("_pos", "+").replace("_neg", "−").replace("unknown", "Unknown").toUpperCase() ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Allergies</p>
                <p className="font-semibold text-foreground truncate" title={alert.profiles.user_profiles.allergies ?? "None"}>
                  {alert.profiles.user_profiles.allergies || "None"}
                </p>
              </div>
            </div>
            {alert.profiles.user_profiles.health_info && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Medical Conditions</p>
                <p className="font-medium text-foreground">{alert.profiles.user_profiles.health_info}</p>
              </div>
            )}
            {(alert.profiles.user_profiles.emergency_contact_name || alert.profiles.user_profiles.emergency_contact_phone) && (
              <div className="pt-1.5 border-t border-rose-200/30 dark:border-rose-950/20">
                <p className="text-[10px] text-muted-foreground uppercase">Emergency Contact</p>
                <p className="font-semibold text-foreground">
                  {alert.profiles.user_profiles.emergency_contact_name || "Contact"}
                  {alert.profiles.user_profiles.emergency_contact_rel ? ` (${alert.profiles.user_profiles.emergency_contact_rel})` : ""}
                </p>
                {alert.profiles.user_profiles.emergency_contact_phone && (
                  <a href={`tel:${alert.profiles.user_profiles.emergency_contact_phone}`} className="text-primary hover:underline font-medium">
                    {alert.profiles.user_profiles.emergency_contact_phone}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Accept — only shown for unassigned alerts */}
          {!isOwn && onAccept && (
            <button
              disabled={disabled}
              onClick={onAccept}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-soft disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" /> Accept
            </button>
          )}

          {/* Own alert progression */}
          {isOwn && onUpdate && (
            <>
              {alert.status === "responder_assigned" && (
                <button
                  disabled={disabled}
                  onClick={() => onUpdate("responder_enroute")}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-soft disabled:opacity-50"
                >
                  En route
                </button>
              )}
              {alert.status === "responder_enroute" && (
                <button
                  disabled={disabled}
                  onClick={() => onUpdate("on_scene")}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-soft disabled:opacity-50"
                >
                  On scene
                </button>
              )}
              {(alert.status === "responder_assigned" ||
                alert.status === "responder_enroute" ||
                alert.status === "on_scene") && (
                <>
                  <button
                    disabled={disabled}
                    onClick={() => onUpdate("resolved")}
                    className="flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-xs font-bold text-white shadow-soft disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                  </button>
                  <button
                    disabled={disabled}
                    onClick={() => onUpdate("escalated")}
                    className="rounded-full border border-orange-400 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300 disabled:opacity-50"
                  >
                    Escalate
                  </button>
                </>
              )}
            </>
          )}

          {/* False alarm — only for unassigned pending */}
          {!isOwn && alert.status === "pending" && onAccept && (
            <button
              disabled={disabled}
              onClick={() => onUpdate?.("false_alarm")}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
            >
              False alarm
            </button>
          )}
        </div>

        {/* Status timeline toggle */}
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {showHistory ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          Status timeline
        </button>

        {showHistory && (
          <ul className="mt-1 space-y-1.5 border-l-2 border-border pl-3">
            {!history || history.length === 0 ? (
              <li className="text-xs text-muted-foreground">No history yet.</li>
            ) : (
              history.map((h) => (
                <li key={h.id} className="text-xs text-muted-foreground">
                  <span
                    className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${STATUS_COLOR[h.status] ?? "bg-secondary text-foreground"}`}
                  >
                    {STATUS_LABEL[h.status] ?? h.status}
                  </span>
                  {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </li>
  );
}
