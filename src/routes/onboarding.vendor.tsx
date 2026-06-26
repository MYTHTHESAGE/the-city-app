import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
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
import {
  uploadVendorLogo,
  uploadVendorCover,
  uploadVendorGalleryImage,
  uploadProductImage,
} from "@/lib/storage";

export const Route = createFileRoute("/onboarding/vendor")({
  head: () => ({
    meta: [{ title: "Vendor sign-up — The City App" }],
  }),
  component: VendorOnboarding,
});

const STEPS = ["Business info", "Verify", "Storefront", "Products"];

const CATEGORIES: { label: string; value: string }[] = [
  { label: "Food & Drink", value: "food_drink" },
  { label: "Groceries", value: "groceries" },
  { label: "Fashion & Beauty", value: "fashion_beauty" },
  { label: "Electronics", value: "electronics" },
  { label: "Books & Stationery", value: "books_stationery" },
  { label: "Health & Pharmacy", value: "health_pharmacy" },
  { label: "Services", value: "services" },
  { label: "Other", value: "other" },
];

type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  imageFile?: File;
  imagePreview?: string;
};

type StoreFiles = {
  logoFile?: File;
  logoPreview?: string;
  coverFile?: File;
  coverPreview?: string;
  galleryFiles: Array<{ file: File; preview: string }>;
};

function ImagePicker({
  preview,
  onFile,
  label,
  aspect = "square",
}: {
  preview?: string;
  onFile: (file: File, preview: string) => void;
  label: string;
  aspect?: "square" | "wide";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFile(file, reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className={`glass relative grid w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:text-foreground ${
        aspect === "wide" ? "aspect-[16/7]" : "aspect-square"
      }`}
    >
      {preview ? (
        <img src={preview} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1 p-3 text-center text-xs">
          <ImagePlus className="h-5 w-5" />
          {label}
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </button>
  );
}

function VendorOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isEmailVerificationSent, setIsEmailVerificationSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [biz, setBiz] = useState({
    vendorName: "",
    businessName: "",
    category: "",
    businessAddress: "",
    locationInCamp: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [store, setStore] = useState<StoreFiles>({ galleryFiles: [] });
  const [products, setProducts] = useState<Product[]>([
    { id: crypto.randomUUID(), name: "", description: "", price: "" },
  ]);

  const setB = <K extends keyof typeof biz>(k: K, v: (typeof biz)[K]) =>
    setBiz((b) => ({ ...b, [k]: v }));

  const updateProduct = (id: string, patch: Partial<Product>) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addProduct = () =>
    setProducts((ps) => [
      ...ps,
      { id: crypto.randomUUID(), name: "", description: "", price: "" },
    ]);
  const removeProduct = (id: string) =>
    setProducts((ps) => (ps.length > 1 ? ps.filter((p) => p.id !== id) : ps));

  const back = () =>
    step > 0 ? setStep((s) => s - 1) : navigate({ to: "/onboarding/provider" });

  const finish = async () => {
    setSubmitting(true);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: biz.email,
      password: biz.password,
      options: {
        emailRedirectTo: window.location.origin + "/signin",
        data: {
          full_name: biz.vendorName,
          phone: biz.phone,
          role: "vendor",
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
        `pending_profile_vendor_${biz.email.toLowerCase()}`,
        JSON.stringify({
          business_name: biz.businessName,
          category: biz.category,
          business_address: biz.businessAddress || null,
          location_in_camp: biz.locationInCamp || null,
          products: products.filter(p => p.name && p.price).map(p => ({
            name: p.name,
            description: p.description || null,
            price: parseFloat(p.price),
            stock_status: "in_stock",
            is_available: true,
          }))
        })
      );
      setSubmitting(false);
      setIsEmailVerificationSent(biz.email);
      return;
    }

    const { error: vendorError } = await supabase.from("vendor_profiles").insert({
      id: userId,
      business_name: biz.businessName,
      category: biz.category as any,
      business_address: biz.businessAddress || null,
      location_in_camp: biz.locationInCamp || null,
    });

    if (vendorError) {
      toast.error("Account created, but failed to save business info. You can update this in Settings.");
      setSubmitting(false);
      navigate({ to: "/onboarding/complete", search: { role: "vendor" } });
      return;
    }

    // Upload storefront assets (non-blocking — errors shown as warnings)
    if (store.logoFile) {
      const r = await uploadVendorLogo(userId, store.logoFile);
      if (!r.error) {
        await supabase.from("vendor_profiles").update({ logo_url: r.url }).eq("id", userId);
      } else {
        toast.warning("Logo upload failed. You can re-upload it later in Settings.");
      }
    }

    if (store.coverFile) {
      const r = await uploadVendorCover(userId, store.coverFile);
      if (!r.error) {
        await supabase.from("vendor_profiles").update({ cover_url: r.url }).eq("id", userId);
      } else {
        toast.warning("Cover image upload failed. You can re-upload it later in Settings.");
      }
    }

    for (let i = 0; i < store.galleryFiles.length; i++) {
      await uploadVendorGalleryImage(userId, i, store.galleryFiles[i].file);
    }

    // Insert products
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.name || !p.price) continue;

      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert({
          vendor_id: userId,
          name: p.name,
          description: p.description || null,
          price: parseFloat(p.price),
          stock_status: "in_stock",
          is_available: true,
          sort_order: i,
        })
        .select("id")
        .single();

      if (productError || !productData) continue;

      if (p.imageFile) {
        const r = await uploadProductImage(userId, productData.id, p.imageFile);
        if (!r.error) {
          await supabase.from("products").update({ image_url: r.url }).eq("id", productData.id);
        }
      }
    }

    setSubmitting(false);
    navigate({ to: "/onboarding/complete", search: { role: "vendor" } });
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const passwordsMatch =
    biz.password.length >= 6 && biz.password === biz.confirmPassword;

  const stepValid =
    (step === 0 &&
      !!biz.vendorName &&
      !!biz.businessName &&
      !!biz.category &&
      !!biz.email &&
      !!biz.phone &&
      passwordsMatch) ||
    step === 1 ||
    (step === 2 && !!store.logoPreview) ||
    (step === 3 && products.every((p) => p.name && p.price));

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
      title="Set up your storefront"
      subtitle="A few details and your shop is ready for the city."
    >
      <Stepper steps={STEPS} current={step} />
      <FormCard>
        {step === 0 && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <input
                  className={inputClass}
                  placeholder="e.g. Bola Adebayo"
                  value={biz.vendorName}
                  onChange={(e) => setB("vendorName", e.target.value)}
                />
              </Field>
              <Field label="Business name">
                <input
                  className={inputClass}
                  placeholder="e.g. Bola's Kitchen"
                  value={biz.businessName}
                  onChange={(e) => setB("businessName", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Business category">
              <select
                className={inputClass}
                value={biz.category}
                onChange={(e) => setB("category", e.target.value)}
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Business address">
              <input
                className={inputClass}
                placeholder="House/shop number, street, area"
                value={biz.businessAddress}
                onChange={(e) => setB("businessAddress", e.target.value)}
              />
            </Field>
            <Field label="Location within camp">
              <input
                className={inputClass}
                placeholder="e.g. Vendor Plaza, Stall 14"
                value={biz.locationInCamp}
                onChange={(e) => setB("locationInCamp", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email">
                <input
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  placeholder="hello@bola.com"
                  value={biz.email}
                  onChange={(e) => setB("email", e.target.value)}
                />
              </Field>
              <Field label="Contact phone">
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="+234 ..."
                  value={biz.phone}
                  onChange={(e) => setB("phone", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" hint="At least 6 characters.">
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={biz.password}
                  onChange={(e) => setB("password", e.target.value)}
                />
              </Field>
              <Field
                label="Confirm password"
                hint={
                  biz.confirmPassword && biz.password !== biz.confirmPassword
                    ? "Passwords don't match"
                    : undefined
                }
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={biz.confirmPassword}
                  onChange={(e) => setB("confirmPassword", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <OtpStep
            destination={biz.email || biz.phone}
            onBack={back}
            onVerified={next}
          />
        )}

        {step === 2 && (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground/80">
                  Logo <span className="text-emergency">*</span>
                </p>
                <ImagePicker
                  preview={store.logoPreview}
                  onFile={(file, preview) =>
                    setStore((s) => ({ ...s, logoFile: file, logoPreview: preview }))
                  }
                  label="Upload logo"
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground/80">Cover image</p>
                <ImagePicker
                  preview={store.coverPreview}
                  onFile={(file, preview) =>
                    setStore((s) => ({ ...s, coverFile: file, coverPreview: preview }))
                  }
                  label="Upload cover"
                  aspect="wide"
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground/80">Store photos</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {store.galleryFiles.map((g, i) => (
                  <ImagePicker
                    key={i}
                    preview={g.preview}
                    onFile={(file, preview) =>
                      setStore((s) => ({
                        ...s,
                        galleryFiles: s.galleryFiles.map((x, idx) =>
                          idx === i ? { file, preview } : x,
                        ),
                      }))
                    }
                    label="Replace"
                  />
                ))}
                {store.galleryFiles.length < 6 && (
                  <ImagePicker
                    label="Add photo"
                    onFile={(file, preview) =>
                      setStore((s) => ({
                        ...s,
                        galleryFiles: [...s.galleryFiles, { file, preview }],
                      }))
                    }
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            {products.map((p, idx) => (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-secondary/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product {idx + 1}
                  </span>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(p.id)}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                  <ImagePicker
                    preview={p.imagePreview}
                    onFile={(file, preview) =>
                      updateProduct(p.id, { imageFile: file, imagePreview: preview })
                    }
                    label="Photo"
                  />
                  <div className="grid gap-3">
                    <Field label="Name">
                      <input
                        className={inputClass}
                        placeholder="e.g. Jollof rice & chicken"
                        value={p.name}
                        onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <Field label="Description">
                        <input
                          className={inputClass}
                          placeholder="Short description"
                          value={p.description}
                          onChange={(e) =>
                            updateProduct(p.id, { description: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Price (₦)">
                        <input
                          type="number"
                          inputMode="decimal"
                          className={inputClass}
                          placeholder="2500"
                          value={p.price}
                          onChange={(e) =>
                            updateProduct(p.id, { price: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addProduct}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Plus className="h-4 w-4" /> Add another product
            </button>
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
                ? step === STEPS.length - 1
                  ? "Setting up shop…"
                  : "Saving…"
                : step === STEPS.length - 1
                  ? "Open my shop"
                  : "Continue"
            }
          />
        )}
      </FormCard>
    </OnboardingShell>
  );
}
