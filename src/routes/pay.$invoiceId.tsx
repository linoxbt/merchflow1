import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, Wallet } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useConfig, useSendTransaction, useWriteContract } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { formatQie, num, type InvoiceRow } from "@/lib/mock-data";
import { qieMainnet, qieTestnet } from "@/lib/chains";
import { getInvoiceByNumber, markInvoicePaid } from "@/lib/invoices.functions";
import { getQieContracts, ERC20_ABI } from "@/lib/qie-contracts";
import { trackTx } from "@/lib/tx-toast";
import { toast } from "sonner";

export const Route = createFileRoute("/pay/$invoiceId")({
  head: ({ params }) => ({ meta: [{ title: `Pay ${params.invoiceId} — MerchFlow` }] }),
  component: PayPage,
});

function PayPage() {
  const { invoiceId } = Route.useParams();
  const getInv = useServerFn(getInvoiceByNumber);
  const markPaid = useServerFn(markInvoicePaid);
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInv({ data: { number: invoiceId } }),
    refetchInterval: 5000,
  });
  const invoice = (data?.invoice ?? null) as InvoiceRow | null;

  useEffect(() => {
    if (invoice?.tx_hash && !txHash) setTxHash(invoice.tx_hash);
  }, [invoice?.tx_hash, txHash]);

  if (isLoading) {
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
          The invoice <span className="font-mono">{invoiceId}</span> does not exist or has been cancelled.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary text-sm hover:underline">
          Back to MerchFlow
        </Link>
      </div>
    );
  }

  const onQie = chainId === qieTestnet.id || chainId === qieMainnet.id;
  const explorer = chainId === qieMainnet.id
    ? qieMainnet.blockExplorers.default.url
    : qieTestnet.blockExplorers.default.url;
  const { stable } = getQieContracts(chainId);

  async function pay() {
    if (!invoice || !address) return;
    if (!onQie) { toast.error("Switch to a QIE network first"); return; }
    try {
      let hash: `0x${string}`;
      if (stable) {
        // Pay via ERC-20 QIE Stable
        hash = await writeContractAsync({
          address: stable,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [
            invoice.merchant_wallet as `0x${string}`,
            parseUnits(num(invoice.amount_qie).toFixed(6), 18),
          ],
        });
      } else {
        // Fall back to native QIE coin transfer
        hash = await sendTransactionAsync({
          to: invoice.merchant_wallet as `0x${string}`,
          value: parseEther(num(invoice.amount_qie).toFixed(6)),
        });
      }
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
        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Invoice</div>
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
              <div className="text-xs text-muted-foreground">≈ ${num(invoice.amount_usd).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {invoice.status === "paid" ? (
            <div className="rounded-md border border-success/30 bg-success/10 p-4 text-success">
              <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Paid
              </div>
              {invoice.tx_hash && (
                <a
                  href={`${explorer}/tx/${invoice.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-mono break-all hover:underline"
                >
                  {invoice.tx_hash} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </div>
          ) : !isConnected ? (
            <div className="rounded-md border border-border bg-surface p-4 text-center">
              <Wallet className="mx-auto h-6 w-6 text-primary mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Connect your QIE wallet to pay this invoice.
              </p>
              <ConnectButton />
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground font-mono">
                Paying from {address?.slice(0, 6)}…{address?.slice(-4)}
                {stable ? " · via QIE Stable" : " · via native QIE"}
              </div>
              <Button
                onClick={pay}
                disabled={sending || writing}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                {(sending || writing) ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirm in wallet…</>
                ) : (
                  <>Pay {formatQie(num(invoice.amount_qie))} QIE <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Recipient: {invoice.merchant_wallet.slice(0, 8)}…{invoice.merchant_wallet.slice(-6)}</span>
          <Link to="/" className="text-primary hover:underline">MerchFlow</Link>
        </div>
      </div>
    </div>
  );
}
