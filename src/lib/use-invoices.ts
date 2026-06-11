import { useMemo } from "react";
import { useChainId, useReadContract, useReadContracts } from "wagmi";
import { getQieContracts, hasQieInvoiceRegistry } from "@/lib/qie-contracts";
import {
  INVOICE_REGISTRY_ABI,
  contractInvoiceToRow,
  type InvoiceRegistryRow,
} from "@/lib/invoice-registry";
import type { InvoiceRow } from "@/lib/types";

export function useMerchantInvoices(address: string | null | undefined) {
  const chainId = useChainId();
  const { invoiceRegistry } = getQieContracts(chainId);
  const anyInvoiceRegistryConfigured = hasQieInvoiceRegistry();
  const normalizedAddress = address?.toLowerCase();
  const queryKey = useMemo(() => ["invoices", normalizedAddress] as const, [normalizedAddress]);
  const usingOnchain = Boolean(invoiceRegistry && address);
  const wrongNetwork = Boolean(anyInvoiceRegistryConfigured && !invoiceRegistry);

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

  const invoices = usingOnchain ? onchainInvoices : [];
  const isLoading = usingOnchain
    ? idsQuery.isLoading || (invoiceIds.length > 0 && rowsQuery.isLoading)
    : false;

  return {
    invoices,
    isLoading,
    queryKey,
    chainId,
    invoiceRegistry,
    usingOnchain,
    wrongNetwork,
  };
}
