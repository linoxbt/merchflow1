import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useReadContract } from "wagmi";
import { getMerchantByWallet } from "@/lib/merchants.functions";
import { qieTestnet } from "@/lib/chains";
import { getQieContracts, hasQieMerchantRegistry } from "@/lib/qie-contracts";
import {
  MERCHANT_REGISTRY_ABI,
  isRegisteredMerchantRow,
  merchantProfileFromRegistry,
  type MerchantRegistryRow,
} from "@/lib/merchant-registry";
import { toast } from "sonner";

export const QIE_WALLET_URL = "https://www.qiewallet.me/";

export type MerchantProfile = {
  address: string;
  businessName: string;
  category: string;
  description?: string;
  website?: string;
  registeredAt: number;
  metadataHash?: `0x${string}`;
  categoryHash?: `0x${string}`;
  source?: "local" | "supabase" | "onchain";
};

type WalletState = {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  merchantLoading: boolean;
  merchant: MerchantProfile | null;
  connect: () => void;
  disconnect: () => void;
  setMerchant: (m: MerchantProfile) => void;
};

const WalletCtx = createContext<WalletState | null>(null);
const STORAGE_KEY = "merchflow:profile";

type StoredByAddress = Record<string, { merchant?: MerchantProfile }>;

function readStore(): StoredByAddress {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStore(s: StoredByAddress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address: wagmiAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { connectAsync, connectors, isPending: connecting } = useConnect();

  const address = wagmiAddress ?? null;
  const { merchantRegistry } = getQieContracts(chainId);
  const anyRegistryConfigured = hasQieMerchantRegistry();
  const [merchant, setMerchantState] = useState<MerchantProfile | null>(null);
  const [merchantLoading, setMerchantLoading] = useState(false);

  const registry = useReadContract({
    address: merchantRegistry ?? undefined,
    abi: MERCHANT_REGISTRY_ABI,
    functionName: "getMerchant",
    args: address ? [address] : undefined,
    query: {
      enabled: !!merchantRegistry && !!address,
      refetchInterval: 15_000,
    },
  });

  // Load per-address profile when address changes
  useEffect(() => {
    if (!address) {
      setMerchantState(null);
      setMerchantLoading(false);
      return;
    }
    const store = readStore();
    const entry = store[address.toLowerCase()];
    setMerchantState(entry?.merchant ?? null);

    if (anyRegistryConfigured) {
      if (!merchantRegistry) {
        setMerchantState(null);
        setMerchantLoading(false);
        return;
      }
      setMerchantLoading(true);
      return;
    }

    // Supabase remains a fallback only until a merchant registry is deployed/configured.
    let cancelled = false;
    setMerchantLoading(!entry?.merchant);
    getMerchantByWallet({ data: { wallet: address } })
      .then(({ merchant: row }) => {
        if (cancelled || !row) return;
        const hydrated: MerchantProfile = {
          address,
          businessName: row.business_name,
          category: row.category ?? "",
          description: row.description ?? "",
          website: row.website ?? "",
          registeredAt: row.onboarded_at ? new Date(row.onboarded_at).getTime() : Date.now(),
          source: "supabase",
        };
        setMerchantState(hydrated);
        const store2 = readStore();
        store2[address.toLowerCase()] = {
          merchant: hydrated,
        };
        writeStore(store2);
      })
      .catch((err) => console.error("Failed to load merchant", err))
      .finally(() => {
        if (!cancelled) setMerchantLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, anyRegistryConfigured, merchantRegistry]);

  useEffect(() => {
    if (!address || !merchantRegistry) return;
    if (registry.isLoading) {
      setMerchantLoading(true);
      return;
    }
    if (registry.error) {
      console.error("Failed to load on-chain merchant", registry.error);
      setMerchantLoading(false);
      return;
    }

    const row = registry.data as MerchantRegistryRow | undefined;
    const store = readStore();
    const cached = store[address.toLowerCase()]?.merchant;

    if (isRegisteredMerchantRow(row)) {
      const hydrated = merchantProfileFromRegistry(row, address, cached);
      setMerchantState(hydrated);
      store[address.toLowerCase()] = { merchant: hydrated };
      writeStore(store);
    } else if (registry.data) {
      setMerchantState(null);
    }
    setMerchantLoading(false);
  }, [address, merchantRegistry, registry.data, registry.error, registry.isLoading]);

  const persist = useCallback(
    (patch: { merchant?: MerchantProfile | null }) => {
      if (!address) return;
      const key = address.toLowerCase();
      const store = readStore();
      const prev = store[key] ?? {};
      store[key] = {
        merchant: patch.merchant === undefined ? prev.merchant : (patch.merchant ?? undefined),
      };
      writeStore(store);
    },
    [address],
  );

  const setMerchant = useCallback(
    (m: MerchantProfile) => {
      setMerchantState(m);
      persist({ merchant: m });
    },
    [persist],
  );

  const connect = useCallback(() => {
    const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];
    const hasInjectedProvider =
      typeof window !== "undefined" &&
      Boolean((window as Window & { ethereum?: unknown }).ethereum);

    if (!hasInjectedProvider) {
      toast.error("QIE Wallet not detected", {
        description: "Install or open QIE Wallet, then try again.",
        action: {
          label: "Get QIE Wallet",
          onClick: () => window.open(QIE_WALLET_URL, "_blank", "noreferrer"),
        },
      });
      return;
    }

    if (!injected) {
      toast.error("No injected wallet connector found");
      return;
    }

    connectAsync({ connector: injected, chainId: qieTestnet.id }).catch((err) => {
      toast.error("Could not connect QIE Wallet", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    });
  }, [connectAsync, connectors]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setMerchantState(null);
  }, [wagmiDisconnect]);

  const value = useMemo<WalletState>(
    () => ({
      address,
      connected: isConnected && !!address,
      connecting,
      merchantLoading,
      merchant,
      connect,
      disconnect,
      setMerchant,
    }),
    [address, isConnected, connecting, merchantLoading, merchant, connect, disconnect, setMerchant],
  );

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function truncateAddress(addr: string | null | undefined, head = 6, tail = 4) {
  if (!addr) return "";
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
