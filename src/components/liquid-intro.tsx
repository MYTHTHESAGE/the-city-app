import { useEffect, useState } from "react";

type Props = { onDone?: () => void };

/**
 * App-launch intro: "THE CITY APP" written in Covered By Your Grace,
 * filling from bottom to top with a liquid color sweep, then fading out.
 */
export function LiquidIntro({ onDone }: Props) {
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2400);
    const t2 = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-700 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      {/* soft atmospheric backdrop */}
      <div className="bg-hero-radial pointer-events-none absolute inset-0 opacity-60" />

      <h1
        className="liquid-text animate-liquid-fill px-4 text-center leading-none"
        style={{
          fontFamily: '"Covered By Your Grace", cursive',
          fontSize: "clamp(3rem, 14vw, 8.5rem)",
        }}
      >
        THE CITY APP
      </h1>
    </div>
  );
}
