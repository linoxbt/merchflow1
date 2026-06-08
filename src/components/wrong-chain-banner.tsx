import { AlertTriangle } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { qieMainnet, qieTestnet } from "@/lib/chains";
import { Button } from "@/components/ui/button";

const SUPPORTED = new Set<number>([qieTestnet.id, qieMainnet.id]);

export function WrongChainBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;
  if (SUPPORTED.has(chainId)) return null;

  return (
    <div className="border-b border-warning/40 bg-warning/15 text-warning">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Wrong network — MerchFlow runs on QIE. Switch to continue.</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => switchChain({ chainId: qieTestnet.id })}
            className="h-7 px-3 border border-warning/40 hover:bg-warning/20"
          >
            Testnet
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => switchChain({ chainId: qieMainnet.id })}
            className="h-7 px-3 border border-warning/40 hover:bg-warning/20"
          >
            Mainnet
          </Button>
        </div>
      </div>
    </div>
  );
}
