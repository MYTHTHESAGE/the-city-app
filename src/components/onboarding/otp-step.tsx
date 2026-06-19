import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

type Props = {
  /** Identifier shown to the user (email or phone) */
  destination: string;
  onVerified: () => void;
  onBack: () => void;
};

/**
 * 6-digit OTP verification step. Demo: any 6 digits is accepted.
 */
export function OtpStep({ destination, onVerified, onBack }: Props) {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [resentIn, setResentIn] = useState(30);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resentIn <= 0) return;
    const t = setTimeout(() => setResentIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resentIn]);

  const setAt = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setCode((c) => {
      const n = [...c];
      n[i] = digit;
      return n;
    });
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const arr = text.split("");
    setCode((c) => c.map((_, i) => arr[i] ?? ""));
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const submit = () => {
    if (code.join("").length < 6) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    setError(null);
    onVerified();
  };

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <span className="bg-gradient-primary grid h-11 w-11 place-items-center rounded-2xl text-on-primary shadow-elegant">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Verify it's you</p>
          <p className="truncate text-xs text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="text-foreground">{destination || "your contact"}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
        {code.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            className="h-12 w-10 rounded-xl border border-border bg-card text-center text-lg font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 sm:h-14 sm:w-12"
          />
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => resentIn === 0 && setResentIn(30)}
          disabled={resentIn > 0}
          className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed"
        >
          {resentIn > 0 ? `Resend code in ${resentIn}s` : "Resend code"}
        </button>
        <span className="text-muted-foreground">Demo: any 6 digits works</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Back
        </button>
        <button
          type="button"
          onClick={submit}
          className="bg-gradient-primary rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant transition-transform hover:scale-[1.02]"
        >
          Verify & continue
        </button>
      </div>
    </div>
  );
}
