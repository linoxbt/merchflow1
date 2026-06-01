import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { RequireWallet } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { MOCK_PAYROLL, formatQie } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/payroll")({
  head: () => ({ meta: [{ title: "Payroll — MerchFlow" }] }),
  component: () => <RequireWallet><Payroll /></RequireWallet>,
});

function Payroll() {
  const [tab, setTab] = useState<"history" | "codes">("history");
  const [expanded, setExpanded] = useState<string | null>(null);

  const claims = MOCK_PAYROLL.flatMap((p) =>
    p.recipients.filter((r) => r.claimCode).map((r) => ({ ...r, runId: p.id, date: p.date })),
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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase text-muted-foreground border-b border-border bg-background/50">
                <th className="py-2.5 px-4 w-8"></th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Recipients</th>
                <th className="py-2.5 px-4 text-right">Total Sent</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PAYROLL.map((p) => {
                const isOpen = expanded === p.id;
                return (
                  <>
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                    >
                      <td className="py-3 pl-4">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                      <td className="py-3 px-4 text-muted-foreground">{p.date}</td>
                      <td className="py-3 px-4 font-mono">{p.recipients.length}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatQie(p.totalQie)} QIE</td>
                      <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-background/40">
                        <td colSpan={5} className="px-4 py-4">
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
                              {p.recipients.map((r, i) => (
                                <tr key={i} className="border-t border-border/60">
                                  <td className="py-2 pr-3 font-mono">{r.address ?? <span className="text-warning">{r.claimCode}</span>}</td>
                                  <td className="py-2 pr-3 text-muted-foreground">{r.label}</td>
                                  <td className="py-2 pr-3 text-right font-mono">{formatQie(r.amountQie)} QIE</td>
                                  <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
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
                <tr key={c.claimCode} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 font-mono text-warning">{c.claimCode}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.label}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatQie(c.amountQie)} QIE</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.date}</td>
                  <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => { navigator.clipboard.writeText(c.claimCode!); toast.success("Code copied"); }}
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