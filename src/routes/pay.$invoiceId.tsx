import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, Wallet } from "lucide-react";
import {
  useAccount,
  useChainId,
  useConfig,
  useReadContract,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import { parseEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { formatQie, num, type InvoiceRow } from "@/lib/types";
import { qieMainnet, qieTestnet } from "@/lib/chains";
import { getQieContracts, hasQieInvoiceRegistry } from "@/lib/qie-contracts";
import { getInvoiceByNumber, markInvoicePaid } from "@/lib/invoices.functions";
import {
  INVOICE_REGISTRY_ABI,
  amountQieToWei,
  contractInvoiceToRow,
  invoiceIdFromNumber,
  type InvoiceRegistryRow,
} from "@/lib/invoice-registry";
import { trackTx } from "@/lib/tx-toast";
import { toast } from "sonner";
import { QieWalletButton } from "@/components/qie-wallet-button";

export const Route = createFileRoute("/pay/$invoiceId")({
  head: ({ params }) => ({ meta: [{ title: `Pay ${params.invoiceId} — MerchFlow` }] }),
  component: PayRoute,
});

function PayRoute() {
  const { invoiceId } = Route.useParams();
  return <PayPage invoiceId={invoiceId} />;
}

export function PayPage({ invoiceId }: { invoiceId: string }) {
  const getInv = useServerFn(getInvoiceByNumber);
  const markPaid = useServerFn(markInvoicePaid);
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const { writeContractAsync, isPending: writing } = useWriteContract();
  const { invoiceRegistry } = getQieContracts(chainId);
  const onchainRegistryConfigured = hasQieInvoiceRegistry();
  const usingOnchain = Boolean(invoiceRegistry);
  const wrongNetwork = Boolean(onchainRegistryConfigured && !invoiceRegistry);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    enabled: !onchainRegistryConfigured,
    queryFn: () => getInv({ data: { number: invoiceId } }),
    refetchInterval: 5000,
  });
  const contractInvoice = useReadContract({
    address: invoiceRegistry ?? undefined,
    abi: INVOICE_REGISTRY_ABI,
    functionName: "getInvoice",
    args: invoiceRegistry ? [invoiceIdFromNumber(invoiceId)] : undefined,
    query: {
      enabled: usingOnchain,
      refetchInterval: 5000,
    },
  });
  const invoice = usingOnchain
    ? contractInvoiceToRow(contractInvoice.data as InvoiceRegistryRow | undefined)
    : ((data?.invoice ?? null) as InvoiceRow | null);

  useEffect(() => {
    if (invoice?.tx_hash && !txHash) setTxHash(invoice.tx_hash);
  }, [invoice?.tx_hash, txHash]);

  if (wrongNetwork) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-mono text-2xl font-bold">Switch QIE network</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This invoice is stored on-chain, but the invoice registry is not configured on the
          currently selected network.
        </p>
        <div className="mt-6 flex justify-center">
          <QieWalletButton />
        </div>
      </div>
    );
  }

  if (isLoading || contractInvoice.isLoading) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-muted-foreground">
        Loading invoice…
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-mono text-2xl font-bold">Invoice not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The invoice <span className="font-mono">{invoiceId}</span> does not exist or has been
          cancelled.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary text-sm hover:underline">
          Back to MerchFlow
        </Link>
      </div>
    );
  }

  const onQie = chainId === qieTestnet.id || chainId === qieMainnet.id;
  const explorer =
    chainId === qieMainnet.id
      ? qieMainnet.blockExplorers.default.url
      : qieTestnet.blockExplorers.default.url;
  const displayedTxHash = invoice.tx_hash ?? txHash;

  async function pay() {
    if (!invoice || !address) return;
    if (!onQie) {
      toast.error("Switch to a QIE network first");
      return;
    }
    try {
      if (usingOnchain && invoiceRegistry) {
        const hash = await writeContractAsync({
          address: invoiceRegistry,
          abi: INVOICE_REGISTRY_ABI,
          functionName: "payInvoice",
          args: [invoiceIdFromNumber(invoice.number)],
          value: amountQieToWei(num(invoice.amount_qie)),
        });
        setTxHash(hash);

        const receipt = await trackTx(config, hash, { chainId, label: "Payment" });
        if (receipt?.status === "success") await contractInvoice.refetch();
        return;
      }

      const hash = await sendTransactionAsync({
        to: invoice.merchant_wallet as `0x${string}`,
        value: parseEther(num(invoice.amount_qie).toFixed(6)),
      });
      setTxHash(hash);

      const receipt = await trackTx(config, hash, { chainId, label: "Payment" });
      if (receipt?.status === "success") {
        await markPaid({ data: { number: invoice.number, txHash: hash, payerWallet: address } });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction rejected";
      toast.error("Payment failed", { description: msg });
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Invoice
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <h1 className="font-mono text-2xl font-bold">{invoice.number}</h1>
          <span className="text-xs text-muted-foreground">Due {invoice.due_date}</span>
        </div>

        <p className="mt-4 text-sm text-foreground">{invoice.description}</p>

        <div className="mt-6 rounded-md border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase font-mono text-muted-foreground">Amount</span>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-primary">
                {formatQie(num(invoice.amount_qie))} QIE
              </div>
              <div className="text-xs text-muted-foreground">
                ≈ ${num(invoice.amount_usd).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {invoice.status === "paid" ? (
            <div className="rounded-md border border-success/30 bg-success/10 p-4 text-success">
              <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Paid
              </div>
              {displayedTxHash && (
                <a
                  href={`${explorer}/tx/${displayedTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-mono break-all hover:underline"
                >
                  {displayedTxHash} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </div>
          ) : !isConnected ? (
            <div className="rounded-md border border-border bg-surface p-4 text-center">
              <Wallet className="mx-auto h-6 w-6 text-primary mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Connect your QIE wallet to pay this invoice.
              </p>
              <QieWalletButton />
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground font-mono">
                Paying from {address?.slice(0, 6)}…{address?.slice(-4)}
                {" · via native QIE"}
              </div>
              <Button
                onClick={pay}
                disabled={sending || writing}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                {sending || writing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirm in wallet…
                  </>
                ) : (
                  <>
                    Pay {formatQie(num(invoice.amount_qie))} QIE{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>
            Recipient: {invoice.merchant_wallet.slice(0, 8)}…{invoice.merchant_wallet.slice(-6)}
          </span>
          <Link to="/" className="text-primary hover:underline">
            MerchFlow
          </Link>
        </div>
      </div>
    </div>
  );
}
