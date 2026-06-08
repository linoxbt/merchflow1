import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWallet } from "@/lib/wallet";

export function RequireWallet({ children }: { children: ReactNode }) {
  const { connected, merchant } = useWallet();
  const navigate = useNavigate();
  useEffect(() => {
    if (!connected) {
      navigate({ to: "/" });
    } else if (!merchant) {
      navigate({ to: "/onboard" });
    }
  }, [connected, merchant, navigate]);
  if (!connected || !merchant) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-muted-foreground text-sm">
        Connecting…
      </div>
    );
  }
  return <>{children}</>;
}
