import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { TopNav } from "./top-nav";
import { DevConsole } from "./dev-console";
import { WrongChainBanner } from "./wrong-chain-banner";
import { BackButton } from "./back-button";
import { GasTopUpBanner } from "./gas-top-up-banner";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = pathname === "/";
  const isPublicPay = pathname.startsWith("/pay/") || pathname.startsWith("/p/");
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <WrongChainBanner />
      {!isPublicPay && <GasTopUpBanner />}
      <TopNav transparent={isLanding} />
      {!isLanding && <BackButton />}
      <main className="flex-1 pb-12">{children}</main>
      <DevConsole />
    </div>
  );
}
