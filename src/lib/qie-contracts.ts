/**
 * QIE on-chain contract addresses.
 *
 * Fill these in with the real deployed addresses for QIE Pass, QIE Stable,
 * QIE Oracle, and QIE DEX router. Until they're set, the app falls back to
 * graceful "not configured" UI states and uses the Supabase oracle_rate
 * fallback (1 USD = 1.024 QIE Stable) plus a permissive QIE Pass check.
 *
 * Override per-environment via Vite env vars (VITE_QIE_*_TESTNET / _MAINNET).
 */
import { qieMainnet, qieTestnet } from "./chains";

type Addr = `0x${string}` | null;

function env(name: string): Addr {
  const v = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  if (!v || !/^0x[a-fA-F0-9]{40}$/.test(v)) return null;
  return v as `0x${string}`;
}

export type QieContracts = {
  pass: Addr;
  stable: Addr;
  oracle: Addr;
  dexRouter: Addr;
};

export const QIE_CONTRACTS: Record<number, QieContracts> = {
  [qieTestnet.id]: {
    pass: env("VITE_QIE_PASS_TESTNET"),
    stable: env("VITE_QIE_STABLE_TESTNET"),
    oracle: env("VITE_QIE_ORACLE_TESTNET"),
    dexRouter: env("VITE_QIE_DEX_TESTNET"),
  },
  [qieMainnet.id]: {
    pass: env("VITE_QIE_PASS_MAINNET"),
    stable: env("VITE_QIE_STABLE_MAINNET"),
    oracle: env("VITE_QIE_ORACLE_MAINNET"),
    dexRouter: env("VITE_QIE_DEX_MAINNET"),
  },
};

export function getQieContracts(chainId: number | undefined): QieContracts {
  if (chainId == null) return { pass: null, stable: null, oracle: null, dexRouter: null };
  return (
    QIE_CONTRACTS[chainId] ?? { pass: null, stable: null, oracle: null, dexRouter: null }
  );
}

/** Minimal ERC-721 ABI fragment for QIE Pass `balanceOf`. */
export const ERC721_BALANCE_OF_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Minimal ERC-20 ABI for QIE Stable balance/transfer. */
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/** Chainlink-style oracle `latestAnswer()` (USD/QIE, 8 decimals). */
export const ORACLE_LATEST_ANSWER_ABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ORACLE_FALLBACK_RATE = 1.024; // 1 USD = 1.024 QIE Stable