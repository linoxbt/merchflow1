import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, Fragment } from "react";
import { Plus, ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RequireWallet } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { useWallet } from "@/lib/wallet";
import { formatQie, num, type PayrollRunRow, type PayrollRecipientRow } from "@/lib/mock-data";
import { listPayrollByMerchant } from "@/lib/payroll.functions";
import { qieTestnet } from "@/lib/chains";
import { toast } from "sonner";

export const Route = createFileRoute("/payroll")({
  head: () => ({ meta: [{ title: "Payroll — MerchFlow" }] }),
  component: () => <RequireWallet><Payroll /></RequireWallet>,
});

function Payroll() {
  const { address } = useWallet();
  const list = useServerFn(listPayrollByMerchant);
  const [tab, setTab] = useState<"history" | "codes">("history");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["payroll", address?.toLowerCase()],
    enabled: !!address,
    queryFn: () => list({ data: { wallet: address! } }),
  });
  const runs = (data?.runs ?? []) as PayrollRunRow[];

  const claims = runs.flatMap((p) =>
    (p.payroll_recipients ?? [])
      .filter((r) => !!r.claim_code)
      .map((r) => ({ ...r, runNumber: p.number, date: p.created_at })),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono font-bold text-2xl">Payroll & Remittance</h1>
        <Link to="/payroll/new">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> New Payroll Run
          </Button>
        </Link>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["history", "codes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-mono uppercase tracking-wide border-b-2 -mb-px ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "history" ? "Payroll History" : "Claim Codes"}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading payroll runs…</div>
          ) : runs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No payroll runs yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase text-muted-foreground border-b border-border bg-background/50">
                  <th className="py-2.5 px-4 w-8"></th>
                  <th className="py-2.5 px-4">Run</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Recipients</th>
                  <th className="py-2.5 px-4 text-right">Total Sent</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Tx</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((p) => {
                  const isOpen = expanded === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr
                        className="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : p.id)}
                      >
                        <td className="py-3 pl-4">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className="py-3 px-4 font-mono">{p.number}</td>
                        <td className="py-3 px-4 text-muted-foreground">{p.created_at.slice(0, 10)}</td>
                        <td className="py-3 px-4 font-mono">{p.recipient_count}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatQie(num(p.total_qie))} QIE</td>
                        <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                        <td className="py-3 px-4">
                          {p.tx_hash ? (
                            <a
                              href={`${qieTestnet.blockExplorers.default.url}/tx/${p.tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary text-xs font-mono inline-flex items-center gap-1 hover:underline"
                            >
                              {p.tx_hash.slice(0, 8)}… <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-background/40">
                          <td colSpan={7} className="px-4 py-4">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-[10px] font-mono uppercase text-muted-foreground">
                                  <th className="py-1 pr-3">Recipient</th>
                                  <th className="py-1 pr-3">Label</th>
                                  <th className="py-1 pr-3 text-right">Amount</th>
                                  <th className="py-1 pr-3">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(p.payroll_recipients ?? []).map((r: PayrollRecipientRow) => (
                                  <tr key={r.id} className="border-t border-border/60">
                                    <td className="py-2 pr-3 font-mono">
                                      {r.wallet ?? <span className="text-warning">{r.claim_code}</span>}
                                    </td>
                                    <td className="py-2 pr-3 text-muted-foreground">{r.label}</td>
                                    <td className="py-2 pr-3 text-right font-mono">{formatQie(num(r.amount_qie))} QIE</td>
                                    <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "codes" && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase text-muted-foreground border-b border-border bg-background/50">
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4">Created</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No claim codes yet.</td></tr>
              ) : claims.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 font-mono text-warning">{c.claim_code}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.label}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatQie(num(c.amount_qie))} QIE</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.date.slice(0, 10)}</td>
                  <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => { navigator.clipboard.writeText(c.claim_code!); toast.success("Code copied"); }}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
