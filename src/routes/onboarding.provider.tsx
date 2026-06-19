import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bike, ChevronRight, Store } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/shell";

export const Route = createFileRoute("/onboarding/provider")({
  head: () => ({
    meta: [{ title: "Service provider — The City App" }],
  }),
  component: ProviderSelect,
});

function Card({
  title,
  description,
  Icon,
  onClick,
}: {
  title: string;
  description: string;
  Icon: typeof Store;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass group flex w-full items-center gap-4 rounded-3xl p-5 text-left shadow-soft transition-all hover:scale-[1.01] hover:shadow-elegant sm:p-6"
    >
      <span className="bg-gradient-primary grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-on-primary shadow-elegant">
        <Icon className="h-6 w-6" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground sm:text-lg">
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  );
}

function ProviderSelect() {
  const navigate = useNavigate();
  return (
    <OnboardingShell
      eyebrow="Service provider"
      title="What kind of service do you offer?"
      subtitle="Choose how you'd like to serve the Redemption City community."
    >
      <div className="grid gap-4">
        <Card
          title="Vendor"
          description="Sell food, products or services from your storefront."
          Icon={Store}
          onClick={() => navigate({ to: "/onboarding/vendor" })}
        />
        <Card
          title="Transport & Logistics"
          description="Drive riders or deliver packages across the city."
          Icon={Bike}
          onClick={() => navigate({ to: "/onboarding/transport" })}
        />
      </div>
    </OnboardingShell>
  );
}
