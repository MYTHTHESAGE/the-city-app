import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Pencil, Siren } from "lucide-react";

export const Route = createFileRoute("/dashboard/emergency")({
  head: () => ({ meta: [{ title: "Emergency — The City App" }] }),
  component: EmergencyHome,
});

function EmergencyHome() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Emergency centre
        </h1>
        <p className="text-xs text-muted-foreground">
          Keep your info up to date and reach help in one tap.
        </p>
      </div>

      <Link
        to="/dashboard/sos"
        className="bg-sos relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl p-5 shadow-elegant"
      >
        <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" aria-hidden />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wider text-white/85">One-tap SOS</p>
          <p className="mt-1 text-xl font-bold">Send an SOS alert</p>
          <p className="text-xs text-white/85">
            Share your location with responders instantly.
          </p>
        </div>
        <div className="relative grid h-14 w-14 place-items-center rounded-full bg-white/20">
          <Siren className="h-6 w-6" />
        </div>
      </Link>

      <Link
        to="/dashboard/settings"
        className="glass flex items-center justify-between rounded-2xl p-5 shadow-soft transition-all hover:scale-[1.01]"
      >
        <div className="flex items-center gap-3">
          <span className="bg-gradient-primary grid h-12 w-12 place-items-center rounded-2xl text-on-primary">
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Edit info</p>
            <p className="text-xs text-muted-foreground">
              Update profile, health, location and emergency contacts.
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  );
}
