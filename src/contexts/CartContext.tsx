import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
};

type CartState = {
  vendorId: string | null;
  items: CartItem[];
};

type CartContextValue = CartState & {
  count: number;
  subtotal: number;
  setVendor: (id: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "city_cart_v1";

function loadCart(): CartState {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { vendorId: null, items: [] };
    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed.items)) return { vendorId: null, items: [] };
    return parsed;
  } catch {
    return { vendorId: null, items: [] };
  }
}

function saveCart(state: CartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage quota exceeded or SSR — ignore
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(loadCart);

  useEffect(() => {
    saveCart(state);
  }, [state]);

  const count = state.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = state.items.reduce((s, i) => s + i.productPrice * i.quantity, 0);

  const setVendor = (id: string) => {
    setState((prev) => ({
      vendorId: id,
      items: id !== prev.vendorId ? [] : prev.items,
    }));
  };

  const addItem = (item: CartItem) => {
    setState((prev) => {
      const existing = prev.items.find((i) => i.productId === item.productId);
      const items = existing
        ? prev.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          )
        : [...prev.items, item];
      return { ...prev, items };
    });
  };

  const removeItem = (productId: string) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.productId !== productId) }));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setState((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    }));
  };

  const clearCart = () => {
    setState({ vendorId: null, items: [] });
  };

  return (
    <CartContext.Provider
      value={{ ...state, count, subtotal, setVendor, addItem, removeItem, updateQty, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
