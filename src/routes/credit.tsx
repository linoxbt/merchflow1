import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { RequireWallet } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CREDIT_SCORE, CREDIT_SIGNALS, CREDIT_MAX, MAX_LOAN_QIE, MONTHLY_RATE,
  ACTIVE_LOAN, POOL_STATS, creditTier, formatQie,
} from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/credit")({
  head: () => ({ meta: [{ title: "Credit — MerchFlow" }] }),
  component: () => <RequireWallet><Credit /></RequireWallet>,
});

function Credit() {
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const eligible = CREDIT_SCORE >= 500;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono font-bold text-2xl">Business Credit</h1>
        {eligible ? (
          <Button onClick={() => setBorrowOpen(true)} className="bg-primary hover:bg-primary/90">
            Request Loan
          </Button>
        ) : (
          <Button variant="ghost" className="border border-border">Improve Your Score</Button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score column */}
        <div className="rounded-lg border border-border bg-surface p-6">
          <ScoreGauge value={CREDIT_SCORE} max={800} />
          <div className="mt-6 space-y-3">
            {CREDIT_SIGNALS.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span>{s.score}/{s.max}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full gradient-credit" style={{ width: `${(s.score / s.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-muted-foreground">
            Score updates automatically after every transaction.
          </div>
        </div>

        {/* Credit products column */}
        <div className="space-y-6">
          {eligible ? (
            <div className="rounded-lg border border-success/30 bg-success/5 p-6">
              <div className="flex items-center gap-2 text-success font-mono text-sm">
                <TrendingUp className="h-4 w-4" /> Eligible for Credit
              </div>
              <div className="mt-3 font-mono text-3xl">{formatQie(MAX_LOAN_QIE)} <span className="text-sm text-muted-foreground">QIE Stable</span></div>
              <div className="text-xs text-muted-foreground mt-1">Based on 3× your 30-day average revenue of 150 QIE Stable</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Rate</div>
                  <div className="font-mono mt-1">{(MONTHLY_RATE * 100).toFixed(1)}% monthly</div>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Term</div>
                  <div className="font-mono mt-1">30 days</div>
                </div>
              </div>
              <Button onClick={() => setBorrowOpen(true)} className="mt-4 w-full bg-primary hover:bg-primary/90">
                Request Loan
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-6">
              <div className="text-warning font-mono text-sm">Not Yet Eligible</div>
              <div className="text-xs text-muted-foreground mt-2">Minimum score required: 500</div>
              <div className="mt-3 h-2 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-warning" style={{ width: `${Math.min(100, (CREDIT_SCORE / 500) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Active loan */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="text-xs font-mono uppercase text-muted-foreground">Active Loan</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Borrowed</div>
                <div className="font-mono mt-1">{formatQie(ACTIVE_LOAN.borrowed)} QIE</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Interest</div>
                <div className="font-mono mt-1">{formatQie(ACTIVE_LOAN.interestAccrued)} QIE</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Total Due</div>
                <div className="font-mono mt-1 text-warning">{formatQie(ACTIVE_LOAN.totalDue)} QIE</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Due Date</div>
                <div className="font-mono mt-1">{ACTIVE_LOAN.dueDate}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-muted-foreground">Repayment</span>
                <span>{formatQie(ACTIVE_LOAN.paid)} / {formatQie(ACTIVE_LOAN.totalDue)}</span>
              </div>
              <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(ACTIVE_LOAN.paid / ACTIVE_LOAN.totalDue) * 100}%` }} />
              </div>
            </div>
            <Button className="mt-4 w-full bg-primary hover:bg-primary/90" onClick={() => toast.success("Repayment flow coming next sprint")}>
              Make Repayment
            </Button>
          </div>

          {/* Pool */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase text-muted-foreground">Credit Pool</div>
              <div className="text-xs font-mono text-success">APY {(POOL_STATS.apy * 100).toFixed(1)}%</div>
            </div>
            <div className="mt-3 font-mono text-2xl">{formatQie(POOL_STATS.size)} QIE</div>
            <div className="mt-3">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-muted-foreground">Utilization</span>
                <span>{Math.round(POOL_STATS.utilization * 100)}%</span>
              </div>
              <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${POOL_STATS.utilization * 100}%` }} />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Your deposits: <span className="font-mono text-foreground">{formatQie(POOL_STATS.yourDeposits)} QIE</span>
            </div>
            <Button variant="ghost" onClick={() => setDepositOpen(true)} className="mt-3 w-full border border-border">
              Deposit to Earn
            </Button>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Depositors earn yield from loan interest payments.
            </div>
          </div>
        </div>
      </div>

      <BorrowDialog open={borrowOpen} onOpenChange={setBorrowOpen} />
      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
    </div>
  );
}

function ScoreGauge({ value, max }: { value: number; max: number }) {
  const pct = Math.min(1, value / max);
  const radius = 90;
  const circ = Math.PI * radius; // half circle
  const offset = circ * (1 - pct);
  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <svg viewBox="0 0 220 130" className="w-full">
        <defs>
          <linearGradient id="gauge-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#e53e3e" />
            <stop offset="50%" stopColor="#f6a623" />
            <stop offset="100%" stopColor="#27ae60" />
          </linearGradient>
        </defs>
        <path d="M 20 110 A 90 90 0 0 1 200 110" stroke="#1e2a38" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          stroke="url(#gauge-grad)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
        <div className="font-mono text-4xl text-primary">{value}</div>
        <div className="text-xs font-mono uppercase text-muted-foreground mt-1">{creditTier(value)}</div>
      </div>
    </div>
  );
}

function BorrowDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [amount, setAmount] = useState(200);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const interest = useMemo(() => amount * MONTHLY_RATE, [amount]);
  const total = amount + interest;
  const dueDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const confirm = async () => {
    if (!agreed) { toast.error("Please confirm the repayment terms"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    onOpenChange(false);
    toast.success("Loan issued — funds in your wallet");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Working Capital</DialogTitle>
          <DialogDescription>
            Max eligible {MAX_LOAN_QIE} QIE · {(MONTHLY_RATE * 100).toFixed(1)}% monthly · 30-day term
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div>
            <Label>How much do you need?</Label>
            <div className="mt-3">
              <Slider value={[amount]} min={10} max={MAX_LOAN_QIE} step={10} onValueChange={(v) => setAmount(v[0])} />
              <div className="mt-2 flex items-center gap-3">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.min(MAX_LOAN_QIE, Math.max(10, parseInt(e.target.value) || 10)))}
                  className="font-mono"
                />
                <span className="text-xs text-muted-foreground">QIE Stable</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-background p-4 space-y-2 text-sm">
            <Row label="Principal" value={`${formatQie(amount)} QIE`} />
            <Row label="Interest (30d)" value={`${formatQie(interest)} QIE`} />
            <div className="h-px bg-border" />
            <Row label="Total Due" value={`${formatQie(total)} QIE`} bold />
            <Row label="Due Date" value={dueDate} />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
            <span>I agree to repay {formatQie(total)} QIE Stable by {dueDate}.</span>
          </label>

          <Button onClick={confirm} disabled={loading} className="w-full bg-primary hover:bg-primary/90">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirming…</> : "Confirm & Borrow"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DepositDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const n = parseFloat(amount) || 0;
  const earnings = n * POOL_STATS.apy * (30 / 365);
  const confirm = async () => {
    if (n <= 0) { toast.error("Enter an amount"); return; }
    onOpenChange(false);
    toast.success(`Deposited ${formatQie(n)} QIE to the credit pool`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit to Credit Pool</DialogTitle>
          <DialogDescription>Earn yield from active merchant loans.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Amount (QIE Stable)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="mt-1.5 font-mono" />
            <div className="mt-1 text-xs text-muted-foreground">
              Estimated APY <span className="text-success font-mono">{(POOL_STATS.apy * 100).toFixed(1)}%</span> · 30-day earnings: <span className="font-mono">{formatQie(earnings)} QIE</span>
            </div>
          </div>
          <Button onClick={confirm} className="w-full bg-primary hover:bg-primary/90">Deposit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? "text-foreground" : ""}`}>{value}</span>
    </div>
  );
}