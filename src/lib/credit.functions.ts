import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const walletSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet")
  .transform((v) => v.toLowerCase());

/**
 * Compute a 0-800 credit score from on-platform signals.
 * Returns the breakdown so the UI can render bars.
 */
export const getCreditProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) =>
    z.object({ wallet: walletSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const [invoicesQ, payrollQ, merchantQ, loansQ] = await Promise.all([
      supabaseAdmin.from("invoices").select("*").eq("merchant_wallet", data.wallet),
      supabaseAdmin.from("payroll_runs").select("*").eq("merchant_wallet", data.wallet),
      supabaseAdmin.from("merchants").select("*").eq("wallet_address", data.wallet).maybeSingle(),
      supabaseAdmin.from("loans").select("*").eq("merchant_wallet", data.wallet),
    ]);

    const invoices = invoicesQ.data ?? [];
    const payroll = payrollQ.data ?? [];
    const merchant = merchantQ.data;
    const loans = loansQ.data ?? [];

    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalRevenueQie = paidInvoices.reduce((s, i) => s + Number(i.amount_qie), 0);
    const uniqueCustomers = new Set(invoices.map((i) => i.customer_wallet)).size;
    const accountAgeDays = merchant?.onboarded_at
      ? Math.max(0, (Date.now() - new Date(merchant.onboarded_at).getTime()) / 86_400_000)
      : 0;
    const onTimeRate = invoices.length
      ? paidInvoices.length / invoices.length
      : 0;

    const signals = [
      { name: "Invoice Volume", score: Math.min(300, Math.round(paidInvoices.length * 20)), max: 300 },
      { name: "Payment Regularity", score: Math.round(onTimeRate * 200), max: 200 },
      { name: "Payroll Consistency", score: Math.min(200, Math.round(payroll.length * 25)), max: 200 },
      { name: "Unique Customers", score: Math.min(200, Math.round(uniqueCustomers * 25)), max: 200 },
      { name: "Account Age", score: Math.min(100, Math.round(accountAgeDays / 3)), max: 100 },
    ];
    const score = signals.reduce((s, x) => s + x.score, 0);

    // Max loan = 3× 30-day average revenue, capped at 1000 QIE for safety.
    const avg30dRevenue = totalRevenueQie / 30 || 0;
    const maxLoanQie = Math.min(1000, Math.max(0, Math.round(avg30dRevenue * 3 * 100) / 100));

    const activeLoan = loans.find((l) => l.status === "active") ?? null;

    return {
      signals,
      score,
      maxLoanQie,
      totalRevenueQie,
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
        txHash: z.string().regex(/^0x[a-fA-F0-9]{2,}$/).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const monthlyRate = 0.024;
    const interestQie = +(data.principalQie * monthlyRate).toFixed(6);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const { data: loan, error } = await supabaseAdmin
      .from("loans")
      .insert({
        merchant_wallet: data.wallet,
        principal_qie: data.principalQie,
        monthly_rate: monthlyRate,
        interest_qie: interestQie,
        paid_qie: 0,
        due_date: dueDate.toISOString().slice(0, 10),
        status: "active",
        tx_hash: data.txHash ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("activity").insert({
      type: "loan_issued",
      actor_wallet: data.wallet,
      amount_qie: data.principalQie,
      tx_hash: data.txHash ?? null,
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
    const { data: loan, error } = await supabaseAdmin
      .from("loans")
      .select("*")
      .eq("id", data.loanId)
      .single();
    if (error) throw new Error(error.message);

    const newPaid = Number(loan.paid_qie) + data.amountQie;
    const totalDue = Number(loan.principal_qie) + Number(loan.interest_qie);
    const status = newPaid >= totalDue ? "repaid" : "active";

    const { data: updated, error: uErr } = await supabaseAdmin
      .from("loans")
      .update({
        paid_qie: newPaid,
        status,
        closed_at: status === "repaid" ? new Date().toISOString() : null,
      })
      .eq("id", data.loanId)
      .select("*")
      .single();
    if (uErr) throw new Error(uErr.message);

    await supabaseAdmin.from("activity").insert({
      type: "loan_repaid",
      actor_wallet: loan.merchant_wallet,
      amount_qie: data.amountQie,
      tx_hash: data.txHash,
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
    const { data: row, error } = await supabaseAdmin
      .from("pool_deposits")
      .insert({ depositor_wallet: data.wallet, amount_qie: data.amountQie, tx_hash: data.txHash })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { deposit: row };
  });

export const getPoolStats = createServerFn({ method: "GET" }).handler(async () => {
  const [depositsQ, loansQ] = await Promise.all([
    supabaseAdmin.from("pool_deposits").select("amount_qie, depositor_wallet"),
    supabaseAdmin.from("loans").select("principal_qie, paid_qie, status"),
  ]);
  const deposits = depositsQ.data ?? [];
  const loans = loansQ.data ?? [];

  const size = deposits.reduce((s, d) => s + Number(d.amount_qie), 0);
  const outstanding = loans
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + Math.max(0, Number(l.principal_qie) - Number(l.paid_qie)), 0);
  const utilization = size ? Math.min(1, outstanding / size) : 0;
  return { size, utilization, apy: 0.084 };
});