import { createFileRoute } from "@tanstack/react-router";
import { CreditCard as Edit3, Image as ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, inputClass } from "@/components/onboarding/shell";
import { useAuth } from "@/contexts/AuthContext";
import { deleteProduct, fetchAllProductsByVendor, upsertProduct } from "@/lib/queries";
import { uploadProductImage } from "@/lib/storage";

export const Route = createFileRoute("/vendor/products")({
  head: () => ({ meta: [{ title: "Products — The City App" }] }),
  component: Products,
});

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=70";

type ProductForm = {
  id?: string;
  name: string;
  description: string;
  price: string;
  image_url: string;
  stock_status: string;
};

const FOOD_TEMPLATES = [
  {
    name: "Jollof Rice & Chicken",
    description: "Classic party jollof rice served with fried chicken.",
    price: 3000,
    image_url: "https://images.unsplash.com/photo-1664992955581-229046c8230b?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Fried Rice & Beef",
    description: "Delicious fried rice loaded with veggies and fried beef.",
    price: 3000,
    image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Pounded Yam & Egusi",
    description: "Smooth pounded yam with rich egusi soup and assorted meat.",
    price: 4000,
    image_url: "https://images.unsplash.com/photo-1662580796987-9bb82b13edef?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Meat Pie",
    description: "Freshly baked meat pie with minced meat and potato filling.",
    price: 1000,
    image_url: "https://images.unsplash.com/photo-1610332822986-e8dff41fdf79?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Beef Suya",
    description: "Spicy grilled beef skewers garnished with onions.",
    price: 2500,
    image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
  }
];

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  stock_status: "in_stock",
};

function Products() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["all-products", user?.id],
    queryFn: () => fetchAllProductsByVendor(user!.id),
    enabled: !!user,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["all-products", user?.id] });
    qc.invalidateQueries({ queryKey: ["products", user?.id] });
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!user || !editing) throw new Error("Not authenticated.");
      if (!editing.name.trim()) throw new Error("Product name is required.");
      const price = Number(editing.price);
      if (!price || price <= 0) throw new Error("Enter a valid price.");

      let imageUrl = editing.image_url || null;

      // If there's a pending file, upload it now (we need the product id first for new items)
      const productId = await upsertProduct(user.id, {
        id: editing.id,
        name: editing.name.trim(),
        description: editing.description || null,
        price,
        image_url: imageUrl,
        stock_status: editing.stock_status,
      });

      if (pendingFile) {
        setUploading(true);
        const result = await uploadProductImage(user.id, productId, pendingFile);
        setUploading(false);
        if (result.error) {
          toast.warning(`Product saved but image upload failed: ${result.error}`);
        } else {
          imageUrl = result.url;
          await upsertProduct(user.id, {
            id: productId,
            name: editing.name.trim(),
            description: editing.description || null,
            price,
            image_url: imageUrl,
            stock_status: editing.stock_status,
          });
        }
      }

      return productId;
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setImgPreview(null);
      setPendingFile(null);
      toast.success("Product saved.");
    },
    onError: (err: Error) => {
      setUploading(false);
      toast.error(err.message);
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => { invalidate(); toast.success("Product deleted."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const setField = (k: keyof ProductForm, v: string) =>
    setEditing((f) => f ? { ...f, [k]: v } : f);

  const openEdit = (p?: { id: string; name: string; description: string | null; price: number | string; image_url: string | null; stock_status: string | null }) => {
    if (p) {
      setEditing({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        price: String(p.price),
        image_url: p.image_url ?? "",
        stock_status: p.stock_status ?? "in_stock",
      });
      setImgPreview(p.image_url ?? null);
    } else {
      setEditing({ ...EMPTY_FORM });
      setImgPreview(null);
    }
    setPendingFile(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setImgPreview(URL.createObjectURL(file));
    setField("image_url", "");
  };

  const isWorking = saving || uploading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Product catalog
          </h1>
          <p className="text-xs text-muted-foreground">Edit, update or add new items.</p>
        </div>
        <button
          onClick={() => openEdit()}
          className="bg-gradient-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-on-primary shadow-elegant"
        >
          <Plus className="h-3.5 w-3.5" /> New product
        </button>
      </div>

      {/* Quick Add Templates */}
      <div className="mt-2 mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Quick Add Templates
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {FOOD_TEMPLATES.map((t, idx) => (
            <button
              key={idx}
              onClick={() => openEdit({ id: "", name: t.name, description: t.description, price: t.price, image_url: t.image_url, stock_status: "in_stock" })}
              className="glass min-w-[140px] shrink-0 snap-start overflow-hidden rounded-2xl text-left shadow-soft transition-transform hover:scale-[1.02]"
            >
              <img src={t.image_url} alt={t.name} className="h-24 w-full object-cover" />
              <div className="p-2.5">
                <p className="text-[11px] font-bold text-foreground line-clamp-1">{t.name}</p>
                <p className="text-[10px] text-primary mt-1 font-semibold">Add +</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-3xl bg-secondary" />
          ))}
        </div>
      )}

      {!isLoading && (products ?? []).length === 0 && (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No products yet</p>
          <p className="text-xs text-muted-foreground">Add your first product to get started.</p>
        </div>
      )}

      {!isLoading && (products ?? []).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(products ?? []).map((p) => (
            <article key={p.id} className="glass overflow-hidden rounded-3xl shadow-soft">
              <img src={p.image_url ? `${p.image_url}?t=${new Date(p.updated_at).getTime()}` : FALLBACK_IMG} alt={p.name} className="h-32 w-full object-cover" />
              <div className="p-3">
                <p className="text-sm font-bold text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  ₦{Number(p.price).toLocaleString()} · {p.stock_status?.replace("_", " ") ?? "in stock"}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.name}"?`)) remove(p.id);
                    }}
                    className="flex items-center justify-center gap-1 rounded-full bg-emergency/10 px-3 py-1.5 text-[11px] font-semibold text-emergency"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center">
          <div className="glass w-full max-w-md rounded-t-3xl p-5 shadow-elegant sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                {editing.id ? "Edit product" : "New product"}
              </p>
              <button onClick={() => { setEditing(null); setImgPreview(null); setPendingFile(null); }} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="grid gap-3">
              {/* Product image upload */}
              <Field label="Product image">
                <div className="flex items-center gap-3">
                  <div
                    className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-xl border border-border bg-secondary"
                    onClick={() => imgInputRef.current?.click()}
                  >
                    {imgPreview ? (
                      <img src={imgPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground"
                  >
                    <Upload className="h-3 w-3" /> Upload image
                  </button>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Or paste a URL below
                </p>
                <input
                  className={`${inputClass} mt-1`}
                  value={editing.image_url}
                  onChange={(e) => {
                    setField("image_url", e.target.value);
                    if (e.target.value) {
                      setImgPreview(e.target.value);
                      setPendingFile(null);
                    }
                  }}
                  placeholder="https://…"
                />
              </Field>

              <Field label="Name">
                <input className={inputClass} value={editing.name} onChange={(e) => setField("name", e.target.value)} />
              </Field>
              <Field label="Description">
                <textarea
                  className={`${inputClass} min-h-[60px] resize-none`}
                  value={editing.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </Field>
              <Field label="Price (₦)">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={editing.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
              </Field>
              <Field label="Stock status">
                <select className={inputClass} value={editing.stock_status} onChange={(e) => setField("stock_status", e.target.value)}>
                  <option value="in_stock">In stock</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </Field>
            </div>

            <button
              onClick={() => save()}
              disabled={isWorking}
              className="bg-gradient-primary mt-4 w-full rounded-full py-3 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
            >
              {uploading ? "Uploading image…" : saving ? "Saving…" : "Save product"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
