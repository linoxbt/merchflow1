import { formatEther, keccak256, parseEther, toHex } from "viem";
import type { InvoiceRow, InvoiceStatus } from "@/lib/types";

export const INVOICE_REGISTRY_ABI = [
  {
    inputs: [
      { name: "invoiceId", type: "bytes32" },
      { name: "number", type: "string" },
      { name: "payer", type: "address" },
      { name: "amountQieWei", type: "uint256" },
      { name: "amountUsdCents", type: "uint256" },
      { name: "dueDate", type: "uint64" },
      { name: "metadataHash", type: "bytes32" },
      { name: "memo", type: "string" },
    ],
    name: "createInvoice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    name: "payInvoice",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    name: "cancelInvoice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    name: "getInvoice",
    outputs: [
      {
        components: [
          { name: "id", type: "bytes32" },
          { name: "number", type: "string" },
          { name: "merchant", type: "address" },
          { name: "payer", type: "address" },
          { name: "amountQieWei", type: "uint256" },
          { name: "amountUsdCents", type: "uint256" },
          { name: "dueDate", type: "uint64" },
          { name: "createdAt", type: "uint64" },
          { name: "paidAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "metadataHash", type: "bytes32" },
          { name: "memo", type: "string" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "merchant", type: "address" }],
    name: "getMerchantInvoices",
    outputs: [{ name: "", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    name: "statusOf",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type InvoiceRegistryRow = {
  id: `0x${string}`;
  number: string;
  merchant: `0x${string}`;
  payer: `0x${string}`;
  amountQieWei: bigint;
  amountUsdCents: bigint;
  dueDate: bigint | number;
  createdAt: bigint | number;
  paidAt: bigint | number;
  status: bigint | number;
  metadataHash: `0x${string}`;
  memo: string;
};

export type InvoiceMetadataInput = {
  number: string;
  merchantWallet: string;
  customerWallet: string;
  description: string;
  amountUsd: number;
  amountQie: number;
  dueDate: string;
};

const EMPTY_HASH = `0x${"0".repeat(64)}` as `0x${string}`;

export function normalizeInvoiceNumber(number: string) {
  return number.trim().toUpperCase();
}

export function createOnchainInvoiceNumber() {
  const time = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${time}-${suffix}`;
}

export function invoiceIdFromNumber(number: string) {
  return keccak256(toHex(normalizeInvoiceNumber(number)));
}

export function getInvoiceMetadataHash(input: InvoiceMetadataInput) {
  const metadata = JSON.stringify({
    schema: "merchflow.invoice.v1",
    number: normalizeInvoiceNumber(input.number),
    merchantWallet: input.merchantWallet.toLowerCase(),
    customerWallet: input.customerWallet.toLowerCase(),
    description: input.description.trim(),
    amountUsd: Number(input.amountUsd.toFixed(2)),
    amountQie: Number(input.amountQie.toFixed(6)),
    dueDate: input.dueDate,
  });
  return {
    metadata,
    metadataHash: keccak256(toHex(metadata)),
  };
}

export function amountQieToWei(amountQie: number) {
  return parseEther(toDecimalString(amountQie, 18));
}

export function amountUsdToCents(amountUsd: number) {
  return BigInt(Math.round(amountUsd * 100));
}

export function dueDateToUnix(dueDate: string) {
  return BigInt(Math.floor(new Date(`${dueDate}T23:59:59Z`).getTime() / 1000));
}

export function unixToDate(timestamp: bigint | number) {
  const n = Number(timestamp);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n * 1000).toISOString().slice(0, 10);
}

export function unixToIso(timestamp: bigint | number) {
  const n = Number(timestamp);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

export function invoiceStatusFromCode(status: bigint | number): InvoiceStatus {
  switch (Number(status)) {
    case 2:
      return "paid";
    case 3:
      return "cancelled";
    case 4:
      return "overdue";
    default:
      return "pending";
  }
}

export function contractInvoiceToRow(
  row: InvoiceRegistryRow | null | undefined,
): InvoiceRow | null {
  if (!row || row.id === EMPTY_HASH || Number(row.createdAt) === 0) return null;

  return {
    id: row.id,
    number: row.number,
    merchant_wallet: row.merchant,
    customer_wallet: row.payer,
    description: row.memo || `Invoice ${row.number}`,
    amount_usd: Number(row.amountUsdCents) / 100,
    amount_qie: formatEther(row.amountQieWei),
    due_date: unixToDate(row.dueDate),
    status: invoiceStatusFromCode(row.status),
    tx_hash: null,
    paid_at: unixToIso(row.paidAt),
    created_at: unixToIso(row.createdAt) ?? new Date().toISOString(),
    metadata_hash: row.metadataHash,
    source: "onchain",
  };
}

export function buildPendingInvoiceRow(input: InvoiceMetadataInput): InvoiceRow {
  const number = normalizeInvoiceNumber(input.number);
  return {
    id: invoiceIdFromNumber(number),
    number,
    merchant_wallet: input.merchantWallet.toLowerCase(),
    customer_wallet: input.customerWallet.toLowerCase(),
    description: input.description,
    amount_usd: input.amountUsd,
    amount_qie: input.amountQie,
    due_date: input.dueDate,
    status: "pending",
    tx_hash: null,
    paid_at: null,
    created_at: new Date().toISOString(),
    metadata_hash: getInvoiceMetadataHash(input).metadataHash,
    source: "onchain",
  };
}

export const generateInvoiceNumber = createOnchainInvoiceNumber;
export const getInvoiceId = invoiceIdFromNumber;
export const toQieWei = amountQieToWei;
export const toUsdCents = amountUsdToCents;
export const toDueDateSeconds = dueDateToUnix;
export const createOptimisticInvoiceRow = buildPendingInvoiceRow;

function toDecimalString(value: number, maxDecimals: number) {
  return value.toFixed(maxDecimals).replace(/\.?0+$/, "") || "0";
}
