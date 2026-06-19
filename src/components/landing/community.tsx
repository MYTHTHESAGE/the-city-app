import community from "@/assets/community-ride.jpg";
import courier from "@/assets/courier.jpg";

const stats = [
  { v: "10k+", l: "Local vendors" },
  { v: "25k+", l: "Verified drivers" },
  { v: "98%", l: "On-time rides" },
  { v: "4.9★", l: "Avg. rating" },
];

export function Community() {
  return (
    <section id="community" className="relative bg-secondary/50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="grid grid-cols-2 gap-4">
            <img src={community} alt="Happy rider" loading="lazy" width={1200} height={1400}
              className="aspect-[3/4] w-full rounded-3xl object-cover shadow-soft" />
            <img src={courier} alt="Local courier" loading="lazy" width={1200} height={1400}
              className="mt-10 aspect-[3/4] w-full rounded-3xl object-cover shadow-soft" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Built with the community</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Powered by the people who make the city move
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Every driver vetted, every vendor verified. We invest in fair pay,
              training and tools — so the value stays where it belongs: in the city.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.l} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <p className="text-2xl font-semibold tracking-tight text-gradient">{s.v}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
