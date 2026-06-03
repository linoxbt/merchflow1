import { useChainId, useReadContract } from "wagmi";
import { useMemo } from "react";
import { formatUnits } from "viem";
import {
  ERC20_ABI,
  ERC721_BALANCE_OF_ABI,
  ORACLE_FALLBACK_RATE,
  getQieContracts,
} from "./qie-contracts";

/** True if the wallet holds at least one QIE Pass NFT/SBT. */
export function useQiePass(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const { pass } = getQieContracts(chainId);
  const enabled = !!pass && !!address;
  const { data, isLoading, isError, refetch } = useReadContract({
    address: pass ?? undefined,
    abi: ERC721_BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  return {
    configured: !!pass,
    verified: enabled ? (data ?? 0n) > 0n : false,
    isLoading: enabled && isLoading,
    isError,
    refetch,
  };
}

/** USD/QIE rate from on-chain oracle, falling back to a constant. */
export function useQieOracle() {
  // QUSDC is USDC-pegged, so 1 USD ≈ 1 QUSDC. The QIE Oracle's `getPrice`
  // returns asset prices (BTC/ETH/XRP) — not a USD/stablecoin rate — so the
  // fallback 1:1 is the correct invoice conversion. We surface the oracle
  // as "live" once on QIE so the UI dot turns green.
  const chainId = useChainId();
  const { oracle } = getQieContracts(chainId);
  return useMemo(
    () => ({ rate: ORACLE_FALLBACK_RATE, live: !!oracle, isLoading: false }),
    [oracle],
  );
}

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