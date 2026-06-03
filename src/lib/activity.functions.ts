import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getProtocolStats = createServerFn({ method: "GET" }).handler(async () => {
  const [invoicesQ, payrollQ, merchantsQ, activityQ] = await Promise.all([
    supabaseAdmin.from("invoices").select("amount_qie, status"),
    supabaseAdmin.from("payroll_runs").select("total_qie"),
    supabaseAdmin.from("merchants").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const invoices = invoicesQ.data ?? [];
  const payroll = payrollQ.data ?? [];
  const paid = invoices.filter((i) => i.status === "paid");
  const totalVolumeQie = paid.reduce((s, i) => s + Number(i.amount_qie), 0);
  const payrollProcessedQie = payroll.reduce((s, p) => s + Number(p.total_qie), 0);

  return {
    stats: {
      invoicesPaid: paid.length,
      totalVolumeQie,
      activeMerchants: merchantsQ.count ?? 0,
      payrollProcessedQie,
    },
    activity: activityQ.data ?? [],
  };
});

export const getTopMerchants = createServerFn({ method: "GET" }).handler(async () => {
  const { data: invoices, error } = await supabaseAdmin
    .from("invoices")
    .select("merchant_wallet, amount_qie, status");
  if (error) throw new Error(error.message);

  const byMerchant = new Map<string, number>();
  for (const i of invoices ?? []) {
    if (i.status !== "paid") continue;
    byMerchant.set(i.merchant_wallet, (byMerchant.get(i.merchant_wallet) ?? 0) + Number(i.amount_qie));
  }
  const ranked = [...byMerchant.entries()]
    .map(([wallet, volume]) => ({ wallet, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  return { merchants: ranked };
});

export const recordActivity = createServerFn({ method: "POST" })
  .inputValidator((input: { type: string; actorWallet: string; amountQie?: number; refId?: string; txHash?: string }) =>
    z
      .object({
        type: z.enum(["invoice_paid", "payroll_sent", "loan_issued", "loan_repaid", "merchant_registered"]),
        actorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).transform((v) => v.toLowerCase()),
        amountQie: z.number().nonnegative().optional(),
        refId: z.string().max(60).optional(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{2,}$/).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("activity").insert({
      type: data.type,
      actor_wallet: data.actorWallet,
      amount_qie: data.amountQie ?? null,
      ref_id: data.refId ?? null,
      tx_hash: data.txHash ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });