import { createFileRoute } from "@tanstack/react-router";
import { Image as ImageIcon, Save, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, FormCard, inputClass } from "@/components/onboarding/shell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchVendorById, updateVendorProfile } from "@/lib/queries";
import { uploadVendorCover, uploadVendorLogo } from "@/lib/storage";

export const Route = createFileRoute("/vendor/storefront")({
  head: () => ({ meta: [{ title: "Storefront setup — The City App" }] }),
  component: Storefront,
});

function Storefront() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: () => fetchVendorById(user!.id),
    enabled: !!user,
    staleTime: 0,
  });

  const [form, setForm] = useState({
    businessName: "",
    tagline: "",
    description: "",
    openingHours: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [synced, setSynced] = useState(false);
  if (!synced && vendor) {
    setForm({
      businessName: vendor.business_name ?? "",
      tagline: (vendor as { tagline?: string }).tagline ?? "",
      description: vendor.description ?? "",
      openingHours: vendor.opening_hours ?? "",
    });
    setSynced(true);
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    const result = await uploadVendorLogo(user.id, file);
    setUploadingLogo(false);
    if (result.error) {
      toast.error(`Logo upload failed: ${result.error}`);
      setLogoPreview(null);
      return;
    }
    await updateVendorProfile(user.id, { logo_url: result.url });
    qc.invalidateQueries({ queryKey: ["vendor", user?.id] });
    qc.invalidateQueries({ queryKey: ["vendors"] });
    toast.success("Logo updated.");
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    const result = await uploadVendorCover(user.id, file);
    setUploadingCover(false);
    if (result.error) {
      toast.error(`Cover upload failed: ${result.error}`);
      setCoverPreview(null);
      return;
    }
    await updateVendorProfile(user.id, { cover_url: result.url });
    qc.invalidateQueries({ queryKey: ["vendor", user?.id] });
    qc.invalidateQueries({ queryKey: ["vendors"] });
    toast.success("Cover image updated.");
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not authenticated.");
      return updateVendorProfile(user.id, {
        business_name: form.businessName || null,
        tagline: form.tagline || null,
        description: form.description || null,
        opening_hours: form.openingHours || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor", user?.id] });
      qc.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Storefront saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logoUrl = logoPreview ?? vendor?.logo_url ?? null;
  const coverUrl = coverPreview ?? vendor?.cover_url ?? null;
  const initials = form.businessName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "V";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Storefront setup
        </h1>
        <p className="text-xs text-muted-foreground">
          Edit how your storefront appears to customers.
        </p>
      </div>

      <FormCard>
        <div className="grid gap-5">
          {/* Logo */}
          <Field label="Business logo">
            <div className="flex items-center gap-4">
              <div className="relative">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-16 w-16 rounded-2xl object-cover shadow-soft"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-on-primary text-xl font-bold">
                    {initials}
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  {uploadingLogo ? "Uploading…" : "Upload logo"}
                </button>
                <p className="text-[10px] text-muted-foreground">PNG, JPG · max 5 MB</p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </Field>

          {/* Cover image */}
          <Field label="Store cover image">
            <div
              className="relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card/40 transition-colors hover:border-primary/50"
              onClick={() => !uploadingCover && coverInputRef.current?.click()}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Cover"
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                  <p className="text-xs">Tap to upload cover image</p>
                  <p className="text-[10px]">Recommended 1200 × 600</p>
                </div>
              )}
              {coverUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition-opacity hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur-sm">
                    <Upload className="h-3 w-3" /> Change cover
                  </span>
                </div>
              )}
              {uploadingCover && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
          </Field>

          <Field label="Business name">
            <input
              className={inputClass}
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
            />
          </Field>
          <Field label="Tagline">
            <input
              className={inputClass}
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="e.g. Fresh homemade meals daily"
            />
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[90px] resize-y`}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label="Opening hours">
            <input
              className={inputClass}
              value={form.openingHours}
              onChange={(e) => set("openingHours", e.target.value)}
              placeholder="e.g. 7:00 AM – 9:00 PM"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => save()}
            disabled={isPending}
            className="bg-gradient-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Saving…" : "Save storefront"}
          </button>
        </div>
      </FormCard>
    </div>
  );
}
