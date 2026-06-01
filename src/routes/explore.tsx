import { createFileRoute } from "@tanstack/react-router";
import { Receipt, Users, DollarSign, ArrowDownLeft } from "lucide-react";
import { PROTOCOL_STATS, ACTIVITY_FEED, TOP_MERCHANTS, formatQie, relativeTime } from "@/lib/mock-data";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Explore — MerchFlow" }] }),
  component: Explore,
});

const EVENT_META: Record<string, { label: string; cls: string; icon: typeof Receipt }> = {
  invoice_paid: { label: "INVOICE PAID", cls: "bg-success/15 text-success border-success/30", icon: Receipt },
  payroll_sent: { label: "PAYROLL SENT", cls: "bg-primary/15 text-primary border-primary/30", icon: Users },
  loan_issued: { label: "LOAN ISSUED", cls: "bg-warning/15 text-warning border-warning/30", icon: DollarSign },
  loan_repaid: { label: "LOAN REPAID", cls: "bg-info/15 text-info border-info/30", icon: ArrowDownLeft },
};

function Explore() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-mono font-bold text-2xl">Protocol Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">Live stats across every merchant on MerchFlow.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Invoices Paid" value={PROTOCOL_STATS.invoicesPaid.toLocaleString()} />
        <Stat label="Total Volume" value={`${(PROTOCOL_STATS.totalVolumeQie / 1_000_000).toFixed(2)}M QIE`} />
        <Stat label="Active Merchants" value={PROTOCOL_STATS.activeMerchants.toLocaleString()} />
        <Stat label="Payroll Processed" value={`${(PROTOCOL_STATS.payrollProcessedQie / 1000).toFixed(0)}K QIE`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-border bg-surface p-5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Recent Activity</h3>
          <ul className="divide-y divide-border">
            {ACTIVITY_FEED.map((e) => {
              const meta = EVENT_META[e.type];
              const Icon = meta.icon;
              return (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-mono uppercase border ${meta.cls}`}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{e.address}</span>
                  <span className="font-mono text-sm ml-auto">{formatQie(e.amountQie)} QIE</span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{relativeTime(e.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Top Merchants by Volume</h3>
          <ul className="space-y-3">
            {TOP_MERCHANTS.map((m) => (
              <li key={m.rank} className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-md bg-surface-2 grid place-items-center text-xs font-mono">{m.rank}</span>
                <span className="font-mono text-xs">{m.address}</span>
                <span className="ml-auto font-mono text-sm">{(m.volume / 1000).toFixed(1)}K</span>
                <span className="text-[10px] font-mono rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">{m.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="text-[10px] font-mono uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-2xl text-primary">{value}</div>
    </div>
  );
}