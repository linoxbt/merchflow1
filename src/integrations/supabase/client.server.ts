import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./client";

type SupabaseAdminClient = SupabaseClient;

let adminClient: SupabaseAdminClient | null = null;

function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const serviceRoleKey = process.env.MERCHFLOW_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "MERCHFLOW_SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel Project Settings > Environment Variables.",
    );
  }

  adminClient = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseAdminClient;
  return adminClient;
}

export const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdmin(), prop, receiver);
  },
});
