import { supabase } from "./lib/supabase";
import type { Database } from "./lib/database.types";

type ProfilesUpdate = Database["public"]["Tables"]["profiles"]["Update"];
// Check if ProfilesUpdate is never
type IsNever<T> = [T] extends [never] ? true : false;
type CheckProfilesUpdate = IsNever<ProfilesUpdate>; // should be false

export async function test() {
  const patch: ProfilesUpdate = {
    full_name: "Test Name"
  };
  await supabase.from("profiles").update(patch).eq("id", "test-id");
}
