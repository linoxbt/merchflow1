import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Trash2, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

type LogLevel = "log" | "info" | "warn" | "error" | "nav";
type LogEntry = {
  id: number;
  level: LogLevel;
  time: number;
  message: string;
};

let counter = 0;
function next() {
  counter += 1;
  return counter;
}

function fmt(args: unknown[]) {
  return args
    .map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ""}`;
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(a, null, 0);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  log: "text-muted-foreground",
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
  nav: "text-primary",
};

export function DevConsole() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  const push = (level: LogLevel, message: string) => {
    setLogs((prev) => {
      const nextList = [...prev, { id: next(), level, time: Date.now(), message }];
      return nextList.slice(-300);
    });
  };

  // Patch console + global error listeners
  useEffect(() => {
    if (typeof window === "undefined") return;
    const orig = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
    (["log", "info", "warn", "error"] as const).forEach((lvl) => {
      console[lvl] = (...args: unknown[]) => {
        push(lvl, fmt(args));
        orig[lvl](...(args as []));
      };
    });
    const onError = (e: ErrorEvent) => push("error", `${e.message} @ ${e.filename}:${e.lineno}`);
    const onRej = (e: PromiseRejectionEvent) =>
      push("error", `Unhandled rejection: ${fmt([e.reason])}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      console.log = orig.log;
      console.info = orig.info;
      console.warn = orig.warn;
      console.error = orig.error;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  // Subscribe to navigation
  useEffect(() => {
    const unsub = router.subscribe("onResolved", (e) => {
      push("nav", `→ ${e.toLocation.pathname}${e.toLocation.search ? "?" + new URLSearchParams(e.toLocation.search as Record<string, string>).toString() : ""}`);
    });
    return unsub;
  }, [router]);

  // Auto-scroll
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs, open]);

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-7xl border-t border-border bg-surface/95 backdrop-blur shadow-lg",
          open ? "h-64" : "h-9",
        )}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full h-9 px-4 flex items-center gap-3 text-xs font-mono hover:bg-surface-2 transition-colors"
        >
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">Dev Console</span>
          <span className="text-muted-foreground">{logs.length} events</span>
          {errorCount > 0 && (
            <span className="text-destructive">· {errorCount} error{errorCount > 1 ? "s" : ""}</span>
          )}
          {warnCount > 0 && (
            <span className="text-warning">· {warnCount} warn</span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {open && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setLogs([]); }}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </span>
            )}
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </span>
        </button>
        {open && (
          <div
            ref={listRef}
            className="h-[calc(100%-2.25rem)] overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed border-t border-border"
          >
            {logs.length === 0 ? (
              <div className="text-muted-foreground italic">
                No events yet. Navigation and console logs will appear here.
              </div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex gap-2 py-0.5">
                  <span className="text-muted-foreground shrink-0">
                    {new Date(l.time).toLocaleTimeString("en-US", { hour12: false })}
                  </span>
                  <span className={cn("uppercase shrink-0 w-10", LEVEL_STYLES[l.level])}>
                    {l.level}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{l.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
