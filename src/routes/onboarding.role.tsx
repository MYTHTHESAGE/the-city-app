import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, ChevronRight, UserRound } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/shell";

export const Route = createFileRoute("/onboarding/role")({
  head: () => ({
    meta: [
      { title: "Choose your role — The City App" },
      {
        name: "description",
        content: "Join The City App as a user or a service provider.",
      },
    ],
  }),
  component: RoleSelect,
});

function RoleCard({
  title,
  description,
  Icon,
  onClick,
}: {
  title: string;
  description: string;
  Icon: typeof UserRound;
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

function RoleSelect() {
  const navigate = useNavigate();
  return (
    <OnboardingShell
      eyebrow="Get started"
      title="How will you use The City App?"
      subtitle="Pick the role that fits you best. You can always add another later."
    >
      <div className="grid gap-4">
        <RoleCard
          title="User"
          description="Move around the city, order food and stay safe."
          Icon={UserRound}
          onClick={() => navigate({ to: "/onboarding/user" })}
        />
        <RoleCard
          title="Service Provider"
          description="Sell, deliver or drive across Redemption City."
          Icon={Briefcase}
          onClick={() => navigate({ to: "/onboarding/provider" })}
        />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/signin" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </OnboardingShell>
  );
}
