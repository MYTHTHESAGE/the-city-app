import { PhoneCall, ShieldCheck, Users } from "lucide-react";

export function Safety() {
  return (
    <section id="safety" className="relative py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--emergency)]">Safety first</p>
          <h2 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl">
            One tap
            <br />
            Help is on the way
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            The SOS button shares your live location with trusted contacts and verified
            responders. Always-on safety, built into every ride and every order.
          </p>

          <ul className="mt-7 space-y-3 text-sm">
            <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-success" /> Verified drivers & vendors</li>
            <li className="flex items-start gap-3"><Users className="mt-0.5 h-5 w-5 text-primary" /> Trusted contacts auto-notified</li>
            <li className="flex items-start gap-3"><PhoneCall className="mt-0.5 h-5 w-5 text-[var(--emergency)]" /> 24/7 emergency response</li>
          </ul>
        </div>

        {/* SOS card */}
        <div className="relative">
          <div className="glass relative mx-auto w-full max-w-md rounded-3xl p-8 shadow-elegant">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Emergency</p>
                <p className="text-lg font-semibold">Press &amp; hold to alert</p>
              </div>
              <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-semibold text-success">LIVE</span>
            </div>

            <div className="relative mx-auto my-8 grid h-44 w-44 place-items-center">
              <span className="absolute inset-0 rounded-full bg-[var(--emergency)]/25 animate-pulse-ring" />
              <span className="absolute inset-4 rounded-full bg-[var(--emergency)]/30 animate-pulse-ring [animation-delay:.4s]" />
              <button className="relative grid h-32 w-32 place-items-center rounded-full bg-[var(--emergency)] text-emergency-foreground shadow-glow transition-transform active:scale-95">
                <span className="text-xl font-bold tracking-widest">SOS</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
              <div className="rounded-xl bg-secondary/60 py-2"><p className="font-semibold text-foreground">3</p>Contacts</div>
              <div className="rounded-xl bg-secondary/60 py-2"><p className="font-semibold text-foreground">24/7</p>Response</div>
              <div className="rounded-xl bg-secondary/60 py-2"><p className="font-semibold text-foreground">GPS</p>Live</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
