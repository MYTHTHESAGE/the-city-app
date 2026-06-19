import { Link } from "@tanstack/react-router";
import { CityLogo } from "./city-logo";
import { ThemeToggle } from "./theme-toggle";

export function CityNav() {
  return (
    <header className="fixed inset-x-0 top-3 z-50 mx-auto flex max-w-6xl items-center justify-between px-3 sm:top-4 sm:px-4">
      <div className="glass mx-auto flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 shadow-soft">
        <Link to="/" className="flex items-center gap-2 pl-1">
          <CityLogo size={24} />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#services" className="transition-colors hover:text-foreground">Services</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#safety" className="transition-colors hover:text-foreground">Safety</a>
          <a href="#community" className="transition-colors hover:text-foreground">Community</a>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link
            to="/signin"
            className="hidden rounded-full px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="bg-gradient-primary inline-flex shrink-0 items-center rounded-full px-3.5 py-2 text-xs font-bold text-on-primary shadow-elegant transition-transform hover:scale-[1.03] sm:px-4"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
