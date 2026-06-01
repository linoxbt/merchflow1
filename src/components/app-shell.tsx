import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { TopNav } from "./top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = pathname === "/";
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNav transparent={isLanding} />
      <main className="flex-1">{children}</main>
    </div>
  );
}