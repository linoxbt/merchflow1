import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Receipt, Users, TrendingUp, Zap } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MerchFlow — Accept, pay, and borrow on QIE" },
      { name: "description", content: "The merchant operating system for QIE. Accept payments, run payroll, and unlock working-capital credit from your on-chain revenue." },
      { property: "og:title", content: "MerchFlow" },
      { property: "og:description", content: "Invoices, payroll, and credit — built on QIE." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { connected } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (connected) navigate({ to: "/dashboard" });
  }, [connected, navigate]);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(18,148,169,0.18), transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(0,180,204,0.10), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-mono text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Powered by QIE — Testnet & Mainnet live
          </div>


          <h1 className="font-mono font-bold text-4xl sm:text-6xl leading-[1.05] tracking-tight max-w-3xl">
            Accept payments.
            <br />
            Pay your staff.
            <br />
            Build <span className="text-primary">credit</span>.
            <br />
            <span className="text-muted-foreground">All on QIE.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            The business bank account QIE merchants have been missing.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ConnectButton.Custom>
              {({ openConnectModal, account, mounted }) => {
                const ready = mounted;
                if (ready && account) {
                  return (
                    <Button
                      size="lg"
                      onClick={() => navigate({ to: "/dashboard" })}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  );
                }
                return (
                  <Button
                    size="lg"
                    onClick={openConnectModal}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Connect Wallet <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                );
              }}
            </ConnectButton.Custom>
            <a href="#features">
              <Button
                size="lg"
                variant="ghost"
                className="border border-border text-foreground hover:bg-surface-2"
              >
                See how it works
              </Button>
            </a>
          </div>

        </div>

        {/* STATS */}
        <div className="border-y border-border bg-surface/60">
          <div className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            {[
              { v: "$2.4M+", l: "Total Volume Processed" },
              { v: "1,240", l: "Active Merchants" },
              { v: "98ms", l: "Avg Settlement Time" },
              { v: "0%", l: "Platform Fees" },
            ].map((s) => (
              <div key={s.l} className="px-6 py-4 md:py-2">
                <div className="font-mono text-2xl sm:text-3xl text-primary">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Receipt,
              title: "Create. Share. Get Paid.",
              body: "Generate invoices and QR codes in seconds. Customers pay with QIE Wallet. Funds settle instantly. No chargebacks, no intermediaries.",
            },
            {
              icon: Users,
              title: "Pay Everyone at Once.",
              body: "Send payroll to your entire team in one transaction. Staff without wallets get claim codes. Salary in QIE Stable, converted from any currency.",
            },
            {
              icon: TrendingUp,
              title: "Revenue Becomes Credit.",
              body: "Your payment history on MerchFlow builds a verified credit score. Borrow working capital against your own track record — no bank required.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-lg border border-border bg-surface p-6 hover:border-primary/40 transition-colors"
            >
              <div className="h-10 w-10 rounded-md bg-primary/15 border border-primary/30 grid place-items-center text-primary mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-mono font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* QIE INTEGRATIONS */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-6 py-10 text-center">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
            Fully integrated with the QIE ecosystem
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {["QIE Wallet", "QIE Stable", "QIE Pass", "QIE Oracle", "QIE DEX"].map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono text-primary"
              >
                <Zap className="h-3 w-3" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-7xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-mono font-bold text-primary">MerchFlow</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/explore" className="hover:text-foreground">Explore</Link>
          <a href="#" className="hover:text-foreground">GitHub</a>
          <a href="#" className="hover:text-foreground">Docs</a>
          <span>© 2026 linoxbt</span>
        </div>
      </footer>
    </div>
  );
}
