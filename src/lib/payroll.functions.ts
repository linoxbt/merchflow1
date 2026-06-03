import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const walletSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet")
  .transform((v) => v.toLowerCase());

const recipientSchema = z.object({
  label: z.string().trim().min(1).max(120),
  wallet: walletSchema.optional().nullable(),
  amountUsd: z.number().positive().finite(),
  amountQie: z.number().positive().finite(),
});

function randomClaimCode() {
  return `CLAIM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const listPayrollByMerchant = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) =>
    z.object({ wallet: walletSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: runs, error } = await supabaseAdmin
      .from("payroll_runs")
      .select("*, payroll_recipients(*)")
      .eq("merchant_wallet", data.wallet)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { runs: runs ?? [] };
  });

export const createPayrollRun = createServerFn({ method: "POST" })
  .inputValidator((input: {
    merchantWallet: string;
    recipients: z.infer<typeof recipientSchema>[];
    txHash?: string | null;
  }) =>
    z
      .object({
        merchantWallet: walletSchema,
        recipients: z.array(recipientSchema).min(1).max(500),
        txHash: z
          .string()
          .regex(/^0x[a-fA-F0-9]{2,}$/)
          .nullable()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const totalUsd = data.recipients.reduce((s, r) => s + r.amountUsd, 0);
    const totalQie = data.recipients.reduce((s, r) => s + r.amountQie, 0);

    const { data: latest } = await supabaseAdmin
      .from("payroll_runs")
      .select("number")
      .eq("merchant_wallet", data.merchantWallet)
      .order("created_at", { ascending: false })
      .limit(1);
    let next = 1;
    if (latest && latest[0]?.number) {
      const n = parseInt(String(latest[0].number).replace(/\D/g, ""), 10);
      if (Number.isFinite(n)) next = n + 1;
    }
    const number = `PAY-${String(next).padStart(4, "0")}`;

    const { data: run, error } = await supabaseAdmin
      .from("payroll_runs")
      .insert({
        number,
        merchant_wallet: data.merchantWallet,
        total_usd: totalUsd,
        total_qie: totalQie,
        recipient_count: data.recipients.length,
        status: "completed",
        tx_hash: data.txHash ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const recipientRows = data.recipients.map((r) => ({
      run_id: run.id,
      label: r.label,
      wallet: r.wallet ?? null,
      amount_usd: r.amountUsd,
      amount_qie: r.amountQie,
      claim_code: r.wallet ? null : randomClaimCode(),
      status: r.wallet ? "received" : "pending_claim",
    }));
    const { data: recipients, error: rErr } = await supabaseAdmin
      .from("payroll_recipients")
      .insert(recipientRows)
      .select("*");
    if (rErr) throw new Error(rErr.message);

    await supabaseAdmin.from("activity").insert({
      type: "payroll_sent",
      actor_wallet: data.merchantWallet,
      amount_qie: totalQie,
      ref_id: run.number,
      tx_hash: data.txHash ?? null,
    });

    return { run, recipients: recipients ?? [] };
  });

export const redeemClaimCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; wallet: string }) =>
    z
      .object({
        code: z
          .string()
          .trim()
          .min(4)
          .max(40)
          .transform((v) => v.toUpperCase()),
        wallet: walletSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("payroll_recipients")
      .select("*")
      .eq("claim_code", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Invalid claim code");
    if (row.status === "claimed") throw new Error("This claim code has already been redeemed");

    const { data: updated, error: uErr } = await supabaseAdmin
      .from("payroll_recipients")
      .update({
        status: "claimed",
        claim_code_redeemed_at: new Date().toISOString(),
        claim_code_redeemed_by: data.wallet,
        wallet: data.wallet,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (uErr) throw new Error(uErr.message);
    return { recipient: updated };
  });