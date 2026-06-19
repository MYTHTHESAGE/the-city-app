import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { OnboardingShell } from "@/components/onboarding/shell";

const searchSchema = z.object({
  role: z.enum(["user", "vendor", "transport"]).catch("user"),
});

export const Route = createFileRoute("/onboarding/complete")({
  head: () => ({
    meta: [{ title: "Welcome — The City App" }],
  }),
  validateSearch: searchSchema,
  component: Complete,
});

const COPY = {
  user: {
    title: "You're all set, welcome to the city.",
    subtitle:
      "Your account is ready. Jump in to book a ride, order from a vendor or call for help.",
    cta: "Go to your dashboard",
  },
  vendor: {
    title: "Your shop is live — let's serve the city.",
    subtitle:
      "We've set up your storefront. Open the vendor dashboard to manage orders and products.",
    cta: "Open vendor dashboard",
  },
  transport: {
    title: "You're approved to drive.",
    subtitle:
      "Switch on availability and start receiving trips across Redemption City.",
    cta: "Open driver dashboard",
  },
} as const;

function Complete() {
  const { role } = Route.useSearch();
  const c = COPY[role as keyof typeof COPY];

  return (
    <OnboardingShell eyebrow="All done" title={c.title} subtitle={c.subtitle} hideHome>
      <div className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center shadow-elegant">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-9 w-9" />
        </span>
        <p className="max-w-sm text-sm text-muted-foreground">
          We're building your dashboard. For now, you can head back home and
          we'll keep your profile saved.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          {role === "vendor" ? (
            <Link
              to="/vendor"
              className="bg-gradient-primary rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant"
            >
              {c.cta}
            </Link>
          ) : role === "transport" ? (
            <Link
              to="/driver"
              className="bg-gradient-primary rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant"
            >
              {c.cta}
            </Link>
          ) : (
            <Link
              to="/dashboard"
              className="bg-gradient-primary rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant"
            >
              {c.cta}
            </Link>
          )}
          <Link
            to="/"
            className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Back to home
          </Link>
        </div>
      </div>
    </OnboardingShell>
  );
}
