// Shared types and formatters. Data can come from QIE contracts or Supabase fallbacks.

export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

export type InvoiceRow = {
  id: string;
  number: string;
  merchant_wallet: string;
  customer_wallet: string;
  description: string;
  amount_usd: number | string;
  amount_qie: number | string;
  due_date: string;
  status: InvoiceStatus;
  tx_hash: string | null;
  paid_at: string | null;
  created_at: string;
  metadata_hash?: `0x${string}`;
  source?: "supabase" | "onchain";
};

export type PayrollRecipientRow = {
  id: string;
  run_id: string;
  label: string;
  wallet: string | null;
  amount_usd: number | string;
  amount_qie: number | string;
  claim_code: string | null;
  status: "pending" | "received" | "pending_claim" | "claimed" | "failed";
  created_at: string;
};

export type PayrollRunRow = {
  id: string;
  number: string;
  merchant_wallet: string;
  total_usd: number | string;
  total_qie: number | string;
  recipient_count: number;
  tx_hash: string | null;
  status: "processing" | "completed" | "failed";
  created_at: string;
  payroll_recipients?: PayrollRecipientRow[];
};

export type ActivityRow = {
  id: string;
  type: "invoice_paid" | "payroll_sent" | "loan_issued" | "loan_repaid" | "merchant_registered";
  actor_wallet: string;
  amount_qie: number | string | null;
  ref_id: string | null;
  tx_hash: string | null;
  created_at: string;
};

export type LoanRow = {
  id: string;
  merchant_wallet: string;
  principal_qie: number | string;
  monthly_rate: number | string;
  interest_qie: number | string;
  paid_qie: number | string;
  due_date: string;
  status: "active" | "repaid" | "defaulted";
  tx_hash: string | null;
  created_at: string;
  closed_at: string | null;
};

export const MONTHLY_RATE = 0.024;
export const CREDIT_MAX = 1000;

export function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function creditTier(score: number) {
  if (score >= 720) return "Excellent";
  if (score >= 620) return "Very Good";
  if (score >= 500) return "Good";
  if (score >= 350) return "Fair";
  return "Poor";
}

export function formatQie(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatUsd(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function relativeTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
