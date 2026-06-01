import { Activity } from "lucide-react";
import { ORACLE_RATE } from "@/lib/mock-data";

export function OracleRate({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 text-[11px] font-mono text-muted-foreground ${className}`}>
      <Activity className="h-3 w-3 text-primary animate-pulse" />
      <span>1 USD = {ORACLE_RATE.toFixed(3)} QIE Stable</span>
      <span className="text-border">·</span>
      <span>Live via QIE Oracle</span>
      <span className="text-border">·</span>
      <span>2min ago</span>
    </div>
  );
}