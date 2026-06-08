import { ExternalLink, Fuel } from "lucide-react";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useChainId } from "wagmi";
import { qieMainnet, qieTestnet } from "@/lib/chains";

export const QIE_DEX_URL = "https://www.dex.qie.digital/";

const LOW_GAS_THRESHOLD = parseEther("0.02");
const SUPPORTED = new Set<number>([qieTestnet.id, qieMainnet.id]);

export function GasTopUpBanner() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const balance = useBalance({
    address,
    query: { enabled: isConnected && !!address && SUPPORTED.has(chainId) },
  });

  if (!isConnected || !address || !SUPPORTED.has(chainId) || !balance.data) return null;
  if (balance.data.value >= LOW_GAS_THRESHOLD) return null;

  return (
    <div className="border-b border-warning/30 bg-warning/10 text-warning">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <span className="inline-flex items-center gap-2">
          <Fuel className="h-3 w-3 shrink-0" />
          Low gas balance: {Number(formatEther(balance.data.value)).toFixed(4)}{" "}
          {balance.data.symbol}
        </span>
        <a
          href={QIE_DEX_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-warning underline underline-offset-2"
        >
          Get QIE for gas <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
