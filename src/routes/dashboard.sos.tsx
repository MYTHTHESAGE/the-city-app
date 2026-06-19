import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CircleCheck as CheckCircle2,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  History,
  MapPin,
  RefreshCw,
  Shield,
  Siren,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CityMap, EmergencyMarker, UserLocationMarker, ResponderMarker } from "@/components/map/city-map";
import { useAuth } from "@/contexts/AuthContext";
import { useSosAlertTracking } from "@/hooks/use-sos-alert-tracking";
import { parsePostgisPoint, getRoute, type LatLng, RCCG_CAMP } from "@/lib/directions";
import { MapRoutePolyline, ServiceAreaPolygon } from "@/components/map/map-overlays";
import { supabase } from "@/lib/supabase";
import {
  createSosAlert,
  fetchSosAlertById,
  fetchUserSosAlerts,
  invokeBroadcastSos,
} from "@/lib/queries";
import { isPointInPolygon } from "@/lib/directions";

export const Route = createFileRoute("/dashboard/sos")({
  head: () => ({ meta: [{ title: "SOS — The City App" }] }),
  component: SosOverlay,
});

type Stage = "select" | "confirm" | "dispatched";

const SOS_TYPE_LABEL: Record<string, string> = {
  health: "Health emergency",
  security: "Security emergency",
};

const SOS_STATUS_LABEL: Record<string, string> = {
  pending: "Alert received — awaiting dispatch",
  dispatched: "Responder dispatched",
  responder_assigned: "Responder assigned to you",
  responder_enroute: "Responder en route",
  on_scene: "Responder on scene",
  resolved: "Resolved",
  false_alarm: "Marked as false alarm",
  escalated: "Escalated to senior team",
  cancelled: "Cancelled",
};

const ACTIVE_STATUSES = new Set([
  "pending",
  "dispatched",
  "responder_assigned",
  "responder_enroute",
  "on_scene",
  "escalated",
]);

function SosOverlay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("select");
  const [type, setType] = useState<"health" | "security" | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Realtime: update status card when responder acts on the alert
  useSosAlertTracking(activeAlertId);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(RCCG_CAMP),
      );
    } else {
      setCoords(RCCG_CAMP);
    }
  }, []);

  const {
    data: activeAlert,
    refetch: refetchAlert,
  } = useQuery({
    queryKey: ["sos-alert", activeAlertId],
    queryFn: () => fetchSosAlertById(activeAlertId!),
    enabled: !!activeAlertId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !status || ACTIVE_STATUSES.has(status) ? 60_000 : false;
    },
  });

  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
    polyline: string;
  } | null>(null);

  // Realtime subscription for responder location updates
  useEffect(() => {
    const responderId = activeAlert?.responder_profiles?.id;
    if (!responderId || !activeAlertId) return;

    const channel = supabase
      .channel(`responder-location:${responderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "responder_profiles",
          filter: `id=eq.${responderId}`,
        },
        () => {
          refetchAlert();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAlert?.responder_profiles?.id, activeAlertId]);

  // Calculate directions & ETA dynamically
  useEffect(() => {
    if (!activeAlert || !coords) {
      setRouteInfo(null);
      return;
    }

    const victimCoords = coords;
    const responderCoords = parsePostgisPoint(activeAlert.responder_profiles?.current_location);

    if (responderCoords) {
      getRoute(responderCoords, victimCoords, "car")
        .then((res) => setRouteInfo(res))
        .catch((err) => console.error("Failed to get SOS responder route:", err));
    } else {
      setRouteInfo(null);
    }
  }, [activeAlert?.status, activeAlert?.responder_profiles?.current_location, coords]);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["sos-history", user?.id],
    queryFn: () => fetchUserSosAlerts(user!.id, 10),
    enabled: !!user && (stage === "dispatched" || showHistory),
  });

  const { mutate: dispatchAlert, isPending } = useMutation({
    mutationFn: () => {
      if (!user || !type) throw new Error("Not authenticated.");
      if (coords && !isPointInPolygon(coords)) {
        throw new Error("SOS services are only available inside the Redemption City operational boundary.");
      }
      return createSosAlert({
        user_id: user.id,
        sos_type: type,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
    },
    onSuccess: async (alertId) => {
      setActiveAlertId(alertId);
      setStage("dispatched");
      // Fire broadcast-sos asynchronously — failure is non-blocking.
      // Coords fall back to RCCG Camp centre if GPS not available.
      const lat = coords?.lat ?? RCCG_CAMP.lat;
      const lng = coords?.lng ?? RCCG_CAMP.lng;
      try {
        const result = await invokeBroadcastSos({
          sos_alert_id: alertId,
          alert_type: type!,
          latitude: lat,
          longitude: lng,
        });
        if (result.status === "no_responders") {
          toast.warning("No responders nearby. Your alert has been logged — help will be dispatched shortly.");
        }
      } catch {
        // Non-fatal: alert is created and visible to responders via Realtime
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const currentStatus = activeAlert?.status ?? "pending";
  const isTerminal = !ACTIVE_STATUSES.has(currentStatus);
  const isResolved = currentStatus === "resolved";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-5 sm:px-6">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Close
        </button>
        <span className="bg-sos inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold">
          <Siren className="h-3.5 w-3.5" /> EMERGENCY
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
        {stage === "select" && (
          <div className="mx-auto max-w-md space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                What's the emergency?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose the type — we'll send your live location to the right team.
              </p>
            </div>
            <div className="grid gap-3">
              <Choice
                Icon={HeartPulse}
                title="Health emergency"
                sub="Medical incident, accident or injury"
                onClick={() => {
                  setType("health");
                  setStage("confirm");
                }}
              />
              <Choice
                Icon={Shield}
                title="Security emergency"
                sub="Threat, theft or any safety risk"
                onClick={() => {
                  setType("security");
                  setStage("confirm");
                }}
              />
            </div>
            <div className="glass flex items-center gap-2 rounded-2xl p-3 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {coords
                ? `GPS locked · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                : "Capturing GPS…"}
            </div>

            {/* History accordion on select screen */}
            <div className="glass rounded-2xl shadow-soft">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Past alerts
                </span>
                {showHistory ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showHistory && (
                <div className="border-t border-border/60 px-4 pb-4">
                  {historyLoading ? (
                    <p className="pt-3 text-xs text-muted-foreground">Loading…</p>
                  ) : !history || history.length === 0 ? (
                    <p className="pt-3 text-xs text-muted-foreground">No previous alerts.</p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {history.map((a) => (
                        <HistoryRow key={a.id} alert={a} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {stage === "confirm" && (
          <div className="mx-auto max-w-md space-y-5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Confirm to dispatch
            </h1>
            <div className="glass space-y-3 rounded-3xl p-5 shadow-elegant">
              <Detail
                label="Emergency type"
                value={type === "health" ? "Health emergency" : "Security emergency"}
              />
              <Detail
                label="GPS location"
                value={
                  coords
                    ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                    : "Capturing…"
                }
              />
              <Detail
                label="Sending to"
                value={type === "health" ? "Camp medical team" : "Camp security team"}
              />
            </div>
            <button
              onClick={() => dispatchAlert()}
              disabled={isPending}
              className="bg-sos w-full rounded-full px-6 py-4 text-base font-bold shadow-elegant transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              <Siren className="mr-2 inline h-5 w-5" />
              {isPending ? "Sending…" : "Confirm & send alert"}
            </button>
            <button
              onClick={() => setStage("select")}
              className="block w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground"
            >
              Go back
            </button>
          </div>
        )}

        {stage === "dispatched" && (
          <div className="mx-auto max-w-md space-y-4">
            {/* Status card */}
            <div className="glass flex items-center gap-3 rounded-3xl p-4 shadow-elegant">
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                  isResolved
                    ? "bg-success/15 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {isResolved ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Siren className="h-6 w-6 animate-pulse" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {isResolved ? "Alert resolved" : "Alert dispatched"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {SOS_STATUS_LABEL[currentStatus] ?? currentStatus}
                </p>
              </div>
              {!isTerminal && (
                <button
                  onClick={() => refetchAlert()}
                  className="ml-auto shrink-0 rounded-full p-2 hover:bg-secondary"
                  title="Refresh status"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Map — shown while active */}
            {!isTerminal && (
              <div className="h-64 overflow-hidden rounded-3xl">
                <CityMap center={coords ?? undefined} zoom={16} className="h-full w-full rounded-3xl">
                  {coords && <UserLocationMarker position={coords} label="You" />}
                  {coords && (
                    <EmergencyMarker
                      position={coords}
                      label={type === "health" ? "Health emergency" : "Security emergency"}
                      type={type ?? undefined}
                    />
                  )}

                  {/* Geofence boundary polygon */}
                  <ServiceAreaPolygon />

                  {/* Assigned responder marker */}
                  {activeAlert?.responder_profiles && (() => {
                    const respLoc = parsePostgisPoint(activeAlert.responder_profiles.current_location);
                    return respLoc ? (
                      <ResponderMarker
                        position={respLoc}
                        name={activeAlert.responder_profiles.profiles?.full_name ?? "Responder"}
                      />
                    ) : null;
                  })()}

                  {/* Path polyline to victim */}
                  {coords && activeAlert?.responder_profiles && routeInfo && (() => {
                    const respLoc = parsePostgisPoint(activeAlert.responder_profiles.current_location);
                    return respLoc ? (
                      <MapRoutePolyline
                        origin={respLoc}
                        destination={coords}
                        encodedPolyline={routeInfo.polyline}
                      />
                    ) : null;
                  })()}
                </CityMap>
              </div>
            )}

            {/* Live status detail */}
            <div className="glass rounded-2xl p-4 shadow-soft">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Alert details
              </p>
              <div className="mt-2 space-y-1.5">
                <Detail label="Type" value={SOS_TYPE_LABEL[type ?? ""] ?? type ?? "—"} />
                <Detail
                  label="Status"
                  value={SOS_STATUS_LABEL[currentStatus] ?? currentStatus}
                />
                {activeAlert?.responder_profiles && (
                  <Detail
                    label="Responder"
                    value={activeAlert.responder_profiles.profiles?.full_name ?? "Assigned"}
                  />
                )}
                {routeInfo && (
                  <Detail
                    label="Responder ETA"
                    value={`${routeInfo.duration} mins (${routeInfo.distance.toFixed(1)} km away)`}
                  />
                )}
                {activeAlert?.dispatched_at && (
                  <Detail
                    label="Dispatched"
                    value={formatDistanceToNow(new Date(activeAlert.dispatched_at), {
                      addSuffix: true,
                    })}
                  />
                )}
                {activeAlert?.responder_arrived_at && (
                  <Detail
                    label="Responder arrived"
                    value={formatDistanceToNow(new Date(activeAlert.responder_arrived_at), {
                      addSuffix: true,
                    })}
                  />
                )}
                {activeAlert?.resolved_at && (
                  <Detail
                    label="Resolved"
                    value={formatDistanceToNow(new Date(activeAlert.resolved_at), {
                      addSuffix: true,
                    })}
                  />
                )}
              </div>
              {!isTerminal && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Stay where you are if it's safe. Help is on the way.
                </p>
              )}
            </div>

            {/* History */}
            {history && history.length > 0 && (
              <section className="glass rounded-2xl p-4 shadow-soft">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your recent alerts
                </p>
                <ul className="divide-y divide-border/60">
                  {history.map((a) => (
                    <HistoryRow key={a.id} alert={a} />
                  ))}
                </ul>
              </section>
            )}

            <Link
              to="/dashboard"
              className="block rounded-full border border-border bg-card px-5 py-3 text-center text-sm font-semibold text-foreground"
            >
              Back to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  alert,
}: {
  alert: { id: string; type: string; status: string; created_at: string };
}) {
  return (
    <li className="flex items-center justify-between py-2.5 text-xs">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          {SOS_TYPE_LABEL[alert.type] ?? alert.type}
        </p>
        <p className="mt-0.5 text-muted-foreground capitalize">
          {SOS_STATUS_LABEL[alert.status] ?? alert.status}
        </p>
      </div>
      <span className="ml-3 shrink-0 text-muted-foreground">
        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
      </span>
    </li>
  );
}

function Choice({
  Icon,
  title,
  sub,
  onClick,
}: {
  Icon: typeof HeartPulse;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass flex items-center gap-4 rounded-3xl p-5 text-left shadow-soft transition-all hover:scale-[1.01] hover:shadow-elegant"
    >
      <span className="bg-sos grid h-14 w-14 place-items-center rounded-2xl shadow-elegant">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
