import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bike, MapPin, Minus, Plus, ShoppingBag, User } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { createOrder, fetchUserProfile, fetchWallet } from "@/lib/queries";
import { useUserLocation, resolveCoords } from "@/hooks/use-user-location";
import { isPointInPolygon } from "@/lib/directions";

export const Route = createFileRoute("/dashboard/food/checkout")({
  head: () => ({ meta: [{ title: "Checkout — The City App" }] }),
  component: Checkout,
});

const DELIVERY_FEE = 350;

function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vendorId, items, subtotal, clearCart, updateQty, removeItem } = useCart();
  const userLocation = useUserLocation();
  const userCoords = resolveCoords(userLocation);

  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [pay, setPay] = useState<"wallet" | "cash">("wallet");
  const [address, setAddress] = useState("");

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => fetchWallet(user!.id),
    enabled: !!user,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user,
    select: (d) => d?.location_in_camp ?? "",
  });

  const deliveryFee = method === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;
  const walletBalance = Number(wallet?.balance ?? 0);
  const insufficientWallet = pay === "wallet" && walletBalance < total;

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () => {
      if (!user || !vendorId) throw new Error("Cart is empty.");
      if (items.length === 0) throw new Error("Cart is empty.");
      if (method === "delivery") {
        if (!isPointInPolygon(userCoords)) {
          throw new Error("Food delivery is only available inside the Redemption City operational boundary.");
        }
        if (!address.trim() && !userProfile) {
          throw new Error("Enter a delivery address.");
        }
      }
      if (insufficientWallet) throw new Error("Insufficient wallet balance.");

      return createOrder({
        user_id: user.id,
        vendor_id: vendorId,
        status: "pending",
        method,
        delivery_address: method === "delivery" ? (address.trim() || userProfile || null) : null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: pay,
        items: items.map((i) => ({
          product_id: i.productId,
          product_name: i.productName,
          product_price: i.productPrice,
          quantity: i.quantity,
          subtotal: i.productPrice * i.quantity,
        })),
      });
    },
    onSuccess: (orderId) => {
      clearCart();
      navigate({ to: "/dashboard/food/track", search: { orderId } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-12 text-center">
        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Your cart is empty</p>
        <button onClick={() => navigate({ to: "/dashboard/food" })} className="text-xs text-primary">
          Browse vendors
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Checkout</h1>
        <p className="text-xs text-muted-foreground">Review and confirm your order.</p>
      </div>

      <section className="glass rounded-2xl p-4 shadow-soft">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your order</h2>
        <ul className="mt-2 divide-y divide-border/60">
          {items.map((i) => (
            <li key={i.productId} className="flex items-center justify-between py-2.5 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => i.quantity === 1 ? removeItem(i.productId) : updateQty(i.productId, i.quantity - 1)}
                    className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-foreground"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center text-xs font-bold">{i.quantity}</span>
                  <button
                    onClick={() => updateQty(i.productId, i.quantity + 1)}
                    className="bg-gradient-primary grid h-6 w-6 place-items-center rounded-full text-on-primary"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="truncate text-foreground">{i.productName}</span>
              </div>
              <span className="ml-3 shrink-0 font-semibold text-foreground">
                ₦{(i.productPrice * i.quantity).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass rounded-2xl p-4 shadow-soft">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How to receive</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Toggle active={method === "delivery"} onClick={() => setMethod("delivery")} Icon={Bike} label="Delivery" sub="~25 min" />
          <Toggle active={method === "pickup"} onClick={() => setMethod("pickup")} Icon={User} label="Self pickup" sub="From vendor" />
        </div>
        {method === "delivery" && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={address || (userProfile ?? "")}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={userProfile || "Enter delivery address…"}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-4 shadow-soft">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Toggle
            active={pay === "wallet"}
            onClick={() => setPay("wallet")}
            label="Wallet"
            sub={wallet ? `₦${walletBalance.toLocaleString()}` : "…"}
          />
          <Toggle active={pay === "cash"} onClick={() => setPay("cash")} label="Cash" sub="On delivery" />
        </div>
        {insufficientWallet && (
          <p className="mt-2 text-xs text-destructive">Insufficient wallet balance. Use cash.</p>
        )}
      </section>

      <section className="glass space-y-1 rounded-2xl p-4 text-sm shadow-soft">
        <SummaryRow label="Subtotal" value={`₦${subtotal.toLocaleString()}`} />
        <SummaryRow label="Delivery fee" value={deliveryFee ? `₦${deliveryFee.toLocaleString()}` : "Free"} />
        <div className="my-1 h-px bg-border" />
        <SummaryRow label="Total" value={`₦${total.toLocaleString()}`} bold />
      </section>

      <div className="fixed inset-x-3 bottom-20 z-30 mx-auto max-w-md sm:bottom-24">
        <button
          onClick={() => placeOrder()}
          disabled={isPending || insufficientWallet}
          className="bg-gradient-primary flex w-full items-center justify-between rounded-full px-5 py-3.5 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            {isPending ? "Placing order…" : "Place order"}
          </span>
          <span>₦{total.toLocaleString()}</span>
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={bold ? "font-bold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "text-base font-bold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  Icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  Icon?: typeof Bike;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/50"
      }`}
    >
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </button>
  );
}
