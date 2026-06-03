import { Info } from "lucide-react";
import { useChainId } from "wagmi";
import { getQieContracts } from "@/lib/qie-contracts";
import { qieTestnet } from "@/lib/chains";

export function DemoBanner() {
  const chainId = useChainId();
  const { stable, oracle, pass } = getQieContracts(chainId ?? qieTestnet.id);
  const fullyWired = stable && oracle && pass;
  if (fullyWired) return null;

  return (
    <div className="border-b border-warning/30 bg-warning/10 text-warning">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-1.5 flex items-center gap-2 text-[11px] font-mono">
        <Info className="h-3 w-3 shrink-0" />
        <span>
          QIE contract addresses not yet configured — wallet & QR are live, but Pass /
          Stable / Oracle calls use Supabase + fallback rate. Set
          {" "}<code className="bg-warning/15 px-1 rounded">VITE_QIE_*</code> env vars to go fully on-chain.
        </span>
      </div>
    </div>
  );
}
