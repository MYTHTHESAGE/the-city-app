const items = [
  { name: "Amaka O.", role: "Lagos", quote: "I order lunch, book a ride home and check on my mum — all without leaving the app. It just works." },
  { name: "Tunde A.", role: "Driver partner", quote: "Steady trips, fair fares, instant payouts. The City App changed how I work." },
  { name: "Mama Ngozi", role: "Vendor", quote: "My little kitchen now serves the whole neighbourhood. Orders never stop." },
  { name: "Chiamaka I.", role: "Abuja", quote: "The SOS button gave my dad peace of mind. That alone made it worth it." },
];

export function Testimonials() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Loved across the city</p>
          <h2 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl">
            Real stories
            <br />
            Real neighbourhoods
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {items.map((t) => (
            <figure key={t.name} className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="text-2xl text-primary">“</div>
              <blockquote className="mt-1 flex-1 text-sm text-foreground/90">{t.quote}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-xs font-semibold text-on-primary">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
