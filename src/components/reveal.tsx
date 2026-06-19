import { useEffect, useRef, useState, type ReactNode } from "react";

type Variant = "fade" | "open" | "rise" | "tilt";

const variants: Record<Variant, { hidden: string; shown: string }> = {
  fade: {
    hidden: "opacity-0 translate-y-6",
    shown: "opacity-100 translate-y-0",
  },
  open: {
    // starts as a small "placard", opens up to full
    hidden: "opacity-0 scale-[0.82] translate-y-10 blur-[2px]",
    shown: "opacity-100 scale-100 translate-y-0 blur-0",
  },
  rise: {
    hidden: "opacity-0 translate-y-16",
    shown: "opacity-100 translate-y-0",
  },
  tilt: {
    hidden: "opacity-0 -rotate-1 scale-95 translate-y-10",
    shown: "opacity-100 rotate-0 scale-100 translate-y-0",
  },
};

type Props = {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  /** Once revealed, stay revealed even when scrolled out. Default true. */
  once?: boolean;
};

export function Reveal({
  children,
  variant = "fade",
  delay = 0,
  className,
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  const v = variants[variant];
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] will-change-transform ${
        shown ? v.shown : v.hidden
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
