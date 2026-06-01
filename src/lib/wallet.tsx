import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
const STORAGE_KEY = "merchflow:wallet";

function randomAddress() {
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 40; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [merchant, setMerchantState] = useState<MerchantProfile | null>(null);
  const [qiePassVerified, setPassVerified] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.address) setAddress(parsed.address);
      if (parsed.merchant) setMerchantState(parsed.merchant);
      if (parsed.qiePassVerified) setPassVerified(true);
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ address, merchant, qiePassVerified }),
    );
  }, [address, merchant, qiePassVerified]);

  const connect = useCallback(() => {
    setAddress((prev) => prev ?? randomAddress());
  }, []);
  const disconnect = useCallback(() => {
    setAddress(null);
    setMerchantState(null);
    setPassVerified(false);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }, []);
  const setMerchant = useCallback((m: MerchantProfile) => setMerchantState(m), []);

  const value = useMemo<WalletState>(
    () => ({
      address,
      connected: !!address,
      merchant,
      qiePassVerified,
      connect,
      disconnect,
      setMerchant,
      setPassVerified,
    }),
    [address, merchant, qiePassVerified, connect, disconnect, setMerchant],
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