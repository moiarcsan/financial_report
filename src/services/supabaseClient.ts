import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Create a mock client if env vars are not set (for development/testing)
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient("https://placeholder.supabase.co", "placeholder-key");

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL and anon key not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
}

export { supabase };