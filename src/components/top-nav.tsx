import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutGrid, Menu, X } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { QieWalletButton } from "@/components/qie-wallet-button";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/invoices", label: "Invoices" },
  { to: "/payroll", label: "Payroll" },
  { to: "/credit", label: "Credit" },
  { to: "/explore", label: "Explore" },
] as const;

export function TopNav({ transparent = false }: { transparent?: boolean }) {
  const { connected } = useWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <ThemeToggle />
          <QieWalletButton size="sm" />
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
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-surface-2",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
