type Props = { className?: string; size?: number };

/**
 * The City App wordmark — text-only logo in Covered By Your Grace, extra bold.
 */
export function CityLogo({ className, size = 22 }: Props) {
  return (
    <span
      className={`inline-flex items-center leading-none tracking-tight text-foreground ${className ?? ""}`}
      style={{
        fontFamily: '"Covered By Your Grace", cursive',
        fontSize: `${size}px`,
        fontWeight: 900,
        WebkitTextStroke: `${Math.max(0.6, size / 30)}px currentColor`,
        letterSpacing: "-0.01em",
      }}
    >
      THE CITY APP
    </span>
  );
}
