/**
 * QIE on-chain contract addresses.
 *
 * MerchFlow only reads QIE Stable balances as a wallet reference. It does not
 * force QIE Stable writes into invoice, payroll, or credit flows.
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

const MAINNET_DEFAULTS = {
  stable: "0x3F43DA82eC9A4f5285F10FaF1F26EcA7319E5DA5" as `0x${string}`, // QUSDC
};

export const QIE_ACCOUNTING_RATE = 1.0;

export type QieContracts = {
  stable: Addr;
  merchantRegistry: Addr;
  invoiceRegistry: Addr;
};

export const QIE_CONTRACTS: Record<number, QieContracts> = {
  [qieTestnet.id]: {
    stable: env("VITE_QIE_STABLE_TESTNET"),
    merchantRegistry: env("VITE_QIE_MERCHANT_REGISTRY_TESTNET"),
    invoiceRegistry: env("VITE_QIE_INVOICE_REGISTRY_TESTNET"),
  },
  [qieMainnet.id]: {
    stable: env("VITE_QIE_STABLE_MAINNET") ?? MAINNET_DEFAULTS.stable,
    merchantRegistry: env("VITE_QIE_MERCHANT_REGISTRY_MAINNET"),
    invoiceRegistry: env("VITE_QIE_INVOICE_REGISTRY_MAINNET"),
  },
};

export function getQieContracts(chainId: number | undefined): QieContracts {
  if (chainId == null) return { stable: null, merchantRegistry: null, invoiceRegistry: null };
  return QIE_CONTRACTS[chainId] ?? { stable: null, merchantRegistry: null, invoiceRegistry: null };
}

export function hasQieMerchantRegistry() {
  return Object.values(QIE_CONTRACTS).some((contracts) => !!contracts.merchantRegistry);
}

export function hasQieInvoiceRegistry() {
  return Object.values(QIE_CONTRACTS).some((contracts) => !!contracts.invoiceRegistry);
}

export function getQieInvoiceRegistryTarget(chainId: number | undefined) {
  const current = chainId == null ? null : QIE_CONTRACTS[chainId];
  if (current?.invoiceRegistry) {
    return { chainId: chainId!, address: current.invoiceRegistry };
  }

  for (const [configuredChainId, contracts] of Object.entries(QIE_CONTRACTS)) {
    if (contracts.invoiceRegistry) {
      return { chainId: Number(configuredChainId), address: contracts.invoiceRegistry };
    }
  }

  return null;
}

/** Minimal ERC-20 ABI for read-only QIE Stable balance display. */
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
] as const;
