import { createClient } from "@supabase/supabase-js";

type MyDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; role: string };
        Insert: { id: string; role?: string };
        Update: { id?: string; role?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const client = createClient<MyDatabase>("https://eoovcmvgriduocqcksog.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvb3ZjbXZncmlkdW9jcWNrc29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjk4NjAsImV4cCI6MjA5NjcwNTg2MH0.KQYG5nlmZbF5Jjjy2BYkEGth1cq6sg074mYoifT0sAM");
export async function test() {
  await client.from("profiles").update({ role: "user" }).eq("id", "123");
}
