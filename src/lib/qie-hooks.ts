import { useChainId, useReadContract } from "wagmi";
import { useMemo } from "react";
import { formatUnits } from "viem";
import {
  ERC20_ABI,
  ERC721_BALANCE_OF_ABI,
  ORACLE_FALLBACK_RATE,
  QIE_ORACLE_ABI,
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
    query: { enabled, refetchInterval: 30_000 },
  });

  return {
    configured: !!pass,
    verified: enabled ? (data ?? 0n) > 0n : false,
    isLoading: enabled && isLoading,
    isError,
    refetch,
  };
}

/**
 * On-chain rate feed for invoice math.
 *
 * Invoice unit is QUSDC (USD-pegged), so the USD→QUSDC `rate` is always 1.
 * We additionally call the QIE Oracle's `getPrice("QIE")` so the UI can show
 * a live native-QIE price and prove the oracle is reachable on-chain.
 * `live` flips true only when the oracle contract actually returns a value.
 */
export function useQieOracle() {
  const chainId = useChainId();
  const { oracle } = getQieContracts(chainId);
  const enabled = !!oracle;

  const { data, isLoading, isError } = useReadContract({
    address: oracle ?? undefined,
    abi: QIE_ORACLE_ABI,
    functionName: "getPrice",
    args: ["QIE"],
    query: { enabled, refetchInterval: 30_000 },
  });

  return useMemo(() => {
    // QIE Oracle follows Chainlink conventions: uint256 price with 8 decimals.
    const raw = (data as bigint | undefined) ?? 0n;
    const qiePriceUsd = raw > 0n ? Number(formatUnits(raw, 8)) : null;
    return {
      rate: ORACLE_FALLBACK_RATE, // 1 USD = 1 QUSDC (peg)
      qiePriceUsd,
      configured: enabled,
      live: enabled && !isError && raw > 0n,
      isLoading: enabled && isLoading,
    };
  }, [data, enabled, isError, isLoading]);
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