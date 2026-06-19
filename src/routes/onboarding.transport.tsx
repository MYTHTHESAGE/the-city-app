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
