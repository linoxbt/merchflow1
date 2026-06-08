import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address")
  .transform((v) => v.toLowerCase());

export const getMerchantByWallet = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) => z.object({ wallet: addressSchema }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("merchants")
      .select("*")
      .eq("wallet_address", data.wallet)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { merchant: row };
  });

export const registerMerchant = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      wallet: string;
      businessName: string;
      category: string;
      description?: string;
      website?: string;
    }) =>
      z
        .object({
          wallet: addressSchema,
          businessName: z.string().trim().min(1).max(120),
          category: z.string().trim().min(1).max(60),
          description: z.string().trim().max(160).optional().default(""),
          website: z.string().trim().max(255).optional().default(""),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const payload = {
      wallet_address: data.wallet,
      business_name: data.businessName,
      category: data.category,
      description: data.description || null,
      website: data.website || null,
      qie_pass_verified: false,
      onboarded_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabaseAdmin
      .from("merchants")
      .upsert(payload, { onConflict: "wallet_address" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { merchant: row };
  });
