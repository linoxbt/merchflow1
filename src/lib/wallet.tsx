import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { getMerchantByWallet } from "@/lib/merchants.functions";
import { qieTestnet } from "@/lib/chains";
import { toast } from "sonner";

export const QIE_WALLET_URL = "https://www.qiewallet.me/";

export type MerchantProfile = {
  address: string;
  businessName: string;
  category: string;
  description?: string;
  website?: string;
  registeredAt: number;
};

type WalletState = {
  address: string | null;
  connected: boolean;
  connecting: boolean;
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
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { connectAsync, connectors, isPending: connecting } = useConnect();

  const address = wagmiAddress ?? null;
  const [merchant, setMerchantState] = useState<MerchantProfile | null>(null);

  // Load per-address profile when address changes
  useEffect(() => {
    if (!address) {
      setMerchantState(null);
      return;
    }
    const store = readStore();
    const entry = store[address.toLowerCase()];
    setMerchantState(entry?.merchant ?? null);

    // Hydrate from Supabase (source of truth)
    let cancelled = false;
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
        };
        setMerchantState(hydrated);
        const store2 = readStore();
        store2[address.toLowerCase()] = {
          merchant: hydrated,
        };
        writeStore(store2);
      })
      .catch((err) => console.error("Failed to load merchant", err));
    return () => {
      cancelled = true;
    };
  }, [address]);

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
      merchant,
      connect,
      disconnect,
      setMerchant,
    }),
    [address, isConnected, connecting, merchant, connect, disconnect, setMerchant],
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
