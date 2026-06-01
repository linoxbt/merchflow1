import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, MoreHorizontal, Receipt, Users, DollarSign, RefreshCw, Plus } from "lucide-react";
import { RequireWallet } from "@/components/guards";
import { useWallet, truncateAddress } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { OracleRate } from "@/components/oracle-rate";
import {
  MOCK_INVOICES, MOCK_PAYROLL, CREDIT_SCORE, CREDIT_SIGNALS,
  MAX_LOAN_QIE, ACTIVE_LOAN, formatQie, creditTier,
} from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MerchFlow" }] }),
  component: () => <RequireWallet><Dashboard /></RequireWallet>,
});

function Dashboard() {
  const { merchant, address } = useWallet();
  const invoices = MOCK_INVOICES.slice(0, 5);
  const pendingCount = MOCK_INVOICES.filter((i) => i.status === "pending" || i.status === "overdue").length;
  const pendingTotal = MOCK_INVOICES.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amountQie, 0);
  const revenue30d = MOCK_INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountQie, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      {/* Business header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono font-bold text-2xl">{merchant?.businessName}</h1>
            <span className="text-[10px] font-mono uppercase rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
              {merchant?.category}
            </span>
          </div>
          <div className="mt-1 text-xs font-mono text-muted-foreground">
            {truncateAddress(address, 8, 6)}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/payroll/new">
            <Button variant="ghost" className="border border-border">
              <Users className="h-4 w-4 mr-2" /> Send Payroll
            </Button>
          </Link>
          <Link to="/invoices" search={{ create: true } as never}>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue (30d)"
          value={`${formatQie(revenue30d)} QIE`}
          sub={<span className="text-success">↑ 18% from last month</span>}
        />
        <StatCard
          label="Unpaid Invoices"
          value={String(pendingCount)}
          valueClass="text-warning"
          sub={<>Total: {formatQie(pendingTotal)} QIE outstanding</>}
        />
        <StatCard
          label="Business Credit Score"
          value={String(CREDIT_SCORE)}
          valueClass="text-primary"
          sub={
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full gradient-credit" style={{ width: `${(CREDIT_SCORE / 800) * 100}%` }} />
              </div>
              <div>{creditTier(CREDIT_SCORE)} — eligible for up to {MAX_LOAN_QIE} QIE</div>
            </div>
          }
        />
        <StatCard
          label="Active Credit"
          value={`${formatQie(ACTIVE_LOAN.borrowed)} QIE`}
          sub={
            <Link to="/credit" className="text-primary inline-flex items-center gap-1 hover:underline">
              Next due {ACTIVE_LOAN.dueDate} <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: tables */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Invoices"
            action={<Link to="/invoices" className="text-xs text-primary hover:underline">View All →</Link>}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-mono uppercase text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Invoice</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-3 font-mono">{inv.id}</td>
                      <td className="py-3 pr-3 font-mono text-muted-foreground">{truncateAddress(inv.customer)}</td>
                      <td className="py-3 pr-3 text-right font-mono">{formatQie(inv.amountQie)} QIE</td>
                      <td className="py-3 pr-3 text-muted-foreground">{inv.createdAt}</td>
                      <td className="py-3 pr-3"><StatusBadge status={inv.status} /></td>
                      <td className="py-3"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Payroll History"
            action={<Link to="/payroll" className="text-xs text-primary hover:underline">View All →</Link>}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Recipients</th>
                  <th className="py-2 pr-3 text-right">Total Sent</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PAYROLL.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-3 text-muted-foreground">{p.date}</td>
                    <td className="py-3 pr-3 font-mono">{p.recipients.length}</td>
                    <td className="py-3 pr-3 text-right font-mono">{formatQie(p.totalQie)} QIE</td>
                    <td className="py-3 pr-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>

        {/* Right: credit + quick actions */}
        <div className="space-y-6">
          <SectionCard title="Credit Score Breakdown">
            <div className="text-center mb-4">
              <div className="font-mono text-4xl text-primary">{CREDIT_SCORE}</div>
              <div className="text-xs text-muted-foreground mt-1">{creditTier(CREDIT_SCORE)} Standing</div>
            </div>
            <div className="space-y-3">
              {CREDIT_SIGNALS.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-muted-foreground">{s.name}</span>
                    <span>{s.score}/{s.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(s.score / s.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[11px] text-muted-foreground">
              Score updates automatically as you transact.
            </div>
          </SectionCard>

          <SectionCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              <QuickBtn to="/invoices" icon={Receipt} label="New Invoice" />
              <QuickBtn to="/payroll/new" icon={Users} label="Run Payroll" />
              <QuickBtn to="/credit" icon={DollarSign} label="Borrow Capital" />
              <QuickBtn to="/dashboard" icon={RefreshCw} label="Swap to Stable" />
            </div>
          </SectionCard>

          <SectionCard title="Current Rate">
            <div className="font-mono text-xl">1 USD = 1.024 QIE Stable</div>
            <div className="text-[11px] text-muted-foreground mt-1">Live via QIE Oracle · Updated 2min ago</div>
            <div className="text-[11px] text-muted-foreground mt-2">All invoice amounts are converted at this rate</div>
            <OracleRate className="mt-3" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueClass = "text-primary", sub }: { label: string; value: string; valueClass?: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-2 font-mono text-2xl ${valueClass}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function QuickBtn({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-md border border-border bg-background p-3 hover:border-primary/40 hover:bg-surface-2 transition-colors flex flex-col items-start gap-1.5"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}