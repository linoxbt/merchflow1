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

/**
 * Officially-documented QIE mainnet addresses (see qiedex.qie.digital
 * and qi-blockchain.gitbook.io/qie-oracle). Env vars override these.
 * QIE Pass has no public contract address yet — leave null.
 * QIE testnet has no published Stable / Oracle / DEX contracts.
 */
const MAINNET_DEFAULTS = {
  pass: null as Addr,
  stable: "0x3F43DA82eC9A4f5285F10FaF1F26EcA7319E5DA5" as `0x${string}`, // QUSDC
  oracle: "0x9E596d809a20A272c788726f592c0d1629755440" as `0x${string}`,
  dexRouter: "0x08cd2e72e156D8563B4351eb4065C262A9f553Ef" as `0x${string}`, // QIEDEX Router (Uniswap V2)
};

export const WQIE_MAINNET: `0x${string}` = "0x0087904D95BEe9E5F24dc8852804b547981A9139";
export const QIE_DEX_FACTORY_MAINNET: `0x${string}` = "0x8E23128a5511223bE6c0d64106e2D4508C08398C";

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
    pass: env("VITE_QIE_PASS_MAINNET") ?? MAINNET_DEFAULTS.pass,
    stable: env("VITE_QIE_STABLE_MAINNET") ?? MAINNET_DEFAULTS.stable,
    oracle: env("VITE_QIE_ORACLE_MAINNET") ?? MAINNET_DEFAULTS.oracle,
    dexRouter: env("VITE_QIE_DEX_MAINNET") ?? MAINNET_DEFAULTS.dexRouter,
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

/** QIE Oracle: `getPrice(string asset) view returns (uint256)`. */
export const QIE_ORACLE_ABI = [
  {
    inputs: [{ name: "asset", type: "string" }],
    name: "getPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Uniswap V2 router subset used for swap quotes. */
export const UNI_V2_ROUTER_ABI = [
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    name: "getAmountsOut",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * QUSDC is a USDC-pegged stablecoin (1 QUSDC ≈ 1 USD), so 1 USD ≈ 1 QUSDC.
 * This is the canonical fallback when on-chain rate fetch isn't available.
 */
export const ORACLE_FALLBACK_RATE = 1.0;