import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MONTHLY_RATE, type LoanRow } from "@/lib/types";
import { createDemoId, currentIso, getDemoStore, recordDemoActivity } from "@/lib/demo-store";

const walletSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet")
  .transform((v) => v.toLowerCase());

/**
 * Compute a 0-800 credit score from on-platform signals.
 * Returns the breakdown so the UI can render bars.
 */
export const getCreditProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) => z.object({ wallet: walletSchema }).parse(input))
  .handler(async ({ data }) => {
    const demo = getDemoStore();
    const payroll = demo.payrollRuns.filter((run) => run.merchant_wallet === data.wallet);
    const loans = demo.loans.filter((loan) => loan.merchant_wallet === data.wallet);
    const recipients = payroll.flatMap((run) => run.payroll_recipients ?? []);
    const uniqueRecipients = new Set(
      recipients.map((recipient) => recipient.wallet ?? recipient.label),
    ).size;
    const firstRun = payroll.at(-1);
    const accountAgeDays = firstRun
      ? Math.max(0, (Date.now() - new Date(firstRun.created_at).getTime()) / 86_400_000)
      : 0;
    const totalPayrollQie = payroll.reduce((sum, run) => sum + Number(run.total_qie), 0);

    const signals = [
      {
        name: "Invoice Volume",
        score: 0,
        max: 300,
      },
      { name: "Payment Regularity", score: 0, max: 200 },
      {
        name: "Payroll Consistency",
        score: Math.min(200, Math.round(payroll.length * 25)),
        max: 200,
      },
      {
        name: "Unique Recipients",
        score: Math.min(200, Math.round(uniqueRecipients * 25)),
        max: 200,
      },
      { name: "Account Age", score: Math.min(100, Math.round(accountAgeDays / 3)), max: 100 },
    ];
    const score = signals.reduce((s, x) => s + x.score, 0);

    const avg30dPayroll = totalPayrollQie / 30 || 0;
    const maxLoanQie = Math.min(1000, Math.max(0, Math.round(avg30dPayroll * 3 * 100) / 100));

    const activeLoan = loans.find((l) => l.status === "active") ?? null;

    return {
      signals,
      score,
      maxLoanQie,
      totalRevenueQie: 0,
      activeLoan,
      loanHistory: loans,
    };
  });

export const requestLoan = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string; principalQie: number; txHash?: string | null }) =>
    z
      .object({
        wallet: walletSchema,
        principalQie: z.number().positive().finite(),
        txHash: z
          .string()
          .regex(/^0x[a-fA-F0-9]{2,}$/)
          .nullable()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const interestQie = +(data.principalQie * MONTHLY_RATE).toFixed(6);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const loan: LoanRow = {
      id: createDemoId("loan"),
      merchant_wallet: data.wallet,
      principal_qie: data.principalQie,
      monthly_rate: MONTHLY_RATE,
      interest_qie: interestQie,
      paid_qie: 0,
      due_date: dueDate.toISOString().slice(0, 10),
      status: "active",
      tx_hash: data.txHash ?? null,
      created_at: currentIso(),
      closed_at: null,
    };

    getDemoStore().loans.unshift(loan);
    recordDemoActivity({
      type: "loan_issued",
      actorWallet: data.wallet,
      amountQie: data.principalQie,
      txHash: data.txHash ?? null,
    });

    return { loan };
  });

export const repayLoan = createServerFn({ method: "POST" })
  .inputValidator((input: { loanId: string; amountQie: number; txHash: string }) =>
    z
      .object({
        loanId: z.string().uuid(),
        amountQie: z.number().positive().finite(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{2,}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const demo = getDemoStore();
    const loan = demo.loans.find((item) => item.id === data.loanId);
    if (!loan) throw new Error("Loan not found");

    const newPaid = Number(loan.paid_qie) + data.amountQie;
    const totalDue = Number(loan.principal_qie) + Number(loan.interest_qie);
    const status = newPaid >= totalDue ? "repaid" : "active";
    const updated: LoanRow = {
      ...loan,
      paid_qie: newPaid,
      status,
      closed_at: status === "repaid" ? currentIso() : null,
    };
    demo.loans = demo.loans.map((item) => (item.id === updated.id ? updated : item));

    recordDemoActivity({
      type: "loan_repaid",
      actorWallet: loan.merchant_wallet,
      amountQie: data.amountQie,
      txHash: data.txHash,
    });

    return { loan: updated };
  });

export const depositToPool = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string; amountQie: number; txHash: string }) =>
    z
      .object({
        wallet: walletSchema,
        amountQie: z.number().positive().finite(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{2,}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const row = {
      id: createDemoId("dep"),
      depositor_wallet: data.wallet,
      amount_qie: data.amountQie,
      tx_hash: data.txHash,
      created_at: currentIso(),
    };
    getDemoStore().deposits.unshift(row);
    return { deposit: row };
  });

export const getPoolStats = createServerFn({ method: "GET" }).handler(async () => {
  const { deposits, loans } = getDemoStore();

  const size = deposits.reduce((s, d) => s + Number(d.amount_qie), 0);
  const outstanding = loans
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + Math.max(0, Number(l.principal_qie) - Number(l.paid_qie)), 0);
  const utilization = size ? Math.min(1, outstanding / size) : 0;
  return { size, utilization, apy: 0.084 };
});
