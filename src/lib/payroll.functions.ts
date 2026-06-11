import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PayrollRecipientRow, PayrollRunRow } from "@/lib/types";
import {
  attachRecipients,
  createDemoId,
  currentIso,
  getDemoStore,
  recordDemoActivity,
} from "@/lib/demo-store";

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
  .inputValidator((input: { wallet: string }) => z.object({ wallet: walletSchema }).parse(input))
  .handler(async ({ data }) => {
    const runs = getDemoStore()
      .payrollRuns.filter((run) => run.merchant_wallet === data.wallet)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { runs };
  });

export const createPayrollRun = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
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
    const demo = getDemoStore();
    const totalUsd = data.recipients.reduce((s, r) => s + r.amountUsd, 0);
    const totalQie = data.recipients.reduce((s, r) => s + r.amountQie, 0);

    const ownRuns = demo.payrollRuns.filter((run) => run.merchant_wallet === data.merchantWallet);
    const next = ownRuns.length + 1;
    const number = `PAY-${String(next).padStart(4, "0")}`;

    const run: PayrollRunRow = {
      id: createDemoId("pay"),
      number,
      merchant_wallet: data.merchantWallet,
      total_usd: totalUsd,
      total_qie: totalQie,
      recipient_count: data.recipients.length,
      status: "completed",
      tx_hash: data.txHash ?? null,
      created_at: currentIso(),
      payroll_recipients: [],
    };

    const recipients: PayrollRecipientRow[] = data.recipients.map((r) => ({
      id: createDemoId("rec"),
      run_id: run.id,
      label: r.label,
      wallet: r.wallet ?? null,
      amount_usd: r.amountUsd,
      amount_qie: r.amountQie,
      claim_code: r.wallet ? null : randomClaimCode(),
      status: r.wallet ? "received" : "pending_claim",
      created_at: run.created_at,
    }));

    const hydrated = attachRecipients(run, recipients);
    demo.payrollRuns.unshift(hydrated);
    recordDemoActivity({
      type: "payroll_sent",
      actorWallet: data.merchantWallet,
      amountQie: totalQie,
      refId: run.number,
      txHash: data.txHash ?? null,
    });

    return { run: hydrated, recipients };
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
    for (const run of getDemoStore().payrollRuns) {
      const row = run.payroll_recipients?.find((recipient) => recipient.claim_code === data.code);
      if (!row) continue;
      if (row.status === "claimed") throw new Error("This claim code has already been redeemed");
      const updated: PayrollRecipientRow = {
        ...row,
        status: "claimed",
        wallet: data.wallet,
      };
      run.payroll_recipients = (run.payroll_recipients ?? []).map((recipient) =>
        recipient.id === updated.id ? updated : recipient,
      );
      return { recipient: updated };
    }
    throw new Error("Invalid claim code");
  });
