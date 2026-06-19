import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, HeartPulse, Search, ShieldAlert, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { fetchRegisteredUsersCount, fetchRegisteredUsersList } from "@/lib/queries";

export const Route = createFileRoute("/responder/directory")({
  beforeLoad: () =>
    requireAuth({ allowedRoles: ["medical_responder", "security_responder", "super_admin"] }),
  head: () => ({ meta: [{ title: "User Directory — The City App" }] }),
  component: ResponderDirectory,
});

type DirectoryUser = {
  id: string;
  full_name: string;
  phone: string | null;
  user_profiles: {
    location_in_camp: string | null;
    residential_address: string | null;
    blood_type: string | null;
    allergies: string | null;
    health_info: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_rel: string | null;
  } | null;
};

function ResponderDirectory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: totalUsers } = useQuery({
    queryKey: ["registered-users-count"],
    queryFn: fetchRegisteredUsersCount,
    refetchInterval: 60_000,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["registered-users-list", search],
    queryFn: () => fetchRegisteredUsersList(search),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/responder" })}
          className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            User & Health Directory
          </h1>
          <p className="text-xs text-muted-foreground">
            Search registered residents and access medical/contact profiles.
          </p>
        </div>
        <div className="glass rounded-2xl px-3 py-2 text-center shadow-soft shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Users</p>
          <p className="text-base font-bold text-foreground">{totalUsers ?? "—"}</p>
        </div>
      </div>

      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="search"
          placeholder="Search by resident name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : !users || users.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center shadow-soft">
          <p className="text-sm font-semibold text-foreground">No residents found</p>
          <p className="text-xs text-muted-foreground">No results matching "{search}"</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {(users as unknown as DirectoryUser[]).map((u) => {
            const isExpanded = expandedId === u.id;
            const hasProfile = !!u.user_profiles;

            return (
              <li
                key={u.id}
                className="glass overflow-hidden rounded-2xl shadow-soft transition-all duration-200"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : u.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.phone || "No phone"} · {u.user_profiles?.location_in_camp || "Address unlisted"}
                    </p>
                  </div>
                  {hasProfile && (
                    <span className="rounded-full bg-rose-500/10 p-1.5 text-rose-500 dark:bg-rose-950/20">
                      <HeartPulse className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border/60 bg-secondary/20 p-4 space-y-3 text-xs">
                    {hasProfile ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
                            Medical Profile
                          </h4>
                          <div>
                            <span className="text-muted-foreground">Blood Type:</span>{" "}
                            <span className="font-bold text-foreground">
                              {u.user_profiles?.blood_type?.replace("_pos", "+").replace("_neg", "−").replace("unknown", "Unknown").toUpperCase() ?? "Unknown"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Allergies:</span>{" "}
                            <span className="font-semibold text-foreground">
                              {u.user_profiles?.allergies || "None declared"}
                            </span>
                          </div>
                          {u.user_profiles?.health_info && (
                            <div>
                              <span className="text-muted-foreground">Conditions:</span>{" "}
                              <span className="text-foreground">{u.user_profiles?.health_info}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
                            Emergency Contact
                          </h4>
                          {u.user_profiles?.emergency_contact_name ? (
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">
                                {u.user_profiles.emergency_contact_name}
                                {u.user_profiles.emergency_contact_rel ? ` (${u.user_profiles.emergency_contact_rel})` : ""}
                              </p>
                              {u.user_profiles.emergency_contact_phone && (
                                <a
                                  href={`tel:${u.user_profiles.emergency_contact_phone}`}
                                  className="text-primary hover:underline font-semibold"
                                >
                                  {u.user_profiles.emergency_contact_phone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic">No contact details listed.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No health details or emergency contacts completed for this user.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="glass rounded-2xl border-blue-200/50 bg-blue-50/10 p-4 text-xs dark:border-blue-950/30 dark:bg-blue-950/10 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-foreground">HIPAA & Privacy Regulations</p>
          <p className="text-muted-foreground leading-relaxed">
            All medical records and health profiles accessed through this directory are confidential and strictly restricted to authorized emergency medical or security services. Any unauthorized reproduction, sharing, or retrieval of this data is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
