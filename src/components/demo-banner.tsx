import { Info } from "lucide-react";
import { useChainId } from "wagmi";
import { getQieContracts } from "@/lib/qie-contracts";
import { qieTestnet, qieMainnet } from "@/lib/chains";

/**
 * Surfaces which QIE contract addresses are not yet configured for the
 * current chain. Wallet, payments, and QR are always live — this banner only
 * appears when on-chain contract reads (Pass / Stable / Oracle) would no-op
 * because their addresses haven't been provided yet. Configure via
 * VITE_QIE_PASS_*, VITE_QIE_STABLE_*, VITE_QIE_ORACLE_*, VITE_QIE_DEX_*.
 */
export function DemoBanner() {
  const chainId = useChainId();
  const { stable, oracle, pass, dexRouter } = getQieContracts(
    chainId ?? qieTestnet.id,
  );

  const missing = [
    !pass && "Pass",
    !stable && "Stable",
    !oracle && "Oracle",
    !dexRouter && "DEX",
  ].filter(Boolean) as string[];

  if (missing.length === 0) return null;

  const network =
    chainId === qieMainnet.id ? "QIE Mainnet" :
    chainId === qieTestnet.id ? "QIE Testnet" :
    "current network";

  return (
    <div className="border-b border-warning/30 bg-warning/10 text-warning">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-1.5 flex items-center gap-2 text-[11px] font-mono">
        <Info className="h-3 w-3 shrink-0" />
        <span>
          {missing.join(" · ")} contract{missing.length > 1 ? "s" : ""} not
          configured for {network}. Set the VITE_QIE_* env var
          {missing.length > 1 ? "s" : ""} to enable on-chain calls.
        </span>
      </div>
    </div>
  );
}
