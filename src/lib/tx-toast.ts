import { toast } from "sonner";
import type { Config } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { qieMainnet, qieTestnet } from "./chains";

function explorerFor(chainId: number) {
  if (chainId === qieTestnet.id) return qieTestnet.blockExplorers.default.url;
  if (chainId === qieMainnet.id) return qieMainnet.blockExplorers.default.url;
  return null;
}

/**
 * Subscribes to a tx hash, shows submitted → confirmed/failed toast with
 * an explorer link. Returns the receipt (or null on failure).
 */
export async function trackTx(
  config: Config,
  hash: `0x${string}`,
  opts: { chainId: number; label?: string } = { chainId: qieTestnet.id },
) {
  const explorer = explorerFor(opts.chainId);
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  const url = explorer ? `${explorer}/tx/${hash}` : undefined;

  const id = toast.loading(`${opts.label ?? "Transaction"} submitted`, {
    description: short,
    action: url ? { label: "Explorer", onClick: () => window.open(url, "_blank") } : undefined,
  });

  try {
    const receipt = await waitForTransactionReceipt(config, { hash, chainId: opts.chainId });
    if (receipt.status === "success") {
      toast.success(`${opts.label ?? "Transaction"} confirmed`, {
        id,
        description: short,
        action: url ? { label: "View", onClick: () => window.open(url, "_blank") } : undefined,
      });
    } else {
      toast.error(`${opts.label ?? "Transaction"} reverted`, { id, description: short });
    }
    return receipt;
  } catch (e) {
    toast.error(`${opts.label ?? "Transaction"} failed`, {
      id,
      description: e instanceof Error ? e.message : "Unknown error",
    });
    return null;
  }
}
