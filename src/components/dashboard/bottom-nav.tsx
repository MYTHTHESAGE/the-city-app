import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Settings, ShoppingBag, Siren as SirenIcon, Car } from "lucide-react";

/**
 * Bottom tab nav for the user dashboard (mobile-first).
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");

  const items: Array<{ to: string; label: string; Icon: typeof Home; match: string }> = [
    { to: "/dashboard", label: "Home", Icon: Home, match: "/dashboard" },
    { to: "/dashboard/ride", label: "Ride", Icon: Car, match: "/dashboard/ride" },
    { to: "/dashboard/food", label: "Food", Icon: ShoppingBag, match: "/dashboard/food" },
    { to: "/dashboard/emergency", label: "Help", Icon: SirenIcon, match: "/dashboard/emergency" },
    { to: "/dashboard/settings", label: "Settings", Icon: Settings, match: "/dashboard/settings" },
  ];

  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center justify-between rounded-full px-2 py-1.5 shadow-elegant sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
      {items.map(({ to, label, Icon, match }) => {
        const active =
          match === "/dashboard" ? pathname === "/dashboard" : is(match);
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 text-[11px] font-medium transition-colors ${
              active
                ? "bg-gradient-primary text-on-primary shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
