import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LiquidIntro } from "@/components/liquid-intro";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — The City App" },
      {
        name: "description",
        content:
          "Create your account to access rides, vendors and safety across Redemption City.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();

  // Safety net in case onDone doesn't fire (e.g. SSR/hydration edge).
  useEffect(() => {
    const t = setTimeout(() => {
      navigate({ to: "/onboarding/role", replace: true });
    }, 3500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <LiquidIntro
        onDone={() => navigate({ to: "/onboarding/role", replace: true })}
      />
    </div>
  );
}
