import { Link } from "@tanstack/react-router";

export function CtaFooter() {
  return (
    <section className="relative overflow-hidden pt-10 pb-24">
      <div className="bg-hero-radial absolute inset-0" aria-hidden />

      <footer className="relative z-10 mx-auto max-w-6xl px-6">
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
            <Link to="/signup" className="hover:text-foreground">Become a driver</Link>
            <Link to="/signup" className="hover:text-foreground">List your business</Link>
          </div>
          <p>© {new Date().getFullYear()} The City App</p>
        </div>
      </footer>
    </section>
  );
}
