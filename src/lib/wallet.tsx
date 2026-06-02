import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getMerchantByWallet } from "@/lib/merchants.functions";

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
  merchant: MerchantProfile | null;
  qiePassVerified: boolean;
  connect: () => void;
  disconnect: () => void;
  setMerchant: (m: MerchantProfile) => void;
  setPassVerified: (v: boolean) => void;
};

const WalletCtx = createContext<WalletState | null>(null);
const STORAGE_KEY = "merchflow:profile";

type StoredByAddress = Record<string, { merchant?: MerchantProfile; qiePassVerified?: boolean }>;

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
  const { openConnectModal } = useConnectModal();

  const address = wagmiAddress ?? null;
  const [merchant, setMerchantState] = useState<MerchantProfile | null>(null);
  const [qiePassVerified, setPassVerifiedState] = useState(false);

  // Load per-address profile when address changes
  useEffect(() => {
    if (!address) {
      setMerchantState(null);
      setPassVerifiedState(false);
      return;
    }
    const store = readStore();
    const entry = store[address.toLowerCase()];
    setMerchantState(entry?.merchant ?? null);
    setPassVerifiedState(!!entry?.qiePassVerified);

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
          registeredAt: row.onboarded_at
            ? new Date(row.onboarded_at).getTime()
            : Date.now(),
        };
        setMerchantState(hydrated);
        setPassVerifiedState(!!row.qie_pass_verified);
        const store2 = readStore();
        store2[address.toLowerCase()] = {
          merchant: hydrated,
          qiePassVerified: !!row.qie_pass_verified,
        };
        writeStore(store2);
      })
      .catch((err) => console.error("Failed to load merchant", err));
    return () => {
      cancelled = true;
    };
  }, [address]);

  const persist = useCallback(
    (patch: { merchant?: MerchantProfile | null; qiePassVerified?: boolean }) => {
      if (!address) return;
      const key = address.toLowerCase();
      const store = readStore();
      const prev = store[key] ?? {};
      store[key] = {
        merchant: patch.merchant === undefined ? prev.merchant : patch.merchant ?? undefined,
        qiePassVerified: patch.qiePassVerified ?? prev.qiePassVerified,
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

  const setPassVerified = useCallback(
    (v: boolean) => {
      setPassVerifiedState(v);
      persist({ qiePassVerified: v });
    },
    [persist],
  );

  const connect = useCallback(() => {
    openConnectModal?.();
  }, [openConnectModal]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setMerchantState(null);
    setPassVerifiedState(false);
  }, [wagmiDisconnect]);

  const value = useMemo<WalletState>(
    () => ({
      address,
      connected: isConnected && !!address,
      merchant,
      qiePassVerified,
      connect,
      disconnect,
      setMerchant,
      setPassVerified,
    }),
    [address, isConnected, merchant, qiePassVerified, connect, disconnect, setMerchant, setPassVerified],
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
