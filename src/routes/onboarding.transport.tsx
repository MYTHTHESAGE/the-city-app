import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Field,
  FormCard,
  OnboardingShell,
  StepNav,
  Stepper,
  inputClass,
} from "@/components/onboarding/shell";
import { OtpStep } from "@/components/onboarding/otp-step";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/onboarding/transport")({
  head: () => ({
    meta: [{ title: "Transport sign-up — The City App" }],
  }),
  component: TransportOnboarding,
});

const STEPS = ["Personal", "Verify", "Vehicle & permits"];

const VEHICLE_TYPES: { label: string; value: string }[] = [
  { label: "Car", value: "car" },
  { label: "Motorbike (Okada)", value: "motorbike" },
  { label: "Tricycle (Keke)", value: "tricycle" },
  { label: "Bicycle", value: "bicycle" },
  { label: "Van", value: "van" },
  { label: "Truck", value: "truck" },
];

function TransportOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isEmailVerificationSent, setIsEmailVerificationSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    residentialAddress: "",
    vehicleType: "",
    licensePlate: "",
    associationId: "",
    permitInfo: "",
  });
  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const back = () =>
    step > 0 ? setStep((s) => s - 1) : navigate({ to: "/onboarding/provider" });

  const finish = async () => {
    setSubmitting(true);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: "driver",
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("already registered")) {
        toast.error("An account with this email already exists. Please sign in.");
      } else {
        toast.error(signUpError.message);
      }
      setSubmitting(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      toast.error("Account creation failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (!authData.session) {
      // Save onboarding data in localStorage to sync after email validation
      localStorage.setItem(
        `pending_profile_driver_${data.email.toLowerCase()}`,
        JSON.stringify({
          vehicle_type: data.vehicleType as any,
          license_plate: data.licensePlate,
          association_id: data.associationId || null,
          permit_info: data.permitInfo || null,
          status: "offline",
        })
      );
      setSubmitting(false);
      setIsEmailVerificationSent(data.email);
      return;
    }

    const { error: driverError } = await supabase.from("driver_profiles").insert({
      id: userId,
      vehicle_type: data.vehicleType as any,
      license_plate: data.licensePlate,
      association_id: data.associationId || null,
      permit_info: data.permitInfo || null,
      status: "offline",
    });

    if (driverError) {
      toast.error("Account created, but failed to save vehicle info. You can update this in Settings.");
    }

    setSubmitting(false);
    navigate({ to: "/onboarding/complete", search: { role: "transport" } });
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const passwordsMatch =
    data.password.length >= 6 && data.password === data.confirmPassword;

  const stepValid =
    (step === 0 &&
      !!data.fullName &&
      !!data.email &&
      !!data.phone &&
      passwordsMatch) ||
    step === 1 ||
    (step === 2 && !!data.vehicleType && !!data.licensePlate);

  if (isEmailVerificationSent) {
    return (
      <OnboardingShell eyebrow="Verify Account" title="Check your email" subtitle="Confirm your registration to continue." hideHome>
        <div className="glass flex flex-col items-center gap-5 rounded-3xl p-8 text-center shadow-elegant">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0l-7.5-4.615a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </span>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Verification email sent</h3>
            <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
              We've sent a verification link to <span className="font-semibold text-foreground">{isEmailVerificationSent}</span>. Please check your inbox and click the link in your email to confirm your account and log in.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2 w-full sm:flex-row justify-center">
            <button
              onClick={() => navigate({ to: "/signin" })}
              className="bg-gradient-primary rounded-full px-6 py-2.5 text-xs font-bold text-on-primary shadow-elegant"
            >
              Go to Sign In
            </button>
            <button
              onClick={() => navigate({ to: "/" })}
              className="rounded-full border border-border bg-card px-6 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Back to Home
            </button>
          </div>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      eyebrow={`Step ${step + 1} of ${STEPS.length}`}
      title="Drive with The City App"
      subtitle="Tell us about you and the vehicle you'll be driving."
    >
      <Stepper steps={STEPS} current={step} />
      <FormCard>
        {step === 0 && (
          <div className="grid gap-4">
            <Field label="Full name">
              <input
                className={inputClass}
                placeholder="e.g. Tunde Adeyemi"
                value={data.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email address">
                <input
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  placeholder="you@example.com"
                  value={data.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Phone number">
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="+234 ..."
                  value={data.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Residential address">
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="House number, street, area, city"
                value={data.residentialAddress}
                onChange={(e) => set("residentialAddress", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" hint="At least 6 characters.">
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={data.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </Field>
              <Field
                label="Confirm password"
                hint={
                  data.confirmPassword && data.password !== data.confirmPassword
                    ? "Passwords don't match"
                    : undefined
                }
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={data.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <OtpStep
            destination={data.phone || data.email}
            onBack={back}
            onVerified={next}
          />
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vehicle type">
                <select
                  className={inputClass}
                  value={data.vehicleType}
                  onChange={(e) => set("vehicleType", e.target.value)}
                >
                  <option value="">Select…</option>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="License plate number">
                <input
                  className={inputClass}
                  placeholder="e.g. LAG-123-XY"
                  value={data.licensePlate}
                  onChange={(e) => set("licensePlate", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Association ID" hint="NURTW / RTEAN / cooperative number (if any).">
              <input
                className={inputClass}
                placeholder="e.g. NURTW-00123"
                value={data.associationId}
                onChange={(e) => set("associationId", e.target.value)}
              />
            </Field>
            <Field label="Permit information" hint="Optional. Any operating permits you hold.">
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Permit type, number, expiry…"
                value={data.permitInfo}
                onChange={(e) => set("permitInfo", e.target.value)}
              />
            </Field>
          </div>
        )}

        {step !== 1 && (
          <StepNav
            onBack={back}
            onNext={next}
            disabled={!stepValid || submitting}
            backLabel={step === 0 ? "Change role" : "Back"}
            nextLabel={
              submitting
                ? "Creating account…"
                : step === STEPS.length - 1
                  ? "Finish"
                  : "Continue"
            }
          />
        )}
      </FormCard>
    </OnboardingShell>
  );
}
