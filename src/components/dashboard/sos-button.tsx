import { Link, useRouterState } from "@tanstack/react-router";
import { Siren } from "lucide-react";

/**
 * Floating SOS button — persistent across all dashboard screens.
 * One-tap access to the emergency overlay; matches landing-page emergency styling.
 */
export function SosButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/dashboard/sos") return null;
  return (
    <Link
      to="/dashboard/sos"
      aria-label="Emergency SOS"
      className="bg-sos fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full font-bold shadow-elegant ring-4 ring-background transition-transform hover:scale-110 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
    >
      <span className="absolute inset-0 rounded-full bg-emergency/40 animate-pulse-ring" aria-hidden />
      <span className="relative flex flex-col items-center leading-none">
        <Siren className="h-5 w-5" />
        <span className="mt-0.5 text-[10px] tracking-wider">SOS</span>
      </span>
    </Link>
  );
}
