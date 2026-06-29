import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleAlert as AlertCircle, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { fetchVendorById, fetchProductsByVendor } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/food/$vendor")({
  head: () => ({ meta: [{ title: "Vendor — The City App" }] }),
  component: VendorStore,
});

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1200&q=70";
const FALLBACK_PRODUCT =
  "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=70";

function VendorStore() {
  const { vendor: vendorId } = Route.useParams();
  const navigate = useNavigate();
  const { vendorId: cartVendorId, items, count, subtotal, setVendor, addItem, removeItem, updateQty } = useCart();

  const { data: vendor, isLoading: vendorLoading, isError: vendorError } = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => fetchVendorById(vendorId),
    staleTime: 120_000,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", vendorId],
    queryFn: () => fetchProductsByVendor(vendorId),
    enabled: !!vendorId,
    staleTime: 60_000,
  });

  const isLoading = vendorLoading || productsLoading;

  const handleAdd = (product: { id: string; name: string; price: number }) => {
    if (cartVendorId && cartVendorId !== vendorId) {
      toast.warning("Cart cleared — switching to a new vendor.");
      setVendor(vendorId);
    } else if (!cartVendorId) {
      setVendor(vendorId);
    }
    addItem({ productId: product.id, productName: product.name, productPrice: product.price, quantity: 1 });
  };

  const getQty = (productId: string) =>
    items.find((i) => i.productId === productId)?.quantity ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-52 animate-pulse rounded-3xl bg-secondary" />
        <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  if (vendorError || !vendor) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-semibold text-foreground">Vendor not found</p>
        <Link to="/dashboard/food" className="text-xs text-primary">Browse vendors</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="overflow-hidden rounded-3xl shadow-elegant">
        <div className="relative h-40 sm:h-52">
          <img src={vendor.cover_url ?? FALLBACK_COVER} alt={vendor.business_name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-3 left-4">
            <h1 className="text-2xl font-bold text-foreground">{vendor.business_name}</h1>
            <p className="flex items-center gap-1 text-xs text-foreground/80">
              {vendor.rating != null && (
                <><Star className="h-3 w-3 fill-[#FFD66B] text-[#FFD66B]" /> {Number(vendor.rating).toFixed(1)} · </>
              )}
              {vendor.opening_hours ?? "15–25 min"}
            </p>
          </div>
        </div>
      </div>

      {vendor.description && (
        <p className="px-1 text-xs text-muted-foreground">{vendor.description}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</h2>
        
        {!vendor.is_open && (
          <div className="mb-4 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-center text-warning shadow-sm">
            <AlertCircle className="mx-auto mb-2 h-6 w-6" />
            <p className="text-sm font-bold">Store is Closed</p>
            <p className="mt-1 text-[11px]">This vendor is not currently accepting new orders. Please check back later.</p>
          </div>
        )}

        {(products ?? []).length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold text-foreground">No items available</p>
            <p className="text-xs text-muted-foreground">Check back later.</p>
          </div>
        )}
        {(products ?? []).map((it) => {
          const qty = getQty(it.id);
          return (
            <div key={it.id} className="glass flex gap-3 rounded-2xl p-3 shadow-soft">
              <img src={it.image_url ? `${it.image_url}?t=${new Date(it.updated_at).getTime()}` : FALLBACK_PRODUCT} alt={it.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <p className="text-sm font-bold text-foreground">{it.name}</p>
                {it.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{it.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <p className="text-sm font-bold text-foreground">₦{Number(it.price).toLocaleString()}</p>
                  {qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => qty === 1 ? removeItem(it.id) : updateQty(it.id, qty - 1)}
                        className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-foreground"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{qty}</span>
                      <button
                        onClick={() => updateQty(it.id, qty + 1)}
                        className="bg-gradient-primary grid h-7 w-7 place-items-center rounded-full text-on-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAdd({ id: it.id, name: it.name, price: Number(it.price) })}
                      disabled={!vendor.is_open}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${vendor.is_open ? 'bg-gradient-primary text-on-primary' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {count > 0 && cartVendorId === vendorId && (
        <div className="fixed inset-x-3 bottom-20 z-30 mx-auto max-w-md sm:bottom-24">
          <button
            onClick={() => navigate({ to: "/dashboard/food/checkout" })}
            className="bg-gradient-primary flex w-full items-center justify-between rounded-full px-5 py-3.5 text-sm font-bold text-on-primary shadow-elegant"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              View cart ({count})
            </span>
            <span>₦{subtotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      <Link to="/dashboard/food" className="block text-center text-xs text-muted-foreground hover:text-foreground">
        ← Back to vendors
      </Link>
    </div>
  );
}
