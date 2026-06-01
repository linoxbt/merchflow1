import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, QrCode, Copy, Download, MoreHorizontal, ExternalLink, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { RequireWallet } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { OracleRate } from "@/components/oracle-rate";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MOCK_INVOICES, ORACLE_RATE, formatQie, type Invoice, type InvoiceStatus } from "@/lib/mock-data";
import { useWallet, truncateAddress } from "@/lib/wallet";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices — MerchFlow" }] }),
  component: () => <RequireWallet><Invoices /></RequireWallet>,
});

const TABS = ["all", "paid", "pending", "overdue", "cancelled"] as const;

function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<Invoice | null>(null);
  const [qrInvoice, setQrInvoice] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (tab !== "all" && i.status !== tab) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return i.id.toLowerCase().includes(s) || i.customer.toLowerCase().includes(s) || i.description.toLowerCase().includes(s);
    });
  }, [invoices, tab, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: invoices.length };
    for (const s of ["paid", "pending", "overdue", "cancelled"]) {
      c[s] = invoices.filter((i) => i.status === s).length;
    }
    return c;
  }, [invoices]);

  const handleCreated = (inv: Invoice) => {
    setInvoices((prev) => [inv, ...prev]);
    setActive(inv);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono font-bold text-2xl flex items-center gap-3">
            Invoices
            <span className="text-xs font-mono rounded border border-border bg-surface px-2 py-0.5 text-muted-foreground">
              {invoices.length}
            </span>
          </h1>
          <OracleRate className="mt-2" />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Invoice
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wide transition-colors ${
                tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-surface-2"
              }`}
            >
              {t} <span className="ml-1 opacity-60">{counts[t] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer or invoice ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase text-muted-foreground border-b border-border bg-background/50">
                  <th className="py-2.5 px-4">Invoice</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4">Due</th>
                  <th className="py-2.5 px-4">Created</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setActive(inv)}
                    className="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono">{inv.id}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{truncateAddress(inv.customer)}</td>
                    <td className="py-3 px-4 text-muted-foreground max-w-[260px] truncate">{inv.description}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono">{formatQie(inv.amountQie)} QIE</div>
                      <div className="font-mono text-[10px] text-muted-foreground">${formatQie(inv.amountUsd)}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.dueDate}</td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.createdAt}</td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setQrInvoice(inv); }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
        onShowQr={(inv) => setQrInvoice(inv)}
      />

      <InvoiceDetailSheet
        invoice={active}
        onClose={() => setActive(null)}
        onShowQr={(inv) => { setQrInvoice(inv); }}
      />

      <QrModal invoice={qrInvoice} onClose={() => setQrInvoice(null)} />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-surface-2 grid place-items-center mb-4">
        <QrCode className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="font-medium">No invoices yet</div>
      <div className="text-sm text-muted-foreground mt-1">Create your first invoice to start building your payment history.</div>
      <Button onClick={onCreate} className="mt-4 bg-primary hover:bg-primary/90">
        <Plus className="h-4 w-4 mr-2" /> Create Invoice
      </Button>
    </div>
  );
}

function CreateInvoiceDialog({
  open, onOpenChange, onCreated, onShowQr,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (inv: Invoice) => void;
  onShowQr: (inv: Invoice) => void;
}) {
  const [customer, setCustomer] = useState("");
  const [description, setDescription] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<Invoice | null>(null);

  const amountQie = useMemo(() => {
    const n = parseFloat(amountUsd);
    return Number.isFinite(n) ? n * ORACLE_RATE : 0;
  }, [amountUsd]);

  const reset = () => {
    setCustomer(""); setDescription(""); setAmountUsd(""); setDueDate(""); setLabel(""); setCreated(null);
  };

  const submit = () => {
    if (!customer.startsWith("0x") || customer.length < 10) {
      toast.error("Enter a valid wallet address");
      return;
    }
    if (!description.trim()) { toast.error("Description required"); return; }
    if (!amountUsd || amountQie <= 0) { toast.error("Enter an amount"); return; }
    if (!dueDate) { toast.error("Pick a due date"); return; }

    const num = Math.floor(1000 + Math.random() * 9000);
    const inv: Invoice = {
      id: `INV-${num.toString().padStart(4, "0")}`,
      hash: "0x" + Math.random().toString(16).slice(2).padEnd(40, "0").slice(0, 40),
      customer,
      description: label ? `${label} — ${description}` : description,
      amountUsd: parseFloat(amountUsd),
      amountQie,
      dueDate,
      createdAt: new Date().toISOString().slice(0, 10),
      status: "pending",
    };
    onCreated(inv);
    setCreated(inv);
    toast.success("Invoice created on QIE");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>Generate an on-chain invoice and shareable QR code.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              <div>
                <Label>Customer Wallet Address</Label>
                <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="0x…" className="mt-1.5 font-mono" />
              </div>
              <div>
                <Label>Invoice Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Web development services — July 2026" className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount (USD)</Label>
                  <Input type="number" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} placeholder="500" className="mt-1.5 font-mono" />
                  <div className="mt-1 text-[11px] font-mono text-primary">
                    = {formatQie(amountQie)} QIE Stable
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label>Label / Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Project Alpha" className="mt-1.5" />
              </div>

              <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                <div className="font-mono uppercase text-[10px] mb-1">Preview</div>
                <div className="text-foreground font-medium">{description || "Invoice description"}</div>
                <div className="font-mono mt-1">{formatQie(amountQie || 0)} QIE Stable</div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="border border-border">Cancel</Button>
                <Button onClick={submit} className="bg-primary hover:bg-primary/90">Create Invoice</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-success/15 border border-success/30 grid place-items-center text-success mb-3">
              ✓
            </div>
            <DialogTitle className="text-success">Invoice Created</DialogTitle>
            <div className="font-mono text-lg mt-2">{created.id}</div>
            <div className="font-mono text-muted-foreground text-sm">{formatQie(created.amountQie)} QIE</div>
            <p className="mt-3 text-sm text-muted-foreground">Share this link or QR code with your customer.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="ghost"
                className="border border-border"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/pay/${created.id}`);
                  toast.success("Payment link copied");
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Payment Link
              </Button>
              <Button onClick={() => { onShowQr(created); onOpenChange(false); }} className="bg-primary hover:bg-primary/90">
                <QrCode className="h-4 w-4 mr-2" /> Show QR Code
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDetailSheet({
  invoice, onClose, onShowQr,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onShowQr: (inv: Invoice) => void;
}) {
  return (
    <Sheet open={!!invoice} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {invoice && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle className="font-mono">{invoice.id}</SheetTitle>
                <StatusBadge status={invoice.status} />
              </div>
            </SheetHeader>
            <div className="mt-6 space-y-5 text-sm">
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Customer</div>
                <div className="font-mono mt-1">{truncateAddress(invoice.customer, 10, 8)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Description</div>
                <div className="mt-1">{invoice.description}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Amount</div>
                <div className="font-mono text-2xl mt-1">{formatQie(invoice.amountQie)} <span className="text-sm text-muted-foreground">QIE Stable</span></div>
                <div className="font-mono text-xs text-muted-foreground">≈ ${formatQie(invoice.amountUsd)} USD</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Created</div>
                  <div className="mt-1">{invoice.createdAt}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Due</div>
                  <div className="mt-1">{invoice.dueDate}</div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background p-4 grid place-items-center">
                <QRCodeSVG
                  value={`merchflow:pay/${invoice.id}?amount=${invoice.amountQie}`}
                  size={150}
                  bgColor="transparent"
                  fgColor="#1294a9"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 border border-border"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/pay/${invoice.id}`);
                    toast.success("Payment link copied");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy Link
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => onShowQr(invoice)}>
                  <QrCode className="h-4 w-4 mr-2" /> Full QR
                </Button>
              </div>

              {invoice.txHash && (
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Transaction</div>
                  <a className="font-mono text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline" href="#">
                    {truncateAddress(invoice.txHash, 10, 8)} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">Timeline</div>
                <ol className="space-y-2">
                  <TimelineItem label="Created" done date={invoice.createdAt} />
                  <TimelineItem label="Payment Received" done={invoice.status === "paid"} date={invoice.status === "paid" ? invoice.createdAt : "—"} />
                  <TimelineItem label="Settled" done={invoice.status === "paid"} date={invoice.status === "paid" ? invoice.createdAt : "—"} />
                </ol>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TimelineItem({ label, done, date }: { label: string; done: boolean; date: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className={`h-2 w-2 rounded-full ${done ? "bg-success" : "bg-surface-2"}`} />
      <div className="flex-1 text-sm">{label}</div>
      <div className="text-xs font-mono text-muted-foreground">{date}</div>
    </li>
  );
}

function QrModal({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  if (!invoice) return null;
  const payload = `merchflow:pay/${invoice.id}?amount=${invoice.amountQie}`;
  const downloadPng = () => {
    const svg = document.getElementById("invoice-qr-svg") as SVGSVGElement | null;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const a = document.createElement("a");
    a.href = url; a.download = `${invoice.id}.svg`; a.click();
    toast.success("QR downloaded");
  };
  return (
    <Dialog open={!!invoice} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">{invoice.id}</DialogTitle>
          <DialogDescription>Pay with QIE Wallet — scan to pay.</DialogDescription>
        </DialogHeader>
        <div className="grid place-items-center py-4">
          <div className="p-4 rounded-md border border-border bg-background">
            <QRCodeSVG id="invoice-qr-svg" value={payload} size={256} bgColor="transparent" fgColor="#1294a9" />
          </div>
          <div className="mt-4 font-mono text-2xl">{formatQie(invoice.amountQie)} QIE</div>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" className="border border-border" onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/pay/${invoice.id}`);
            toast.success("Payment link copied");
          }}>
            <Copy className="h-4 w-4 mr-2" /> Copy Link
          </Button>
          <Button onClick={downloadPng} className="bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" /> Download QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}