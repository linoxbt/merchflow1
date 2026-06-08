import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWallet } from "@/lib/wallet";

export function RequireWallet({ children }: { children: ReactNode }) {
  const { connected, merchant, merchantLoading } = useWallet();
  const navigate = useNavigate();
  useEffect(() => {
    if (merchantLoading) return;
    if (!connected) {
      navigate({ to: "/" });
    } else if (!merchant) {
      navigate({ to: "/onboard" });
    }
  }, [connected, merchant, merchantLoading, navigate]);
  if (!connected || merchantLoading || !merchant) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-muted-foreground text-sm">
        Connecting…
      </div>
    );
  }
  return <>{children}</>;
}
