import { Apple, ArrowRight, Play } from "lucide-react";

export function CtaFooter() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="bg-hero-radial absolute inset-0" aria-hidden />
      <div className="bg-gradient-primary relative mx-auto max-w-5xl rounded-[2rem] p-10 text-on-primary shadow-elegant md:p-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Your <span className="text-gold">city</span>, in your{" "}
              <span className="text-gold">pocket</span>
            </h2>
            <p className="mt-3 max-w-md text-sm text-on-primary-soft md:text-base">
              Join thousands using The City App every day to move, eat and stay safe.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-semibold text-foreground shadow-soft transition-transform hover:scale-[1.03]">
              <Apple className="h-4 w-4" /> App Store
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-on-primary ring-1 ring-white/30 backdrop-blur transition-transform hover:scale-[1.03]">
              <Play className="h-4 w-4" /> Google Play
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-on-primary ring-1 ring-white/30 transition-transform hover:scale-[1.03]">
              Use on web <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <footer className="mx-auto mt-16 max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold text-foreground"
              style={{ fontFamily: '"Covered By Your Grace", cursive', fontSize: 20 }}
            >
              THE CITY APP
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Become a driver</a>
            <a href="#" className="hover:text-foreground">List your business</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} The City App</p>
        </div>
      </footer>
    </section>
  );
}
