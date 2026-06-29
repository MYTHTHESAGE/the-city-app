import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, FormCard, inputClass } from "@/components/onboarding/shell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchVendorById, updateProfile, updateVendorProfile } from "@/lib/queries";

export const Route = createFileRoute("/vendor/settings")({
  head: () => ({ meta: [{ title: "Vendor settings — The City App" }] }),
  component: VendorSettings,
});

const CATEGORY_LABELS: Record<string, string> = {
  food_drink: "Food & Drink",
  groceries: "Groceries",
  pharmacy: "Pharmacy",
  electronics: "Electronics",
  fashion: "Fashion",
  stationery: "Stationery",
  services: "Services",
  other: "Other",
};

function VendorSettings() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const qc = useQueryClient();

  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: () => fetchVendorById(user!.id),
    enabled: !!user,
  });

  const [form, setForm] = useState({
    ownerName: "",
    businessName: "",
    phone: "",
    locationInCamp: "",
    category: "",
    description: "",
    isOpen: true,
  });

  const [synced, setSynced] = useState(false);
  if (!synced && (profile || vendorProfile)) {
    setForm({
      ownerName: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      businessName: vendorProfile?.business_name ?? "",
      locationInCamp: vendorProfile?.location_in_camp ?? "",
      category: vendorProfile?.category ?? "",
      description: vendorProfile?.description ?? "",
      isOpen: vendorProfile?.is_open ?? true,
    });
    setSynced(true);
  }

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await updateProfile(user.id, { full_name: form.ownerName, phone: form.phone });
      await updateVendorProfile(user.id, {
        business_name: form.businessName || null,
        location_in_camp: form.locationInCamp || null,
        category: form.category || null,
        description: form.description || null,
        is_open: form.isOpen,
      });
      await refreshProfile();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor", user?.id] });
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
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Vendor settings
        </h1>
        <p className="text-xs text-muted-foreground">
          Edit information you provided during registration.
        </p>
      </div>

      <FormCard>
        <div className="grid gap-4">
          <Field label="Owner name">
            <input className={inputClass} value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
          </Field>
          <Field label="Business name">
            <input className={inputClass} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Pickup address">
            <input className={inputClass} value={form.locationInCamp} onChange={(e) => set("locationInCamp", e.target.value)} />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select…</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[80px] resize-none`}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          
          <Field label="Store Status">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-bold ${form.isOpen ? "text-success" : "text-muted-foreground"}`}>
                  {form.isOpen ? "Store is Open" : "Store is Closed"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Turn off when you are not accepting orders.</p>
              </div>
              <button
                role="switch"
                aria-checked={form.isOpen}
                onClick={() => set("isOpen", !form.isOpen)}
                className={`relative h-7 w-12 rounded-full transition-colors ${form.isOpen ? "bg-gradient-primary" : "bg-secondary"}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-elegant transition-transform ${
                    form.isOpen ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
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
