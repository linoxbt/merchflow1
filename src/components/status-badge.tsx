import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types";

const STYLES: Record<string, string> = {
  paid: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  active: "bg-primary/15 text-primary border-primary/30",
  received: "bg-success/15 text-success border-success/30",
  claimed: "bg-primary/15 text-primary border-primary/30",
  pending_claim: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
  processing: "bg-warning/15 text-warning border-warning/30",
};

const LABELS: Record<string, string> = {
  pending_claim: "Pending Claim",
};

export function StatusBadge({ status }: { status: InvoiceStatus | string }) {
  const cls = STYLES[status] ?? STYLES.cancelled;
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border",
        cls,
      )}
    >
      {label}
    </span>
  );
}