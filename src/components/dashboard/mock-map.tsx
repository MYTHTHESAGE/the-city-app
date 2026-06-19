type Driver = {
  id: string;
  name: string;
  distance: number; // meters
  x: number; // 0-100
  y: number; // 0-100
};

type Props = {
  drivers?: Driver[];
  /** Move all driver pins toward center to imply arrival */
  converging?: boolean;
  /** Override the user pin label */
  userLabel?: string;
  className?: string;
};

/**
 * Lyft / InDrive-style stylised map. SVG-rendered to avoid map API setup.
 * Muted streets, animated user pin, optional driver pins (tricycles).
 */
export function MockMap({ drivers = [], converging, userLabel = "You", className }: Props) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-3xl bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.20_0.02_260)] ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* park / green block */}
        <rect x="0" y="0" width="400" height="400" fill="currentColor" className="text-transparent" />
        <rect x="40" y="240" width="100" height="80" rx="10" className="fill-success/15" />
        <rect x="260" y="60" width="100" height="80" rx="10" className="fill-primary/10" />
        <rect x="60" y="60" width="60" height="60" rx="8" className="fill-foreground/5" />
        <rect x="280" y="240" width="80" height="80" rx="10" className="fill-foreground/5" />

        {/* streets */}
        <g className="stroke-foreground/10" strokeWidth="14" fill="none">
          <path d="M0 100 L400 100" />
          <path d="M0 200 L400 200" />
          <path d="M0 300 L400 300" />
          <path d="M100 0 L100 400" />
          <path d="M200 0 L200 400" />
          <path d="M300 0 L300 400" />
        </g>
        <g className="stroke-background" strokeWidth="2" strokeDasharray="6 6" fill="none">
          <path d="M0 100 L400 100" />
          <path d="M0 200 L400 200" />
          <path d="M0 300 L400 300" />
          <path d="M100 0 L100 400" />
          <path d="M200 0 L200 400" />
          <path d="M300 0 L300 400" />
        </g>

        {/* route highlight */}
        <path
          d="M200 280 C 220 220, 260 200, 300 140"
          className="stroke-primary"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {/* driver pins */}
      {drivers.map((d) => {
        const x = converging ? 50 + (d.x - 50) * 0.25 : d.x;
        const y = converging ? 70 + (d.y - 70) * 0.25 : d.y;
        return (
          <div
            key={d.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-[1200ms] ease-out"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={`${d.name} · ${d.distance}m`}
          >
            <div className="bg-gradient-primary flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-on-primary shadow-elegant">
              <span aria-hidden>🛺</span>
              <span className="hidden sm:inline">{d.name.split(" ")[0]}</span>
            </div>
          </div>
        );
      })}

      {/* user pin */}
      <div
        className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2"
        aria-label={userLabel}
      >
        <span className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-primary/30 animate-pulse-ring" />
        <div className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-elegant ring-4 ring-background">
          <span className="text-xs font-bold">●</span>
        </div>
      </div>
    </div>
  );
}
