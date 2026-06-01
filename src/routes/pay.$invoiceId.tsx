import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, Wallet } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import { Button } from "@/components/ui/button";
import { MOCK_INVOICES, ORACLE_RATE, formatQie } from "@/lib/mock-data";
import { qieTestnet } from "@/lib/chains";
import { toast } from "sonner";

export const Route = createFileRoute("/pay/$invoiceId")({
  head: ({ params }) => ({
    meta: [{ title: `Pay ${params.invoiceId} — MerchFlow` }],
  }),
  component: PayPage,
});

function PayPage() {
  const { invoiceId } = Route.useParams();
  const invoice = MOCK_INVOICES.find((i) => i.id === invoiceId);
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { sendTransactionAsync, isPending } = useSendTransaction();
  const [txHash, setTxHash] = useState<string | null>(null);

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

  const explorer = chainId === qieTestnet.id
    ? qieTestnet.blockExplorers.default.url
    : "https://mainnet.qie.digital";

  async function pay() {
    if (!invoice) return;
    try {
      const hash = await sendTransactionAsync({
        to: invoice.customer as `0x${string}`,
        value: parseEther(invoice.amountQie.toFixed(6)),
      });
      setTxHash(hash);
      toast.success("Payment submitted", { description: hash });
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
          <h1 className="font-mono text-2xl font-bold">{invoice.id}</h1>
          <span className="text-xs text-muted-foreground">Due {invoice.dueDate}</span>
        </div>

        <p className="mt-4 text-sm text-foreground">{invoice.description}</p>

        <div className="mt-6 rounded-md border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase font-mono text-muted-foreground">Amount</span>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-primary">
                {formatQie(invoice.amountQie)} QIE
              </div>
              <div className="text-xs text-muted-foreground">
                ≈ ${invoice.amountUsd.toFixed(2)} · {ORACLE_RATE.toFixed(3)} QIE/USD
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {txHash ? (
            <div className="rounded-md border border-success/30 bg-success/10 p-4 text-success">
              <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Payment sent
              </div>
              <a
                href={`${explorer}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-mono break-all hover:underline"
              >
                {txHash} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
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
              </div>
              <Button
                onClick={pay}
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirm in wallet…</>
                ) : (
                  <>Pay {formatQie(invoice.amountQie)} QIE <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Recipient: {invoice.customer.slice(0, 8)}…{invoice.customer.slice(-6)}</span>
          <Link to="/" className="text-primary hover:underline">MerchFlow</Link>
        </div>
      </div>
    </div>
  );
}
