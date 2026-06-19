import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, FormCard, inputClass } from "@/components/onboarding/shell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDriverProfile, updateDriverProfile, updateProfile } from "@/lib/queries";

export const Route = createFileRoute("/driver/settings")({
  head: () => ({ meta: [{ title: "Driver settings — The City App" }] }),
  component: DriverSettings,
});

const VEHICLE_LABELS: Record<string, string> = {
  motorbike: "Motorbike (Okada)",
  tricycle: "Tricycle (Keke)",
  car: "Car",
  bicycle: "Bicycle",
  van: "Van",
  truck: "Truck",
};

function DriverSettings() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const qc = useQueryClient();

  const { data: driverProfile } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: () => fetchDriverProfile(user!.id),
    enabled: !!user,
  });

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    vehicleType: "",
    licensePlate: "",
    associationId: "",
    permitInfo: "",
    baseLocation: "",
  });

  const [synced, setSynced] = useState(false);
  if (!synced && (profile || driverProfile)) {
    setForm({
      fullName: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      vehicleType: driverProfile?.vehicle_type ?? "",
      licensePlate: driverProfile?.license_plate ?? "",
      associationId: driverProfile?.association_id ?? "",
      permitInfo: driverProfile?.permit_info ?? "",
      baseLocation: driverProfile?.base_location ?? "",
    });
    setSynced(true);
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await updateProfile(user.id, { full_name: form.fullName, phone: form.phone });
      await updateDriverProfile(user.id, {
        vehicle_type: form.vehicleType || null,
        license_plate: form.licensePlate || null,
        association_id: form.associationId || null,
        permit_info: form.permitInfo || null,
        base_location: form.baseLocation || null,
      });
      await refreshProfile();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-profile", user?.id] });
      toast.success("Changes saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logout = async () => {
    await signOut();
    navigate({ to: "/signin" });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Driver settings</h1>
        <p className="text-xs text-muted-foreground">Edit information you provided during registration.</p>
      </div>

      <FormCard>
        <div className="grid gap-4">
          <Field label="Full name">
            <input className={inputClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Vehicle type">
            <select className={inputClass} value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)}>
              <option value="">Select…</option>
              {Object.entries(VEHICLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Plate number">
            <input className={inputClass} value={form.licensePlate} onChange={(e) => set("licensePlate", e.target.value)} />
          </Field>
          <Field label="Association / union ID">
            <input className={inputClass} value={form.associationId} onChange={(e) => set("associationId", e.target.value)} placeholder="e.g. NURTW-12345" />
          </Field>
          <Field label="Driver permit / ID">
            <input className={inputClass} value={form.permitInfo} onChange={(e) => set("permitInfo", e.target.value)} />
          </Field>
          <Field label="Base location">
            <input className={inputClass} value={form.baseLocation} onChange={(e) => set("baseLocation", e.target.value)} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => save()}
            disabled={isPending}
            className="bg-gradient-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </FormCard>

      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emergency/40 bg-emergency/5 px-5 py-3.5 text-sm font-bold text-emergency transition-colors hover:bg-emergency/10"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}
