// Mock data for the MerchFlow demo. Replace with on-chain reads once contracts ship.

export type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled";

export type Invoice = {
  id: string;          // INV-0042
  hash: string;        // 0x...
  customer: string;
  description: string;
  amountUsd: number;
  amountQie: number;
  dueDate: string;     // ISO
  createdAt: string;   // ISO
  status: InvoiceStatus;
  txHash?: string;
};

export type PayrollRecipient = {
  address?: string;
  label: string;
  amountUsd: number;
  amountQie: number;
  claimCode?: string;
  status: "received" | "pending_claim" | "claimed";
};

export type PayrollRun = {
  id: string;
  date: string;
  recipients: PayrollRecipient[];
  totalQie: number;
  status: "completed" | "processing";
};

export type ActivityEvent = {
  id: string;
  type: "invoice_paid" | "payroll_sent" | "loan_issued" | "loan_repaid";
  address: string;
  amountQie: number;
  timestamp: number;
};

export const ORACLE_RATE = 1.024; // 1 USD = 1.024 QIE Stable

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "INV-0042",
    hash: "0x7f3ab9c1d8e2f456a1b3c7d9e0f1a2b3c4d5e6f7",
    customer: "0x91a2b3c4d5e6f7081920a3b4c5d6e7f809a1b2c3",
    description: "Web development services — July 2026",
    amountUsd: 500,
    amountQie: 512.0,
    dueDate: "2026-07-20",
    createdAt: "2026-05-28",
    status: "pending",
  },
  {
    id: "INV-0041",
    hash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091a",
    customer: "0x42a8b3c4d5e6f7081920a3b4c5d6e7f80912b3c4",
    description: "Logo & brand identity package",
    amountUsd: 1200,
    amountQie: 1228.8,
    dueDate: "2026-05-15",
    createdAt: "2026-04-15",
    status: "paid",
    txHash: "0xfeed1234dead5678beef9012cafe3456abcd7890",
  },
  {
    id: "INV-0040",
    hash: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091ab2",
    customer: "0x73c8b3c4d5e6f7081920a3b4c5d6e7f80912b3d5",
    description: "Monthly retainer — May",
    amountUsd: 800,
    amountQie: 819.2,
    dueDate: "2026-05-01",
    createdAt: "2026-04-01",
    status: "paid",
    txHash: "0xaaa1234bbb5678ccc9012ddd3456eee7890fff12",
  },
  {
    id: "INV-0039",
    hash: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091ab2c3",
    customer: "0x54d8b3c4d5e6f7081920a3b4c5d6e7f80912b3e6",
    description: "Consultation — Q2 strategy session",
    amountUsd: 320,
    amountQie: 327.68,
    dueDate: "2026-04-30",
    createdAt: "2026-03-30",
    status: "overdue",
  },
  {
    id: "INV-0038",
    hash: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091ab2c3d4",
    customer: "0x65e8b3c4d5e6f7081920a3b4c5d6e7f80912b3f7",
    description: "App store setup & deployment",
    amountUsd: 450,
    amountQie: 460.8,
    dueDate: "2026-04-10",
    createdAt: "2026-03-10",
    status: "paid",
    txHash: "0xbbb1234ccc5678ddd9012eee3456fff7890aaa12",
  },
  {
    id: "INV-0037",
    hash: "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8091ab2c3d4e5",
    customer: "0x76f8b3c4d5e6f7081920a3b4c5d6e7f80912b408",
    description: "Smart-contract audit phase 1",
    amountUsd: 2200,
    amountQie: 2252.8,
    dueDate: "2026-03-25",
    createdAt: "2026-02-25",
    status: "paid",
    txHash: "0xccc1234ddd5678eee9012fff3456aaa7890bbb12",
  },
];

export const MOCK_PAYROLL: PayrollRun[] = [
  {
    id: "PAY-0008",
    date: "2026-05-28",
    totalQie: 512.0,
    status: "completed",
    recipients: [
      { address: "0x91a2…b2c3", label: "Ada (designer)", amountUsd: 200, amountQie: 204.8, status: "received" },
      { address: "0x42a8…b3c4", label: "Tunde (dev)", amountUsd: 200, amountQie: 204.8, status: "received" },
      { address: "0x73c8…b3d5", label: "Chioma (PM)", amountUsd: 100, amountQie: 102.4, status: "received" },
    ],
  },
  {
    id: "PAY-0007",
    date: "2026-04-28",
    totalQie: 307.2,
    status: "completed",
    recipients: [
      { label: "Freelancer A", amountUsd: 150, amountQie: 153.6, claimCode: "CLAIM-7F3A", status: "claimed" },
      { label: "Freelancer B", amountUsd: 150, amountQie: 153.6, claimCode: "CLAIM-9B2D", status: "pending_claim" },
    ],
  },
];

export const CREDIT_SIGNALS = [
  { name: "Invoice Volume", score: 240, max: 300 },
  { name: "Payment Regularity", score: 160, max: 200 },
  { name: "Payroll Consistency", score: 100, max: 200 },
  { name: "Unique Customers", score: 70, max: 200 },
  { name: "Account Age", score: 40, max: 100 },
];

export const CREDIT_SCORE = CREDIT_SIGNALS.reduce((s, x) => s + x.score, 0); // 610
export const CREDIT_MAX = 1000;

export function creditTier(score: number) {
  if (score >= 720) return "Excellent";
  if (score >= 620) return "Very Good";
  if (score >= 500) return "Good";
  if (score >= 350) return "Fair";
  return "Poor";
}

export const MAX_LOAN_QIE = 450;
export const MONTHLY_RATE = 0.024;
export const ACTIVE_LOAN = {
  borrowed: 200,
  interestAccrued: 4.8,
  totalDue: 204.8,
  dueDate: "2026-07-15",
  paid: 0,
};

export const POOL_STATS = {
  size: 2400,
  utilization: 0.68,
  apy: 0.084,
  yourDeposits: 0,
};

export const PROTOCOL_STATS = {
  invoicesPaid: 8420,
  totalVolumeQie: 1_240_000,
  activeMerchants: 1240,
  payrollProcessedQie: 440_000,
};

export const ACTIVITY_FEED: ActivityEvent[] = [
  { id: "1", type: "invoice_paid", address: "0x91a2…b2c3", amountQie: 512, timestamp: Date.now() - 1000 * 60 * 2 },
  { id: "2", type: "payroll_sent", address: "0x73c8…b3d5", amountQie: 1240, timestamp: Date.now() - 1000 * 60 * 8 },
  { id: "3", type: "loan_issued", address: "0x54d8…b3e6", amountQie: 380, timestamp: Date.now() - 1000 * 60 * 14 },
  { id: "4", type: "loan_repaid", address: "0x65e8…b3f7", amountQie: 204.8, timestamp: Date.now() - 1000 * 60 * 22 },
  { id: "5", type: "invoice_paid", address: "0x76f8…b408", amountQie: 819.2, timestamp: Date.now() - 1000 * 60 * 31 },
  { id: "6", type: "invoice_paid", address: "0x87a8…c519", amountQie: 102.4, timestamp: Date.now() - 1000 * 60 * 45 },
  { id: "7", type: "payroll_sent", address: "0x98b8…d62a", amountQie: 614.4, timestamp: Date.now() - 1000 * 60 * 62 },
  { id: "8", type: "loan_repaid", address: "0xa9c8…e73b", amountQie: 153.6, timestamp: Date.now() - 1000 * 60 * 88 },
];

export const TOP_MERCHANTS = [
  { rank: 1, address: "0x91a2…b2c3", volume: 48_240, score: 742 },
  { rank: 2, address: "0x73c8…b3d5", volume: 32_180, score: 688 },
  { rank: 3, address: "0x54d8…b3e6", volume: 24_960, score: 651 },
  { rank: 4, address: "0x65e8…b3f7", volume: 18_440, score: 612 },
  { rank: 5, address: "0x76f8…b408", volume: 14_220, score: 580 },
];

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