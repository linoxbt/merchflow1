import { createFileRoute } from "@tanstack/react-router";
import { Receipt, Users, DollarSign, ArrowDownLeft, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProtocolStats, getTopMerchants } from "@/lib/activity.functions";
import { formatQie, num, relativeTime, type ActivityRow } from "@/lib/mock-data";
import { truncateAddress } from "@/lib/wallet";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Explore — MerchFlow" }] }),
  component: Explore,
});

const EVENT_META: Record<string, { label: string; cls: string; icon: typeof Receipt }> = {
  invoice_paid: { label: "INVOICE PAID", cls: "bg-success/15 text-success border-success/30", icon: Receipt },
  payroll_sent: { label: "PAYROLL SENT", cls: "bg-primary/15 text-primary border-primary/30", icon: Users },
  loan_issued: { label: "LOAN ISSUED", cls: "bg-warning/15 text-warning border-warning/30", icon: DollarSign },
  loan_repaid: { label: "LOAN REPAID", cls: "bg-info/15 text-info border-info/30", icon: ArrowDownLeft },
  merchant_registered: { label: "MERCHANT JOINED", cls: "bg-info/15 text-info border-info/30", icon: UserPlus },
};

function Explore() {
  const statsFn = useServerFn(getProtocolStats);
  const topFn = useServerFn(getTopMerchants);

  const stats = useQuery({ queryKey: ["protocol-stats"], queryFn: () => statsFn(), refetchInterval: 15_000 });
  const top = useQuery({ queryKey: ["top-merchants"], queryFn: () => topFn(), refetchInterval: 60_000 });

  const protocol = stats.data?.stats ?? { invoicesPaid: 0, totalVolumeQie: 0, activeMerchants: 0, payrollProcessedQie: 0 };
  const activity = (stats.data?.activity ?? []) as ActivityRow[];
  const merchants = top.data?.merchants ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-mono font-bold text-2xl">Protocol Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">Live stats across every merchant on MerchFlow.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Invoices Paid" value={protocol.invoicesPaid.toLocaleString()} />
        <Stat label="Total Volume" value={`${formatQie(protocol.totalVolumeQie)} QIE`} />
        <Stat label="Active Merchants" value={protocol.activeMerchants.toLocaleString()} />
        <Stat label="Payroll Processed" value={`${formatQie(protocol.payrollProcessedQie)} QIE`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-border bg-surface p-5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Recent Activity</h3>
          {activity.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground text-center">No on-chain activity yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((e) => {
                const meta = EVENT_META[e.type] ?? EVENT_META.invoice_paid;
                const Icon = meta.icon;
                return (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-mono uppercase border ${meta.cls}`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{truncateAddress(e.actor_wallet)}</span>
                    <span className="font-mono text-sm ml-auto">
                      {e.amount_qie != null ? `${formatQie(num(e.amount_qie))} QIE` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {relativeTime(new Date(e.created_at).getTime())}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Top Merchants by Volume</h3>
          {merchants.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground text-center">No paid invoices yet.</div>
          ) : (
            <ul className="space-y-3">
              {merchants.map((m, i) => (
                <li key={m.wallet} className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-md bg-surface-2 grid place-items-center text-xs font-mono">{i + 1}</span>
                  <span className="font-mono text-xs">{truncateAddress(m.wallet)}</span>
                  <span className="ml-auto font-mono text-sm">{formatQie(m.volume)} QIE</span>
                </li>
              ))}
            </ul>
          )}
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
