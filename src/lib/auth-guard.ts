import { redirect } from "@tanstack/react-router";
import { supabase } from "./supabase";
import type { UserRole } from "./database.types";

type GuardOptions = {
  allowedRoles?: UserRole[];
};

export async function requireAuth(opts: GuardOptions = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect({ to: "/signin" });
  }

  if (opts.allowedRoles && opts.allowedRoles.length > 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    const role = profile?.role as UserRole | undefined;
    if (!role || !opts.allowedRoles.includes(role)) {
      throw redirect({ to: roleHomePath(role) });
    }

    return { session, role };
  }

  return { session, role: null as UserRole | null };
}

export function roleHomePath(role: UserRole | undefined | null): string {
  switch (role) {
    case "driver": return "/driver";
    case "vendor": return "/vendor";
    case "medical_responder": return "/responder";
    case "security_responder": return "/responder";
    default: return "/dashboard";
  }
}
