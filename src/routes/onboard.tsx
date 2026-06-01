import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Check, ExternalLink, Loader2 } from "lucide-react";
import { useWallet, truncateAddress } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/onboard")({
  head: () => ({ meta: [{ title: "Onboard — MerchFlow" }] }),
  component: Onboard,
});

const CATEGORIES = [
  "Retail", "Food & Beverage", "Services", "Technology",
  "Creative", "Agriculture", "Healthcare", "Other",
];

function Onboard() {
  const { address, connected, qiePassVerified, setPassVerified, merchant, setMerchant } = useWallet();
  const navigate = useNavigate();
  const [step, setStep] = useState(qiePassVerified ? 2 : 1);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    category: "Technology",
    description: "",
    website: "",
  });

  useEffect(() => {
    if (!connected) navigate({ to: "/" });
    else if (merchant) navigate({ to: "/dashboard" });
  }, [connected, merchant, navigate]);

  const checkPass = async () => {
    setChecking(true);
    await new Promise((r) => setTimeout(r, 900));
    setPassVerified(true);
    setChecking(false);
    toast.success("QIE Pass verified");
    setStep(2);
  };

  const submit = async () => {
    if (!form.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    setStep(3);
  };

  const register = async () => {
    if (!address) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1400));
    setMerchant({
      address,
      businessName: form.businessName.trim(),
      category: form.category,
      description: form.description.trim(),
      website: form.website.trim(),
      registeredAt: Date.now(),
    });
    toast.success("Business registered on QIE", { description: "Welcome to MerchFlow." });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Stepper step={step} />

      {step === 1 && (
        <div className="mt-10 rounded-lg border border-border bg-surface p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 border border-primary/30 grid place-items-center text-primary mb-5">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="font-mono font-bold text-2xl">Verify with QIE Pass</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            MerchFlow requires a verified QIE Pass to register as a merchant. This ensures only real businesses can create invoices and access credit.
          </p>
          {qiePassVerified ? (
            <div className="mt-6 inline-flex items-center gap-2 text-success text-sm font-mono">
              <Check className="h-4 w-4" /> QIE Pass verified
            </div>
          ) : (
            <Button onClick={checkPass} disabled={checking} className="mt-6 bg-primary hover:bg-primary/90">
              {checking ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking…</>) : "Check QIE Pass Status"}
            </Button>
          )}

          <div className="mt-6 text-xs text-muted-foreground">
            Don't have a QIE Pass?{" "}
            <a className="text-primary inline-flex items-center gap-1" href="https://qie.digital/pass" target="_blank" rel="noreferrer">
              Get one <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {qiePassVerified && (
            <div className="mt-6">
              <Button onClick={() => setStep(2)} variant="ghost" className="border border-border">
                Next Step
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-10 rounded-lg border border-border bg-surface p-8">
          <h1 className="font-mono font-bold text-2xl">Tell us about your business</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This information is stored on-chain and visible to your customers.
          </p>
          <div className="mt-6 grid gap-4">
            <div>
              <Label htmlFor="bn">Business Name</Label>
              <Input id="bn" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Lagos Tech Studio" className="mt-1.5" />
            </div>
            <div>
              <Label>Business Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desc">Short Description <span className="text-muted-foreground text-xs">(optional, max 160)</span></Label>
              <Textarea id="desc" maxLength={160} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does your business do?" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="web">Website or Social Link <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="web" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" className="mt-1.5" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={submit} className="bg-primary hover:bg-primary/90">Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-10 rounded-lg border border-border bg-surface p-8">
          <h1 className="font-mono font-bold text-2xl">Almost there.</h1>
          <div className="mt-6 rounded-md border border-border bg-background p-5">
            <div className="text-xs font-mono uppercase text-muted-foreground">Business</div>
            <div className="font-semibold text-lg mt-1">{form.businessName}</div>
            <div className="text-sm text-muted-foreground">{form.category}</div>
            <div className="mt-4 text-xs font-mono text-muted-foreground">Wallet</div>
            <div className="font-mono text-sm">{truncateAddress(address, 8, 6)}</div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Registering on MerchFlow will send one transaction to the QIE blockchain. This costs a small gas fee.
          </p>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)} className="border border-border">Back</Button>
            <Button onClick={register} disabled={submitting} className="bg-primary hover:bg-primary/90">
              {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirming on QIE blockchain…</>) : "Register My Business"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Verify Identity", "Business Profile", "Confirm"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full grid place-items-center text-xs font-mono border ${done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </div>
            <div className={`text-xs font-mono uppercase ${active ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}