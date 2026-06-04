import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, Trash2, Loader2, Check, Copy, ArrowLeft, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RequireWallet } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OracleRate } from "@/components/oracle-rate";
import { formatQie, num, type PayrollRecipientRow, type PayrollRunRow } from "@/lib/types";
import { useWallet } from "@/lib/wallet";
import { useQieOracle, useQieStableBalance } from "@/lib/qie-hooks";
import { createPayrollRun } from "@/lib/payroll.functions";
import { parsePayrollCsv } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/payroll/new")({
  head: () => ({ meta: [{ title: "New Payroll — MerchFlow" }] }),
  component: () => <RequireWallet><NewPayroll /></RequireWallet>,
});

type Row = {
  id: string;
  noWallet: boolean;
  addressOrLabel: string;
  label: string;
  amountUsd: string;
};

function rid() { return Math.random().toString(36).slice(2, 9); }

function NewPayroll() {
  const { address } = useWallet();
  const { rate } = useQieOracle();
  const stable = useQieStableBalance(address as `0x${string}` | undefined);
  const create = useServerFn(createPayrollRun);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rows, setRows] = useState<Row[]>([
    { id: rid(), noWallet: false, addressOrLabel: "", label: "", amountUsd: "" },
  ]);
  const [processing, setProcessing] = useState(false);
  const [resultRun, setResultRun] = useState<PayrollRunRow | null>(null);
  const [resultRecipients, setResultRecipients] = useState<PayrollRecipientRow[]>([]);

  const totalUsd = rows.reduce((s, r) => s + (parseFloat(r.amountUsd) || 0), 0);
  const totalQie = totalUsd * rate;

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addRow = () => setRows((rs) => [...rs, { id: rid(), noWallet: false, addressOrLabel: "", label: "", amountUsd: "" }]);

  const onCsvFile = async (file: File) => {
    const text = await file.text();
    const { rows: parsed, errors } = parsePayrollCsv(text);
    if (errors.length) {
      toast.error(`${errors.length} row${errors.length === 1 ? "" : "s"} skipped`, {
        description: errors.slice(0, 3).join(" · "),
      });
    }
    if (parsed.length === 0) {
      toast.error("No valid rows in CSV");
      return;
    }
    setRows(
      parsed.map((p) => ({
        id: rid(),
        noWallet: !p.wallet,
        addressOrLabel: p.wallet ?? p.label,
        label: p.wallet ? p.label : "",
        amountUsd: String(p.amountUsd),
      })),
    );
    toast.success(`Imported ${parsed.length} recipient${parsed.length === 1 ? "" : "s"}`);
  };

  const goReview = () => {
    for (const r of rows) {
      const amt = parseFloat(r.amountUsd);
      if (!amt || amt <= 0) { toast.error("All recipients need an amount"); return; }
      if (r.noWallet && !r.addressOrLabel.trim()) { toast.error("Recipient name required for claim codes"); return; }
      if (!r.noWallet && !/^0x[a-fA-F0-9]{40}$/.test(r.addressOrLabel)) { toast.error("Wallet must be 0x + 40 hex chars"); return; }
    }
    setStep(2);
  };

  const runPayroll = async () => {
    if (!address) return;
    setStep(3);
    setProcessing(true);
    try {
      const recipients = rows.map((r) => {
        const usd = parseFloat(r.amountUsd) || 0;
        return {
          label: r.noWallet ? r.addressOrLabel : (r.label || r.addressOrLabel),
          wallet: r.noWallet ? null : r.addressOrLabel,
          amountUsd: usd,
          amountQie: +(usd * rate).toFixed(6),
        };
      });
      const { run, recipients: out } = await create({
        data: {
          merchantWallet: address,
          recipients,
          // Once QIE Stable is configured we'd attach the on-chain tx hash here.
          txHash: null,
        },
      });
      setResultRun(run as PayrollRunRow);
      setResultRecipients(out as PayrollRecipientRow[]);
      qc.invalidateQueries({ queryKey: ["payroll"] });
      setStep(4);
    } catch (err) {
      toast.error("Payroll failed", { description: err instanceof Error ? err.message : "Try again" });
      setStep(2);
    } finally {
      setProcessing(false);
    }
  };

  const claimCodes = useMemo(
    () => resultRecipients.filter((r) => !!r.claim_code),
    [resultRecipients],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Link to="/payroll" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Payroll
      </Link>

      <StepDots step={step} />

      {step === 1 && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-mono font-bold text-2xl">Who are you paying?</h1>
              <OracleRate className="mt-2" />
            </div>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onCsvFile(f);
                  e.target.value = "";
                }}
              />
              <Button variant="ghost" className="border border-border" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Import CSV
              </Button>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground font-mono">
            CSV format: <code>label, wallet, amount_usd</code> (wallet optional — leave blank to generate claim code)
          </div>

          <div className="space-y-2">
            {rows.map((r) => {
              const qie = (parseFloat(r.amountUsd) || 0) * rate;
              return (
                <div key={r.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-6">
                      <Label className="text-xs">{r.noWallet ? "Recipient Name/Label" : "Wallet Address"}</Label>
                      <Input
                        value={r.addressOrLabel}
                        onChange={(e) => updateRow(r.id, { addressOrLabel: e.target.value })}
                        placeholder={r.noWallet ? "Ada (designer)" : "0x…"}
                        className="mt-1 font-mono"
                      />
                      {!r.noWallet && (
                        <Input
                          value={r.label}
                          onChange={(e) => updateRow(r.id, { label: e.target.value })}
                          placeholder="Label (optional)"
                          className="mt-2 text-xs"
                        />
                      )}
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs">Amount (USD)</Label>
                      <Input
                        type="number"
                        value={r.amountUsd}
                        onChange={(e) => updateRow(r.id, { amountUsd: e.target.value })}
                        placeholder="100"
                        className="mt-1 font-mono"
                      />
                      <div className="text-[10px] font-mono text-primary mt-1">= {formatQie(qie)} QIE</div>
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={r.noWallet}
                          onCheckedChange={(v) => updateRow(r.id, { noWallet: v })}
                          id={`nw-${r.id}`}
                        />
                        <Label htmlFor={`nw-${r.id}`} className="text-xs">No wallet?</Label>
                      </div>
                      <button
                        onClick={() => removeRow(r.id)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={addRow} variant="ghost" className="border border-dashed border-border w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Recipient
          </Button>

          <div className="rounded-lg border border-border bg-surface p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total: <span className="text-foreground font-mono">{rows.length}</span> recipients
            </div>
            <div className="text-right">
              <div className="font-mono text-lg">{formatQie(totalQie)} QIE Stable</div>
              <div className="text-[11px] text-muted-foreground">≈ ${formatQie(totalUsd)} USD</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={goReview} className="bg-primary hover:bg-primary/90">Review →</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-5">
          <h1 className="font-mono font-bold text-2xl">Review Payroll Run</h1>
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase text-muted-foreground border-b border-border bg-background/50">
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Delivery</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-mono">{r.addressOrLabel}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {r.noWallet ? "Claim Code" : "Wallet Transfer"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatQie((parseFloat(r.amountUsd) || 0) * rate)} QIE
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total to send</span>
              <span className="font-mono text-2xl">{formatQie(totalQie)} QIE</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>≈ ${formatQie(totalUsd)} USD at current rate</span>
              <span>QIE Stable Balance: {stable.configured ? formatQie(stable.balance ?? 0) : "—"} QIE</span>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} className="border border-border">Back</Button>
            <Button onClick={runPayroll} className="bg-primary hover:bg-primary/90">Send Payroll</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-12 text-center">
          <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
          <div className="mt-4 font-mono">{processing ? "Recording payroll run…" : "Done"}</div>
        </div>
      )}

      {step === 4 && resultRun && (
        <div className="mt-6 space-y-5">
          <div className="rounded-lg border border-success/30 bg-success/5 p-5 text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-success/20 grid place-items-center text-success mb-2">
              <Check className="h-5 w-5" />
            </div>
            <div className="font-mono font-bold text-lg text-success">Payroll Run {resultRun.number} Complete</div>
            <div className="text-sm text-muted-foreground mt-1">{formatQie(num(resultRun.total_qie))} QIE recorded for {resultRun.recipient_count} recipients.</div>
          </div>

          {claimCodes.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="text-xs font-mono uppercase text-muted-foreground mb-3">Claim Codes Generated</div>
              <div className="space-y-2">
                {claimCodes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <div>
                      <div className="text-sm">{c.label}</div>
                      <div className="font-mono text-warning text-sm">{c.claim_code}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">{formatQie(num(c.amount_qie))} QIE</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.claim_code!); toast.success("Code copied"); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => navigate({ to: "/payroll" })} className="bg-primary hover:bg-primary/90">
              View Payroll History
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDots({ step }: { step: number }) {
  const labels = ["Recipients", "Review", "Processing", "Confirmation"];
  return (
    <div className="flex gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={l} className="flex-1 flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full grid place-items-center text-[10px] font-mono border ${done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              {done ? <Check className="h-3 w-3" /> : n}
            </div>
            <div className={`text-[10px] font-mono uppercase ${active ? "text-foreground" : "text-muted-foreground"}`}>{l}</div>
            {i < labels.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
