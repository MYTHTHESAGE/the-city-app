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

export const Route = createFileRoute("/onboarding/user")({
  head: () => ({
    meta: [{ title: "User sign-up — The City App" }],
  }),
  component: UserOnboarding,
});

const STEPS = ["Personal", "Location", "Verify", "Health & emergency"];

const BLOOD_TYPES: { label: string; value: string }[] = [
  { label: "A+", value: "a_pos" },
  { label: "A-", value: "a_neg" },
  { label: "B+", value: "b_pos" },
  { label: "B-", value: "b_neg" },
  { label: "AB+", value: "ab_pos" },
  { label: "AB-", value: "ab_neg" },
  { label: "O+", value: "o_pos" },
  { label: "O-", value: "o_neg" },
  { label: "Unknown", value: "unknown" },
];

function UserOnboarding() {
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
    locationInCamp: "",
    residentialAddress: "",
    bloodType: "",
    allergies: "",
    healthInfo: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
  });

  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const finish = async () => {
    setSubmitting(true);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: "user",
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
        `pending_profile_user_${data.email.toLowerCase()}`,
        JSON.stringify({
          location_in_camp: data.locationInCamp || null,
          residential_address: data.residentialAddress || null,
          blood_type: data.bloodType || "unknown",
          allergies: data.allergies || null,
          health_info: data.healthInfo || null,
          emergency_contact_name: data.emergencyName || null,
          emergency_contact_phone: data.emergencyPhone || null,
          emergency_contact_rel: data.emergencyRelation || null,
        })
      );
      setSubmitting(false);
      setIsEmailVerificationSent(data.email);
      return;
    }

    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: userId,
      location_in_camp: data.locationInCamp || null,
      residential_address: data.residentialAddress || null,
      blood_type: (data.bloodType || "unknown") as "unknown",
      allergies: data.allergies || null,
      health_info: data.healthInfo || null,
      emergency_contact_name: data.emergencyName || null,
      emergency_contact_phone: data.emergencyPhone || null,
      emergency_contact_rel: data.emergencyRelation || null,
    });

    if (profileError) {
      toast.error("Account created, but failed to save health info. You can update this in Settings.");
    }

    setSubmitting(false);
    navigate({ to: "/onboarding/complete", search: { role: "user" } });
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };
  const back = () =>
    step > 0 ? setStep((s) => s - 1) : navigate({ to: "/onboarding/role" });

  const passwordsMatch =
    data.password.length >= 6 && data.password === data.confirmPassword;

  const stepValid =
    (step === 0 &&
      !!data.fullName &&
      !!data.email &&
      !!data.phone &&
      passwordsMatch) ||
    (step === 1 && !!data.locationInCamp) ||
    step === 2 ||
    (step === 3 && !!data.emergencyName && !!data.emergencyPhone);

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
      title="Tell us about you"
      subtitle="A few quick details so we can keep you safe and connected."
    >
      <Stepper steps={STEPS} current={step} />
      <FormCard>
        {step === 0 && (
          <div className="grid gap-4">
            <Field label="Full name">
              <input
                className={inputClass}
                placeholder="e.g. Ada Okafor"
                value={data.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </Field>
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
          <div className="grid gap-4">
            <Field
              label="Location within camp"
              hint="The auditorium, hostel or block where you usually stay."
            >
              <input
                className={inputClass}
                placeholder="e.g. Hostel B, Auditorium 1"
                value={data.locationInCamp}
                onChange={(e) => set("locationInCamp", e.target.value)}
              />
            </Field>
            <Field
              label="Residential address"
              hint="For guests and non-residents (optional for residents)."
            >
              <textarea
                className={`${inputClass} min-h-[88px] resize-y`}
                placeholder="House number, street, area, city"
                value={data.residentialAddress}
                onChange={(e) => set("residentialAddress", e.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <OtpStep
            destination={data.phone || data.email}
            onBack={back}
            onVerified={next}
          />
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Blood type">
                <select
                  className={inputClass}
                  value={data.bloodType}
                  onChange={(e) => set("bloodType", e.target.value)}
                >
                  <option value="">Select…</option>
                  {BLOOD_TYPES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Allergies">
                <input
                  className={inputClass}
                  placeholder="e.g. Peanuts, penicillin"
                  value={data.allergies}
                  onChange={(e) => set("allergies", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Other health information" hint="Conditions we should know in an emergency.">
              <textarea
                className={`${inputClass} min-h-[72px] resize-y`}
                placeholder="e.g. Asthmatic, diabetic"
                value={data.healthInfo}
                onChange={(e) => set("healthInfo", e.target.value)}
              />
            </Field>
            <div className="mt-2 rounded-2xl border border-border bg-secondary/40 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Emergency contact
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    className={inputClass}
                    placeholder="e.g. Tunde Okafor"
                    value={data.emergencyName}
                    onChange={(e) => set("emergencyName", e.target.value)}
                  />
                </Field>
                <Field label="Relationship">
                  <input
                    className={inputClass}
                    placeholder="e.g. Brother"
                    value={data.emergencyRelation}
                    onChange={(e) => set("emergencyRelation", e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Phone number">
                    <input
                      type="tel"
                      className={inputClass}
                      placeholder="+234 ..."
                      value={data.emergencyPhone}
                      onChange={(e) => set("emergencyPhone", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        )}

        {step !== 2 && (
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
