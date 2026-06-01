import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ExternalLink, Check } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/claim")({
  head: () => ({ meta: [{ title: "Redeem Claim — MerchFlow" }] }),
  component: Claim,
});

function Claim() {
  const { connected, connect } = useWallet();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ amount: number; tx: string } | null>(null);

  const redeem = async () => {
    if (!code.trim()) { toast.error("Enter your claim code"); return; }
    if (!connected) { toast.error("Connect your wallet first"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setResult({ amount: 153.6, tx: "0x" + Math.random().toString(16).slice(2).padEnd(40, "0").slice(0, 40) });
    toast.success("Claim successful");
  };

  return (
    <div className="min-h-[80vh] grid place-items-center px-6 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        {result ? (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-success/15 border border-success/30 grid place-items-center text-success mb-3">
              <Check className="h-5 w-5" />
            </div>
            <h1 className="font-mono font-bold text-xl">Redeemed!</h1>
            <div className="mt-3 font-mono text-3xl text-primary">{result.amount.toFixed(2)} QIE</div>
            <div className="text-sm text-muted-foreground mt-1">Sent to your wallet</div>
            <a href="#" className="mt-4 inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline">
              View on QIE Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <>
            <h1 className="font-mono font-bold text-xl text-center">Redeem Your Claim Code</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Enter the claim code you received from a MerchFlow merchant.
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CLAIM-XXXX"
              className="mt-6 font-mono text-center text-lg"
            />
            {!connected ? (
              <Button onClick={connect} className="mt-4 w-full bg-primary hover:bg-primary/90">
                Connect QIE Wallet to Receive
              </Button>
            ) : (
              <Button onClick={redeem} disabled={loading} className="mt-4 w-full bg-primary hover:bg-primary/90">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redeeming…</> : "Redeem"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}