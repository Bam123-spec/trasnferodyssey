import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let client: SupabaseClient | undefined;

export function getSupabaseClient() {
  if (!url || !key?.startsWith("sb_publishable_")) {
    throw new Error("Odyssey requires a Supabase URL and publishable key.");
  }

  return (client ??= createClient(url, key, {
    auth: { detectSessionInUrl: false },
  }));
}
