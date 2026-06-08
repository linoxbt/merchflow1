import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChainId, useReadContract, useReadContracts } from "wagmi";
import { listInvoicesByMerchant } from "@/lib/invoices.functions";
import { getQieContracts, hasQieInvoiceRegistry } from "@/lib/qie-contracts";
import {
  INVOICE_REGISTRY_ABI,
  contractInvoiceToRow,
  type InvoiceRegistryRow,
} from "@/lib/invoice-registry";
import type { InvoiceRow } from "@/lib/types";

export function useMerchantInvoices(address: string | null | undefined) {
  const list = useServerFn(listInvoicesByMerchant);
  const chainId = useChainId();
  const { invoiceRegistry } = getQieContracts(chainId);
  const anyInvoiceRegistryConfigured = hasQieInvoiceRegistry();
  const normalizedAddress = address?.toLowerCase();
  const queryKey = useMemo(() => ["invoices", normalizedAddress] as const, [normalizedAddress]);
  const usingOnchain = Boolean(invoiceRegistry && address);
  const usingSupabase = Boolean(!anyInvoiceRegistryConfigured && address);
  const wrongNetwork = Boolean(anyInvoiceRegistryConfigured && !invoiceRegistry);

  const supabase = useQuery({
    queryKey,
    enabled: usingSupabase,
    queryFn: () => list({ data: { wallet: address! } }),
  });

  const idsQuery = useReadContract({
    address: invoiceRegistry ?? undefined,
    abi: INVOICE_REGISTRY_ABI,
    functionName: "getMerchantInvoices",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: usingOnchain,
      refetchInterval: 10_000,
    },
  });

  const invoiceIds = useMemo(() => {
    const ids = (idsQuery.data ?? []) as readonly `0x${string}`[];
    return [...ids].reverse();
  }, [idsQuery.data]);

  const contracts = useMemo(() => {
    if (!usingOnchain || !invoiceRegistry) return [];
    return invoiceIds.map((invoiceId) => ({
      address: invoiceRegistry,
      abi: INVOICE_REGISTRY_ABI,
      functionName: "getInvoice" as const,
      args: [invoiceId] as const,
    }));
  }, [invoiceIds, invoiceRegistry, usingOnchain]);

  const rowsQuery = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: 10_000,
    },
  });

  const onchainInvoices = useMemo(() => {
    return (rowsQuery.data ?? [])
      .map((item) =>
        item.status === "success" ? contractInvoiceToRow(item.result as InvoiceRegistryRow) : null,
      )
      .filter((row): row is InvoiceRow => Boolean(row));
  }, [rowsQuery.data]);

  const supabaseInvoices = useMemo(
    () => (supabase.data?.invoices ?? []) as InvoiceRow[],
    [supabase.data?.invoices],
  );

  const invoices = usingOnchain ? onchainInvoices : usingSupabase ? supabaseInvoices : [];
  const isLoading = usingOnchain
    ? idsQuery.isLoading || (invoiceIds.length > 0 && rowsQuery.isLoading)
    : usingSupabase
      ? supabase.isLoading
      : false;

  return {
    invoices,
    isLoading,
    queryKey,
    chainId,
    invoiceRegistry,
    usingOnchain,
    usingSupabase,
    wrongNetwork,
  };
}
