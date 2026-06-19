import { Car, ShoppingBag, Siren, Store } from "lucide-react";

const services = [
  {
    icon: Car,
    title: "Transport",
    desc: "Reliable rides across the city. Bolt-fast, transparent fares.",
    tone: "from-[oklch(0.50_0.20_262)] to-[oklch(0.65_0.18_240)]",
  },
  {
    icon: ShoppingBag,
    title: "Food Delivery",
    desc: "Hot meals from your favourite local restaurants, delivered.",
    tone: "from-[oklch(0.55_0.18_30)] to-[oklch(0.70_0.16_60)]",
  },
  {
    icon: Store,
    title: "Local Businesses",
    desc: "Discover trusted vendors, salons, pharmacies and more.",
    tone: "from-[oklch(0.55_0.14_150)] to-[oklch(0.70_0.14_180)]",
  },
  {
    icon: Siren,
    title: "Emergency",
    desc: "One-tap SOS with live location to trusted contacts and responders.",
    tone: "from-[oklch(0.55_0.24_25)] to-[oklch(0.70_0.20_18)]",
  },
];

export function Services() {
  return (
    <section id="services" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Services</p>
            <h2 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl">
              One tap
              <br />
              The whole city responds
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Designed like Glovo, fast like Bolt, calm like Lyft. Every service is
            built around the same trusted profile and wallet.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <article
              key={s.title}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-elegant"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.tone} text-white shadow-glow`}>
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              <span className="mt-5 inline-flex text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Explore →
              </span>
              <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
