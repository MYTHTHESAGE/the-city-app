import { createFileRoute } from "@tanstack/react-router";
import { LiquidIntro } from "@/components/liquid-intro";
import { CityNav } from "@/components/city-nav";
import { Hero } from "@/components/landing/hero";
import { Services } from "@/components/landing/services";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Safety } from "@/components/landing/safety";
import { Community } from "@/components/landing/community";
import { Testimonials } from "@/components/landing/testimonials";
import { CtaFooter } from "@/components/landing/cta-footer";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The City App — Redemption City in one app" },
      {
        name: "description",
        content:
          "Rides, food, local vendors and 1-tap SOS — The City App brings Redemption City into one beautifully simple app.",
      },
      { property: "og:title", content: "The City App — Redemption City" },
      {
        property: "og:description",
        content: "Move, eat, shop and stay safe across Redemption City.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <CityNav />
      <main>
        <Hero />
        <Reveal variant="open">
          <Services />
        </Reveal>
        <Reveal variant="rise" delay={60}>
          <HowItWorks />
        </Reveal>
        <Reveal variant="tilt">
          <Safety />
        </Reveal>
        <Reveal variant="open">
          <Community />
        </Reveal>
        <Reveal variant="rise">
          <Testimonials />
        </Reveal>
        <Reveal variant="open">
          <CtaFooter />
        </Reveal>
      </main>
    </div>
  );
}

// Re-export so the bundler keeps the intro available for /signup.
export { LiquidIntro };
