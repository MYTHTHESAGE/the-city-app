import { createClient } from "@supabase/supabase-js";
import type { Database as OriginalDatabase } from "./lib/database.types";

type FixDatabase<DB> = DB extends { public: infer P }
  ? P extends { Tables: infer T; Functions: infer F; Enums: infer E }
    ? {
        public: {
          Tables: {
            [K in keyof T]: T[K] & { Relationships: [] }
          };
          Views: Record<string, never>;
          Functions: F;
          Enums: E;
          CompositeTypes: Record<string, never>;
        }
      }
    : never
  : never;

type Database = FixDatabase<OriginalDatabase>;

const client = createClient<Database>("https://eoovcmvgriduocqcksog.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvb3ZjbXZncmlkdW9jcWNrc29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjk4NjAsImV4cCI6MjA5NjcwNTg2MH0.KQYG5nlmZbF5Jjjy2BYkEGth1cq6sg074mYoifT0sAM");

export async function test() {
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {
    full_name: "Test Name"
  };
  await client.from("profiles").update(patch).eq("id", "test-id");
}
