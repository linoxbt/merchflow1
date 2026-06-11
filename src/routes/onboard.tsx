import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Store } from "lucide-react";
import { useChainId, useConfig, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getQieContracts } from "@/lib/qie-contracts";
import { qieMainnet, qieTestnet } from "@/lib/chains";
import { MERCHANT_REGISTRY_ABI, getMerchantProfileHashes } from "@/lib/merchant-registry";
import { trackTx } from "@/lib/tx-toast";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { toast } from "sonner";

export const Route = createFileRoute("/onboard")({
  head: () => ({ meta: [{ title: "Onboard - MerchFlow" }] }),
  component: Onboard,
});

const CATEGORIES = [
  "Retail",
  "Food & Beverage",
  "Services",
  "Technology",
  "Creative",
  "Agriculture",
  "Healthcare",
  "Other",
];

function Onboard() {
  const { address, connected, merchant, merchantLoading, setMerchant } = useWallet();
  const navigate = useNavigate();
  const chainId = useChainId();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const { merchantRegistry } = getQieContracts(chainId);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    category: "Technology",
    description: "",
    website: "",
  });

  useEffect(() => {
    if (merchantLoading) return;
    if (!connected) navigate({ to: "/" });
    else if (merchant) navigate({ to: "/dashboard" });
  }, [connected, merchant, merchantLoading, navigate]);

  const submit = async () => {
    if (!form.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    setStep(2);
  };

  const register = async () => {
    if (!address) return;
    setSubmitting(true);
    try {
      const profile = {
        businessName: form.businessName.trim(),
        category: form.category,
        description: form.description.trim(),
        website: form.website.trim(),
      };

      if (!merchantRegistry) {
        toast.error("Merchant registry not configured on this network", {
          description: `Switch to ${qieTestnet.name}${getQieContracts(qieMainnet.id).merchantRegistry ? ` or ${qieMainnet.name}` : ""}.`,
        });
        return;
      }

      const { metadataHash, categoryHash } = getMerchantProfileHashes(profile);
      const hash = await writeContractAsync({
        address: merchantRegistry,
        abi: MERCHANT_REGISTRY_ABI,
        functionName: "register",
        args: [metadataHash, categoryHash],
      });
      const receipt = await trackTx(config, hash, { chainId, label: "Merchant registration" });
      if (receipt?.status !== "success") return;

      setMerchant({
        address,
        ...profile,
        registeredAt: Date.now(),
        metadataHash,
        categoryHash,
        source: "onchain",
      });
      toast.success("Business registered on-chain", { description: "Welcome to MerchFlow." });
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error(err);
      toast.error("Registration failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Stepper step={step} />

      {step === 1 && (
        <div className="mt-10 rounded-lg border border-border bg-surface p-8">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-primary/30 bg-primary/15 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-center font-mono text-2xl font-bold">Tell us about your business</h1>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
            This profile is used for invoices, payroll, and credit scoring.
          </p>
          <div className="mt-6 grid gap-4">
            <div>
              <Label htmlFor="bn">Business Name</Label>
              <Input
                id="bn"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="Lagos Tech Studio"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Business Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desc">
                Short Description{" "}
                <span className="text-xs text-muted-foreground">(optional, max 160)</span>
              </Label>
              <Textarea
                id="desc"
                maxLength={160}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does your business do?"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="web">
                Website or Social Link{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="web"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://..."
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={submit} className="bg-primary hover:bg-primary/90">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-10 rounded-lg border border-border bg-surface p-8">
          <h1 className="font-mono text-2xl font-bold">Confirm merchant profile</h1>
          <div className="mt-6 rounded-md border border-border bg-background p-5">
            <div className="text-xs font-mono uppercase text-muted-foreground">Business</div>
            <div className="mt-1 text-lg font-semibold">{form.businessName}</div>
            <div className="text-sm text-muted-foreground">{form.category}</div>
            <div className="mt-4 text-xs font-mono uppercase text-muted-foreground">Wallet</div>
            <div className="font-mono text-sm">{truncateAddress(address, 8, 6)}</div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This action registers your merchant profile hash on-chain. MerchFlow keeps the readable
            profile locally until decentralized metadata storage is added.
          </p>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} className="border border-border">
              Back
            </Button>
            <Button
              onClick={register}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90"
            >
              {submitting ? "Registering..." : "Register Business"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Business", "Confirm"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = step > n;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-mono ${
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-3 w-3" /> : n}
            </div>
            <span
              className={`text-xs font-mono uppercase ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < labels.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
