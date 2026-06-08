import { LogOut, Wallet } from "lucide-react";
import { useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { qieMainnet, qieTestnet } from "@/lib/chains";
import { QIE_WALLET_URL, truncateAddress, useWallet } from "@/lib/wallet";
import { cn } from "@/lib/utils";

function chainName(chainId: number | undefined) {
  if (chainId === qieTestnet.id) return "Testnet";
  if (chainId === qieMainnet.id) return "Mainnet";
  return "QIE";
}

export function QieWalletButton({
  size = "default",
  className,
}: {
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { address, connected, connecting, connect, disconnect } = useWallet();
  const chainId = useChainId();

  if (!connected) {
    return (
      <Button
        size={size}
        onClick={connect}
        disabled={connecting}
        className={cn("bg-primary hover:bg-primary/90 text-primary-foreground", className)}
      >
        <Wallet className="h-4 w-4 mr-2" />
        {connecting ? "Connecting..." : "Connect QIE Wallet"}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button size={size} variant="ghost" className="border border-border font-mono">
        {chainName(chainId)} · {truncateAddress(address)}
      </Button>
      <Button
        size={size}
        variant="ghost"
        onClick={disconnect}
        className="border border-border px-2"
        aria-label="Disconnect wallet"
        title="Disconnect wallet"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function QieWalletInstallLink() {
  return (
    <a href={QIE_WALLET_URL} target="_blank" rel="noreferrer" className="text-primary underline">
      QIE Wallet
    </a>
  );
}
