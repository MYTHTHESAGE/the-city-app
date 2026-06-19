import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

type ShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Hide the back-to-home link (e.g. on completion screen) */
  hideHome?: boolean;
};

export function OnboardingShell({
  eyebrow,
  title,
  subtitle,
  children,
  hideHome,
}: ShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-hero-radial pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-5 pt-6 sm:px-6">
        <Link
          to="/"
          className="text-foreground"
          style={{ fontFamily: '"Covered By Your Grace", cursive', fontSize: 22 }}
        >
          THE CITY APP
        </Link>
        {!hideHome && (
          <Link
            to="/"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Exit
          </Link>
        )}
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-24 pt-8 sm:px-6 md:pt-12">
        <div className="animate-fade-up">
          {eyebrow && (
            <span className="glass inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-foreground">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-8 animate-fade-up [animation-delay:80ms]">{children}</div>
      </main>
    </div>
  );
}

type StepperProps = {
  steps: string[];
  current: number; // 0-indexed
};

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((label, i) => {
        const state =
          i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors ${
                state === "done"
                  ? "bg-success text-white"
                  : state === "active"
                    ? "bg-gradient-primary text-on-primary shadow-elegant"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={`hidden truncate text-xs sm:inline ${
                state === "active" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="h-px flex-1 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div className="glass rounded-3xl p-5 shadow-elegant sm:p-7">{children}</div>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30";

type NavProps = {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  disabled?: boolean;
};

export function StepNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
  disabled,
}: NavProps) {
  return (
    <div className="mt-7 flex items-center justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="bg-gradient-primary rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {nextLabel}
      </button>
    </div>
  );
}
