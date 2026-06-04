import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, QrCode, Copy, Download, MoreHorizontal, ExternalLink, Camera } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RequireWallet } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { OracleRate } from "@/components/oracle-rate";
import { QrScanner } from "@/components/qr-scanner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatQie, num, type InvoiceRow, type InvoiceStatus } from "@/lib/types";
import { useWallet, truncateAddress } from "@/lib/wallet";
import { useQieOracle } from "@/lib/qie-hooks";
import { createInvoice, listInvoicesByMerchant } from "@/lib/invoices.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices — MerchFlow" }] }),
  component: () => <RequireWallet><Invoices /></RequireWallet>,
});

const TABS = ["all", "paid", "pending", "overdue", "cancelled"] as const;

function Invoices() {
  const { address } = useWallet();
  const list = useServerFn(listInvoicesByMerchant);
  const qc = useQueryClient();
  const queryKey = ["invoices", address?.toLowerCase()];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!address,
    queryFn: () => list({ data: { wallet: address! } }),
  });
  const invoices = (data?.invoices ?? []) as InvoiceRow[];

  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<InvoiceRow | null>(null);
  const [qrInvoice, setQrInvoice] = useState<InvoiceRow | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (tab !== "all" && i.status !== tab) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return i.number.toLowerCase().includes(s) ||
        i.customer_wallet.toLowerCase().includes(s) ||
        i.description.toLowerCase().includes(s);
    });
  }, [invoices, tab, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: invoices.length };
    for (const s of ["paid", "pending", "overdue", "cancelled"]) {
      c[s] = invoices.filter((i) => i.status === s).length;
    }
    return c;
  }, [invoices]);

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
        <div className="flex gap-2">
          <Button variant="ghost" className="border border-border" onClick={() => setScannerOpen(true)}>
            <Camera className="h-4 w-4 mr-2" /> Scan QR
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Create Invoice
          </Button>
        </div>
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
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading invoices…</div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} hasAny={invoices.length > 0} />
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
                    <td className="py-3 px-4 font-mono">{inv.number}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{truncateAddress(inv.customer_wallet)}</td>
                    <td className="py-3 px-4 text-muted-foreground max-w-[260px] truncate">{inv.description}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono">{formatQie(num(inv.amount_qie))} QIE</div>
                      <div className="font-mono text-[10px] text-muted-foreground">${formatQie(num(inv.amount_usd))}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.due_date}</td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.created_at.slice(0, 10)}</td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status as InvoiceStatus} /></td>
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
        onCreated={(inv) => { qc.invalidateQueries({ queryKey }); setActive(inv); }}
        onShowQr={(inv) => setQrInvoice(inv)}
      />

      <InvoiceDetailSheet
        invoice={active}
        onClose={() => setActive(null)}
        onShowQr={(inv) => { setQrInvoice(inv); }}
      />

      <QrModal invoice={qrInvoice} onClose={() => setQrInvoice(null)} />

      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(text) => {
          const match = text.match(/\/pay\/([^/?#]+)/);
          const id = match ? match[1] : text;
          window.location.href = `/pay/${id}`;
        }}
      />
    </div>
  );
}

function EmptyState({ onCreate, hasAny }: { onCreate: () => void; hasAny: boolean }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-surface-2 grid place-items-center mb-4">
        <QrCode className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="font-medium">{hasAny ? "No invoices match this filter" : "No invoices yet"}</div>
      <div className="text-sm text-muted-foreground mt-1">
        {hasAny ? "Try clearing the filter or search." : "Create your first invoice to start building your payment history."}
      </div>
      {!hasAny && (
        <Button onClick={onCreate} className="mt-4 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Invoice
        </Button>
      )}
    </div>
  );
}

function CreateInvoiceDialog({
  open, onOpenChange, onCreated, onShowQr,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (inv: InvoiceRow) => void;
  onShowQr: (inv: InvoiceRow) => void;
}) {
  const { address } = useWallet();
  const { rate } = useQieOracle();
  const create = useServerFn(createInvoice);

  const [customer, setCustomer] = useState("");
  const [description, setDescription] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<InvoiceRow | null>(null);

  const amountQie = useMemo(() => {
    const n = parseFloat(amountUsd);
    return Number.isFinite(n) ? n * rate : 0;
  }, [amountUsd, rate]);

  const reset = () => {
    setCustomer(""); setDescription(""); setAmountUsd(""); setDueDate(""); setLabel(""); setCreated(null);
  };

  const submit = async () => {
    if (!address) { toast.error("Wallet not connected"); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(customer)) { toast.error("Enter a valid wallet address"); return; }
    if (!description.trim()) { toast.error("Description required"); return; }
    if (!amountUsd || amountQie <= 0) { toast.error("Enter an amount"); return; }
    if (!dueDate) { toast.error("Pick a due date"); return; }
    setSubmitting(true);
    try {
      const { invoice } = await create({
        data: {
          merchantWallet: address,
          customerWallet: customer,
          description: label ? `${label} — ${description}` : description,
          amountUsd: parseFloat(amountUsd),
          amountQie,
          dueDate,
        },
      });
      const row = invoice as InvoiceRow;
      onCreated(row);
      setCreated(row);
      toast.success("Invoice created");
    } catch (err) {
      toast.error("Could not create invoice", { description: err instanceof Error ? err.message : "Try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>Generate an invoice and shareable QR code.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              <div>
                <Label>Customer Wallet Address</Label>
                <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="0x…" className="mt-1.5 font-mono" />
              </div>
              <div>
                <Label>Invoice Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Web development services — July" className="mt-1.5" />
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

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="border border-border">Cancel</Button>
                <Button onClick={submit} disabled={submitting} className="bg-primary hover:bg-primary/90">
                  {submitting ? "Creating…" : "Create Invoice"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-success/15 border border-success/30 grid place-items-center text-success mb-3">
              ✓
            </div>
            <DialogTitle className="text-success">Invoice Created</DialogTitle>
            <div className="font-mono text-lg mt-2">{created.number}</div>
            <div className="font-mono text-muted-foreground text-sm">{formatQie(num(created.amount_qie))} QIE</div>
            <p className="mt-3 text-sm text-muted-foreground">Share this link or QR code with your customer.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="ghost"
                className="border border-border"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/pay/${created.number}`);
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
  invoice: InvoiceRow | null;
  onClose: () => void;
  onShowQr: (inv: InvoiceRow) => void;
}) {
  return (
    <Sheet open={!!invoice} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {invoice && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle className="font-mono">{invoice.number}</SheetTitle>
                <StatusBadge status={invoice.status as InvoiceStatus} />
              </div>
            </SheetHeader>
            <div className="mt-6 space-y-5 text-sm">
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Customer</div>
                <div className="font-mono mt-1">{truncateAddress(invoice.customer_wallet, 10, 8)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Description</div>
                <div className="mt-1">{invoice.description}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Amount</div>
                <div className="font-mono text-2xl mt-1">{formatQie(num(invoice.amount_qie))} <span className="text-sm text-muted-foreground">QIE Stable</span></div>
                <div className="font-mono text-xs text-muted-foreground">≈ ${formatQie(num(invoice.amount_usd))} USD</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Created</div>
                  <div className="mt-1">{invoice.created_at.slice(0, 10)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Due</div>
                  <div className="mt-1">{invoice.due_date}</div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background p-4 grid place-items-center">
                <QRCodeSVG
                  value={typeof window !== "undefined" ? `${window.location.origin}/pay/${invoice.number}` : ""}
                  size={150}
                  bgColor="transparent"
                  fgColor="currentColor"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 border border-border"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/pay/${invoice.number}`);
                    toast.success("Payment link copied");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy Link
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => onShowQr(invoice)}>
                  <QrCode className="h-4 w-4 mr-2" /> Full QR
                </Button>
              </div>

              {invoice.tx_hash && (
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Transaction</div>
                  <a className="font-mono text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline" href="#">
                    {truncateAddress(invoice.tx_hash, 10, 8)} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function QrModal({ invoice, onClose }: { invoice: InvoiceRow | null; onClose: () => void }) {
  if (!invoice) return null;
  const payload = `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${invoice.number}`;
  const downloadSvg = () => {
    const svg = document.getElementById("invoice-qr-svg") as SVGSVGElement | null;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const a = document.createElement("a");
    a.href = url; a.download = `${invoice.number}.svg`; a.click();
    toast.success("QR downloaded");
  };
  return (
    <Dialog open={!!invoice} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">{invoice.number}</DialogTitle>
          <DialogDescription>Pay with QIE Wallet — scan to pay.</DialogDescription>
        </DialogHeader>
        <div className="grid place-items-center py-4">
          <div className="p-4 rounded-md border border-border bg-background text-primary">
            <QRCodeSVG id="invoice-qr-svg" value={payload} size={256} bgColor="transparent" fgColor="currentColor" />
          </div>
          <div className="mt-4 font-mono text-2xl">{formatQie(num(invoice.amount_qie))} QIE</div>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" className="border border-border" onClick={() => {
            navigator.clipboard.writeText(payload);
            toast.success("Payment link copied");
          }}>
            <Copy className="h-4 w-4 mr-2" /> Copy Link
          </Button>
          <Button onClick={downloadSvg} className="bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" /> Download QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
