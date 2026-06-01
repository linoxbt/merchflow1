import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="border-b border-warning/30 bg-warning/10 text-warning">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-1.5 flex items-center gap-2 text-[11px] font-mono">
        <Info className="h-3 w-3 shrink-0" />
        <span>
          Demo mode — wallet, network, and QR codes are real on QIE; invoice / payroll / credit
          data shown is sample data until contracts are deployed.
        </span>
      </div>
    </div>
  );
}
