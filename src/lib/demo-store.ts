import type { ActivityRow, LoanRow, PayrollRecipientRow, PayrollRunRow } from "@/lib/types";

type PoolDeposit = {
  id: string;
  depositor_wallet: string;
  amount_qie: number;
  tx_hash: string;
  created_at: string;
};

type DemoStore = {
  payrollRuns: PayrollRunRow[];
  loans: LoanRow[];
  deposits: PoolDeposit[];
  activity: ActivityRow[];
};

const STORE_KEY = "__MERCHFLOW_DEMO_STORE__";

function id(prefix: string) {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${uuid}`;
}

function now() {
  return new Date().toISOString();
}

function store() {
  const g = globalThis as typeof globalThis & Record<string, DemoStore | undefined>;
  const existing = g[STORE_KEY];
  if (existing) return existing;

  const created: DemoStore = { payrollRuns: [], loans: [], deposits: [], activity: [] };
  g[STORE_KEY] = created;
  return created;
}

export function getDemoStore() {
  return store();
}

export function createDemoId(prefix: string) {
  return id(prefix);
}

export function currentIso() {
  return now();
}

export function recordDemoActivity(input: {
  type: ActivityRow["type"];
  actorWallet: string;
  amountQie?: number | string | null;
  refId?: string | null;
  txHash?: string | null;
}) {
  const row: ActivityRow = {
    id: id("act"),
    type: input.type,
    actor_wallet: input.actorWallet.toLowerCase(),
    amount_qie: input.amountQie ?? null,
    ref_id: input.refId ?? null,
    tx_hash: input.txHash ?? null,
    created_at: now(),
  };
  store().activity.unshift(row);
  return row;
}

export function attachRecipients(run: PayrollRunRow, recipients: PayrollRecipientRow[]) {
  return { ...run, payroll_recipients: recipients };
}
