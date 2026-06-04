import { Activity } from "lucide-react";
import { useQieOracle } from "@/lib/qie-hooks";

export function OracleRate({ className = "" }: { className?: string }) {
  const { rate, qiePriceUsd, live, configured } = useQieOracle();
  const status = live
    ? "Live via QIE Oracle"
    : configured
      ? "Oracle unreachable — fallback rate"
      : "Oracle not configured — fallback rate";

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground ${className}`}>
      <Activity className={`h-3 w-3 ${live ? "text-success animate-pulse" : "text-muted-foreground"}`} />
      <span>1 USD = {rate.toFixed(3)} QUSDC</span>
      {live && qiePriceUsd != null && (
        <>
          <span className="text-border">·</span>
          <span>1 QIE = ${qiePriceUsd.toFixed(4)}</span>
        </>
      )}
      <span className="text-border">·</span>
      <span>{status}</span>
    </div>
  );
}
