import { MapPinned, Smartphone, Star } from "lucide-react";

const steps = [
  { icon: Smartphone, title: "Open the app", desc: "Sign in once. Your profile, payments and saved places follow you everywhere." },
  { icon: MapPinned, title: "Pick what you need", desc: "Ride, order food, find a vendor, or trigger SOS — all from one home screen." },
  { icon: Star, title: "Enjoy the city", desc: "Track in real time, pay seamlessly, rate trusted partners — and earn rewards." },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative bg-secondary/50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl">
            Three steps
            <br />
            Zero friction
          </h2>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-3xl border border-border bg-card p-7 shadow-soft">
              <span className="absolute -top-3 left-7 rounded-full bg-gradient-primary px-3 py-0.5 text-xs font-semibold text-on-primary">
                Step {i + 1}
              </span>
              <s.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
