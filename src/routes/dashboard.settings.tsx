import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Monitor, Moon, Save, Sun } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, FormCard, inputClass } from "@/components/onboarding/shell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserProfile, updateProfile, updateUserProfile } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — The City App" }] }),
  component: Settings,
});

type Tab = "profile" | "contact" | "location" | "health" | "emergency" | "appearance";
type Theme = "light" | "dark" | "system";

const BLOOD_TYPE_LABELS: Record<string, string> = {
  a_pos: "A+", a_neg: "A−",
  b_pos: "B+", b_neg: "B−",
  ab_pos: "AB+", ab_neg: "AB−",
  o_pos: "O+", o_neg: "O−",
  unknown: "Unknown",
};

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
  if (theme === "system") localStorage.removeItem("theme");
  else localStorage.setItem("theme", theme);
}

function Settings() {
  const navigate = useNavigate();
  const { profile, user, signOut, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("profile");
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
    else setTheme("system");
  }, []);

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user,
  });

  // ── Profile tab ──────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ fullName: "", displayName: "" });
  const [profileSynced, setProfileSynced] = useState(false);
  if (!profileSynced && profile) {
    setProfileForm({
      fullName: profile.full_name ?? "",
      displayName: profile.full_name?.split(" ")[0] ?? "",
    });
    setProfileSynced(true);
  }

  // ── Contact tab ──────────────────────────────────────────────────────────
  const [contactForm, setContactForm] = useState({ phone: "" });
  const [contactSynced, setContactSynced] = useState(false);
  if (!contactSynced && profile) {
    setContactForm({ phone: profile.phone ?? "" });
    setContactSynced(true);
  }

  // ── Location tab ─────────────────────────────────────────────────────────
  const [locationForm, setLocationForm] = useState({ locationInCamp: "", residentialAddress: "" });
  const [locationSynced, setLocationSynced] = useState(false);
  if (!locationSynced && userProfile) {
    setLocationForm({
      locationInCamp: userProfile.location_in_camp ?? "",
      residentialAddress: userProfile.residential_address ?? "",
    });
    setLocationSynced(true);
  }

  // ── Health tab ───────────────────────────────────────────────────────────
  const [healthForm, setHealthForm] = useState({ bloodType: "unknown", allergies: "", healthInfo: "" });
  const [healthSynced, setHealthSynced] = useState(false);
  if (!healthSynced && userProfile) {
    setHealthForm({
      bloodType: userProfile.blood_type ?? "unknown",
      allergies: userProfile.allergies ?? "",
      healthInfo: userProfile.health_info ?? "",
    });
    setHealthSynced(true);
  }

  // ── Emergency tab ────────────────────────────────────────────────────────
  const [emergencyForm, setEmergencyForm] = useState({ contactName: "", relationship: "", contactPhone: "" });
  const [emergencySynced, setEmergencySynced] = useState(false);
  if (!emergencySynced && userProfile) {
    setEmergencyForm({
      contactName: userProfile.emergency_contact_name ?? "",
      relationship: userProfile.emergency_contact_rel ?? "",
      contactPhone: userProfile.emergency_contact_phone ?? "",
    });
    setEmergencySynced(true);
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  const invalidateUserProfile = () => qc.invalidateQueries({ queryKey: ["user-profile", user?.id] });

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not authenticated.");
      return updateProfile(user.id, { full_name: profileForm.fullName });
    },
    onSuccess: async () => { await refreshProfile(); toast.success("Profile saved."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: saveContact, isPending: savingContact } = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not authenticated.");
      return updateProfile(user.id, { phone: contactForm.phone });
    },
    onSuccess: async () => { await refreshProfile(); toast.success("Contact information saved."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: saveLocation, isPending: savingLocation } = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not authenticated.");
      return updateUserProfile(user.id, {
        location_in_camp: locationForm.locationInCamp || null,
        residential_address: locationForm.residentialAddress || null,
      });
    },
    onSuccess: () => { invalidateUserProfile(); toast.success("Location saved."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: saveHealth, isPending: savingHealth } = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not authenticated.");
      return updateUserProfile(user.id, {
        blood_type: healthForm.bloodType || null,
        allergies: healthForm.allergies || null,
        health_info: healthForm.healthInfo || null,
      });
    },
    onSuccess: () => { invalidateUserProfile(); toast.success("Health information saved."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: saveEmergency, isPending: savingEmergency } = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not authenticated.");
      return updateUserProfile(user.id, {
        emergency_contact_name: emergencyForm.contactName || null,
        emergency_contact_rel: emergencyForm.relationship || null,
        emergency_contact_phone: emergencyForm.contactPhone || null,
      });
    },
    onSuccess: () => { invalidateUserProfile(); toast.success("Emergency contact saved."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const isPending = savingProfile || savingContact || savingLocation || savingHealth || savingEmergency;

  const handleSave = () => {
    if (tab === "profile") saveProfile();
    else if (tab === "contact") saveContact();
    else if (tab === "location") saveLocation();
    else if (tab === "health") saveHealth();
    else if (tab === "emergency") saveEmergency();
  };

  const logout = async () => {
    await signOut();
    navigate({ to: "/signin" });
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "contact", label: "Contact" },
    { id: "location", label: "Location" },
    { id: "health", label: "Health" },
    { id: "emergency", label: "Emergency" },
    { id: "appearance", label: "Appearance" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground">Edit your account information.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id
                ? "bg-gradient-primary text-on-primary shadow-soft"
                : "border border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FormCard>
        {tab === "profile" && (
          <div className="grid gap-4">
            <Field label="Full name">
              <input
                className={inputClass}
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </Field>
            <Field label="Display name">
              <input
                className={inputClass}
                value={profileForm.displayName}
                onChange={(e) => setProfileForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </Field>
          </div>
        )}

        {tab === "contact" && (
          <div className="grid gap-4">
            <Field label="Email">
              <input
                className={inputClass}
                value={user?.email ?? ""}
                disabled
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={contactForm.phone}
                onChange={(e) => setContactForm({ phone: e.target.value })}
                placeholder="+234…"
              />
            </Field>
          </div>
        )}

        {tab === "location" && (
          <div className="grid gap-4">
            <Field label="Location within camp">
              <input
                className={inputClass}
                value={locationForm.locationInCamp}
                onChange={(e) => setLocationForm((f) => ({ ...f, locationInCamp: e.target.value }))}
                placeholder="e.g. Hostel B, Block 4"
              />
            </Field>
            <Field label="Residential address">
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={locationForm.residentialAddress}
                onChange={(e) => setLocationForm((f) => ({ ...f, residentialAddress: e.target.value }))}
                placeholder="e.g. 12 Faith Avenue, Redemption City"
              />
            </Field>
          </div>
        )}

        {tab === "health" && (
          <div className="grid gap-4">
            <Field label="Blood type">
              <select
                className={inputClass}
                value={healthForm.bloodType}
                onChange={(e) => setHealthForm((f) => ({ ...f, bloodType: e.target.value }))}
              >
                {Object.entries(BLOOD_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Allergies">
              <input
                className={inputClass}
                value={healthForm.allergies}
                onChange={(e) => setHealthForm((f) => ({ ...f, allergies: e.target.value }))}
                placeholder="e.g. Penicillin"
              />
            </Field>
            <Field label="Medical conditions">
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={healthForm.healthInfo}
                onChange={(e) => setHealthForm((f) => ({ ...f, healthInfo: e.target.value }))}
                placeholder="e.g. Asthmatic"
              />
            </Field>
          </div>
        )}

        {tab === "emergency" && (
          <div className="grid gap-4">
            <Field label="Contact name">
              <input
                className={inputClass}
                value={emergencyForm.contactName}
                onChange={(e) => setEmergencyForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="e.g. Tunde Okafor"
              />
            </Field>
            <Field label="Relationship">
              <input
                className={inputClass}
                value={emergencyForm.relationship}
                onChange={(e) => setEmergencyForm((f) => ({ ...f, relationship: e.target.value }))}
                placeholder="e.g. Brother"
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={emergencyForm.contactPhone}
                onChange={(e) => setEmergencyForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+234…"
              />
            </Field>
          </div>
        )}

        {tab === "appearance" && (
          <div className="grid gap-4">
            <p className="text-xs font-medium text-foreground/80">Color theme</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "light", label: "Light", Icon: Sun },
                { id: "dark", label: "Dark", Icon: Moon },
                { id: "system", label: "System", Icon: Monitor },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setTheme(id);
                    applyTheme(id);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-xs font-semibold transition-colors ${
                    theme === id
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Choose how The City App looks to you. System follows your device setting.
            </p>
          </div>
        )}

        {tab !== "appearance" && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="bg-gradient-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </FormCard>

      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emergency/40 bg-emergency/5 px-5 py-3.5 text-sm font-bold text-emergency transition-colors hover:bg-emergency/10"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </div>
  );
}
