import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { TopNav } from "./top-nav";
import { DevConsole } from "./dev-console";
import { DemoBanner } from "./demo-banner";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = pathname === "/";
  const isPublicPay = pathname.startsWith("/pay/");
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {!isPublicPay && <DemoBanner />}
      <TopNav transparent={isLanding} />
      <main className="flex-1 pb-12">{children}</main>
      <DevConsole />
    </div>
  );
}
