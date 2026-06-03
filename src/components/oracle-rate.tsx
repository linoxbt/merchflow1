import { Activity } from "lucide-react";
import { useQieOracle } from "@/lib/qie-hooks";

export function OracleRate({ className = "" }: { className?: string }) {
  const { rate, live } = useQieOracle();
  return (
    <div className={`inline-flex items-center gap-2 text-[11px] font-mono text-muted-foreground ${className}`}>
      <Activity className={`h-3 w-3 ${live ? "text-success animate-pulse" : "text-muted-foreground"}`} />
      <span>1 USD = {rate.toFixed(3)} QIE Stable</span>
      <span className="text-border">·</span>
      <span>{live ? "Live via QIE Oracle" : "Oracle not configured — fallback rate"}</span>
    </div>
  );
}