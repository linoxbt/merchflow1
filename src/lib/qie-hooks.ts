import { useChainId, useReadContract } from "wagmi";
import { useMemo } from "react";
import { formatUnits } from "viem";
import { ERC20_ABI, getQieContracts } from "./qie-contracts";

/** ERC-20 QIE Stable balance for the connected wallet. */
export function useQieStableBalance(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const { stable } = getQieContracts(chainId);
  const enabled = !!stable && !!address;
  const balance = useReadContract({
    address: stable ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 15_000 },
  });
  const decimals = useReadContract({
    address: stable ?? undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled },
  });

  return useMemo(() => {
    if (!enabled) return { configured: false, balance: 0, raw: 0n, decimals: 18 };
    if (balance.data == null || decimals.data == null)
      return { configured: true, balance: 0, raw: 0n, decimals: 18, isLoading: true };
    const d = Number(decimals.data);
    return {
      configured: true,
      balance: Number(formatUnits(balance.data as bigint, d)),
      raw: balance.data as bigint,
      decimals: d,
      isLoading: false,
    };
  }, [enabled, balance.data, decimals.data]);
}
