import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDemoStore, recordDemoActivity } from "@/lib/demo-store";

export const getProtocolStats = createServerFn({ method: "GET" }).handler(async () => {
  const demo = getDemoStore();
  const payroll = demo.payrollRuns;
  const paidInvoiceEvents = demo.activity.filter((item) => item.type === "invoice_paid");
  const totalVolumeQie = paidInvoiceEvents.reduce((s, item) => s + Number(item.amount_qie ?? 0), 0);
  const payrollProcessedQie = payroll.reduce((s, p) => s + Number(p.total_qie), 0);
  const activeMerchants = new Set([
    ...payroll.map((run) => run.merchant_wallet),
    ...demo.loans.map((loan) => loan.merchant_wallet),
    ...demo.activity.map((item) => item.actor_wallet),
  ]).size;

  return {
    stats: {
      invoicesPaid: paidInvoiceEvents.length,
      totalVolumeQie,
      activeMerchants,
      payrollProcessedQie,
    },
    activity: demo.activity.slice(0, 20),
  };
});

export const getTopMerchants = createServerFn({ method: "GET" }).handler(async () => {
  const byMerchant = new Map<string, number>();
  for (const item of getDemoStore().activity) {
    if (item.type !== "invoice_paid") continue;
    byMerchant.set(
      item.actor_wallet,
      (byMerchant.get(item.actor_wallet) ?? 0) + Number(item.amount_qie ?? 0),
    );
  }
  const ranked = [...byMerchant.entries()]
    .map(([wallet, volume]) => ({ wallet, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  return { merchants: ranked };
});

export const recordActivity = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      type: string;
      actorWallet: string;
      amountQie?: number;
      refId?: string;
      txHash?: string;
    }) =>
      z
        .object({
          type: z.enum([
            "invoice_paid",
            "payroll_sent",
            "loan_issued",
            "loan_repaid",
            "merchant_registered",
          ]),
          actorWallet: z
            .string()
            .regex(/^0x[a-fA-F0-9]{40}$/)
            .transform((v) => v.toLowerCase()),
          amountQie: z.number().nonnegative().optional(),
          refId: z.string().max(60).optional(),
          txHash: z
            .string()
            .regex(/^0x[a-fA-F0-9]{2,}$/)
            .optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    recordDemoActivity({
      type: data.type,
      actorWallet: data.actorWallet,
      amountQie: data.amountQie ?? null,
      refId: data.refId ?? null,
      txHash: data.txHash ?? null,
    });
    return { ok: true };
  });
