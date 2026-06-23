import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/database.types";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
};

type SignInResult = { error: string | null; role: UserRole | null };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, role, is_verified, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, role: null };
    if (!data.user) return { error: "Sign-in failed. Please try again.", role: null };
    const p = await fetchProfile(data.user.id);
    setProfile(p);
    return { error: null, role: p?.role ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    if (!user) return;
    const email = user.email?.toLowerCase();
    if (!email) return;

    // 1. Sync User profile
    const userKey = `pending_profile_user_${email}`;
    const pendingUser = localStorage.getItem(userKey);
    if (pendingUser) {
      try {
        const payload = JSON.parse(pendingUser);
        supabase.from("user_profiles")
          .upsert({ id: user.id, ...payload })
          .then(({ error }) => {
            if (!error) {
              localStorage.removeItem(userKey);
              console.log("Auto-synced pending user profile");
              refreshProfile();
            } else {
              console.error("Failed to sync user profile:", error);
            }
          });
      } catch (e) {
        console.error("Error parsing user profile:", e);
      }
    }

    // 2. Sync Vendor profile & products
    const vendorKey = `pending_profile_vendor_${email}`;
    const pendingVendor = localStorage.getItem(vendorKey);
    if (pendingVendor) {
      try {
        const { products: pendingProducts, ...payload } = JSON.parse(pendingVendor);
        supabase.from("vendor_profiles")
          .upsert({ id: user.id, ...payload })
          .then(async ({ error }) => {
            if (!error) {
              localStorage.removeItem(vendorKey);
              console.log("Auto-synced pending vendor profile");
              refreshProfile();

              if (pendingProducts && Array.isArray(pendingProducts)) {
                for (const p of pendingProducts) {
                  await supabase.from("products").insert({
                    vendor_id: user.id,
                    ...p
                  });
                }
              }
            } else {
              console.error("Failed to sync vendor profile:", error);
            }
          });
      } catch (e) {
        console.error("Error parsing vendor profile:", e);
      }
    }

    // 3. Sync Driver profile
    const driverKey = `pending_profile_driver_${email}`;
    const pendingDriver = localStorage.getItem(driverKey);
    if (pendingDriver) {
      try {
        const payload = JSON.parse(pendingDriver);
        supabase.from("driver_profiles")
          .upsert({ id: user.id, ...payload })
          .then(({ error }) => {
            if (!error) {
              localStorage.removeItem(driverKey);
              console.log("Auto-synced pending driver profile");
              refreshProfile();
            } else {
              console.error("Failed to sync driver profile:", error);
            }
          });
      } catch (e) {
        console.error("Error parsing driver profile:", e);
      }
    }
  }, [user, refreshProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? null,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
