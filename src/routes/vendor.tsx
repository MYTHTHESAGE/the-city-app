import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CityLogo } from "@/components/city-logo";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/vendor")({
  beforeLoad: () => requireAuth({ allowedRoles: ["vendor", "super_admin"] }),
  head: () => ({ meta: [{ title: "Vendor — The City App" }] }),
  component: VendorLayout,
});

function VendorLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const isHome = pathname === "/vendor";

  return (
    <div className="relative min-h-screen bg-background pb-12">
      <div className="bg-hero-radial pointer-events-none absolute inset-x-0 top-0 h-[320px] opacity-60" aria-hidden />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-4 pt-5 sm:px-6">
        {isHome ? (
          <Link to="/vendor" className="flex items-center">
            <CityLogo size={22} />
          </Link>
        ) : (
          <button
            onClick={() => router.history.back()}
            className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-0 mx-auto max-w-3xl px-4 pb-4 pt-4 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
