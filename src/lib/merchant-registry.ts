import { keccak256, toHex } from "viem";
import type { MerchantProfile } from "@/lib/wallet";

export const MERCHANT_REGISTRY_ABI = [
  {
    inputs: [
      { name: "metadataHash", type: "bytes32" },
      { name: "categoryHash", type: "bytes32" },
    ],
    name: "register",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "metadataHash", type: "bytes32" },
      { name: "categoryHash", type: "bytes32" },
    ],
    name: "updateMetadata",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "active", type: "bool" }],
    name: "setActive",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "wallet", type: "address" }],
    name: "getMerchant",
    outputs: [
      {
        components: [
          { name: "wallet", type: "address" },
          { name: "metadataHash", type: "bytes32" },
          { name: "categoryHash", type: "bytes32" },
          { name: "onboardedAt", type: "uint64" },
          { name: "active", type: "bool" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "wallet", type: "address" }],
    name: "isRegistered",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type MerchantProfileInput = {
  businessName: string;
  category: string;
  description?: string;
  website?: string;
};

export type MerchantRegistryRow = {
  wallet: `0x${string}`;
  metadataHash: `0x${string}`;
  categoryHash: `0x${string}`;
  onboardedAt: bigint | number;
  active: boolean;
};

const EMPTY_HASH = `0x${"0".repeat(64)}` as `0x${string}`;

export function normalizeMerchantProfile(input: MerchantProfileInput) {
  return {
    schema: "merchflow.merchant.v1",
    businessName: input.businessName.trim(),
    category: input.category.trim(),
    description: input.description?.trim() ?? "",
    website: input.website?.trim() ?? "",
  };
}

export function getMerchantProfileHashes(input: MerchantProfileInput) {
  const profile = normalizeMerchantProfile(input);
  const metadata = JSON.stringify(profile);
  return {
    metadata,
    metadataHash: keccak256(toHex(metadata)),
    categoryHash: keccak256(toHex(profile.category.toLowerCase())),
  };
}

export function isRegisteredMerchantRow(
  row: MerchantRegistryRow | null | undefined,
): row is MerchantRegistryRow {
  if (!row) return false;
  return Boolean(row.active && Number(row.onboardedAt) > 0 && row.metadataHash !== EMPTY_HASH);
}

export function merchantProfileFromRegistry(
  row: MerchantRegistryRow,
  address: string,
  cached?: MerchantProfile,
): MerchantProfile {
  const registeredAt = Number(row.onboardedAt) * 1000;
  return {
    address,
    businessName: cached?.businessName || "Registered Merchant",
    category: cached?.category || "On-chain",
    description: cached?.description ?? "",
    website: cached?.website ?? "",
    registeredAt: Number.isFinite(registeredAt) && registeredAt > 0 ? registeredAt : Date.now(),
    metadataHash: row.metadataHash,
    categoryHash: row.categoryHash,
    source: "onchain",
  };
}
