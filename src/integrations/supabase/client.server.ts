import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./client";

const serviceRoleKey = process.env.MERCHFLOW_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  throw new Error(
    "MERCHFLOW_SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Project Settings → Secrets.",
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});