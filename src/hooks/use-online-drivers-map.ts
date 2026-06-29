import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchOnlineDriversMap } from "@/lib/queries";

export interface OnlineDriverMapEntry {
  driver_id: string;
  lat: number;
  lng: number;
  vehicle_type: string | null;
  rating: number | null;
  full_name: string;
}

export function useOnlineDriversMap() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("driver-locations-map")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "driver_profiles" },
        () => {
          qc.invalidateQueries({ queryKey: ["online-drivers-map"] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ["online-drivers-map"],
    queryFn: fetchOnlineDriversMap,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
