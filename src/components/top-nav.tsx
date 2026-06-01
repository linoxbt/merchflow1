import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, LayoutGrid, Menu, X } from "lucide-react";
import { useWallet, truncateAddress } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/invoices", label: "Invoices" },
  { to: "/payroll", label: "Payroll" },
  { to: "/credit", label: "Credit" },
  { to: "/explore", label: "Explore" },
] as const;

export function TopNav({ transparent = false }: { transparent?: boolean }) {
  const { address, connected, connect, disconnect } = useWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full backdrop-blur",
        transparent
          ? "bg-background/70 border-b border-transparent"
          : "bg-background/80 border-b border-border",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/30 grid place-items-center text-primary">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <span className="font-mono font-bold text-primary tracking-tight text-base">
            MerchFlow
          </span>
        </Link>

        {connected && (
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => {
              const active = pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {connected ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span>{truncateAddress(address)}</span>
                <button onClick={copy} className="text-muted-foreground hover:text-foreground">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 grid place-items-center text-primary text-xs font-mono uppercase">
                {address?.slice(2, 3)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnect}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connect} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Connect QIE Wallet
            </Button>
          )}

          {connected && (
            <button
              className="md:hidden p-2 rounded-md hover:bg-surface-2"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {connected && mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <div className="px-4 py-2 grid gap-1">
            {NAV_LINKS.map((l) => {
              const active = pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium",
                    active ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-surface-2",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
            <div className="border-t border-border my-2" />
            <div className="px-3 py-2 text-xs font-mono text-muted-foreground">
              {truncateAddress(address)}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}