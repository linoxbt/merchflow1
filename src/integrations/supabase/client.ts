import { createClient } from "@supabase/supabase-js";

// Publishable key + URL are safe to expose in client code.
export const SUPABASE_URL = "https://eqgmcizlezlhcedtiejj.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_P8X3VQyjWzISvhDHFBBdtg_yZ8F-iBe";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "merchflow.auth",
  },
});