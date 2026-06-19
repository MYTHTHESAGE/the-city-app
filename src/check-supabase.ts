import { supabase } from "./lib/supabase";

export async function test() {
  const { data } = await supabase.from("profiles").select("*");
  if (data) {
    const name = data[0].full_name;
    console.log(name);
  }
}
