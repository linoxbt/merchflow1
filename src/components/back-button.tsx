import { ChevronLeft } from "lucide-react";
import { useRouter, useRouterState, Link } from "@tanstack/react-router";

/**
 * Renders a back button on every non-landing route. Uses router history when
 * possible; falls back to the dashboard for direct loads.
 */
export function BackButton() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/") return null;

  const canGoBack =
    typeof window !== "undefined" && window.history.length > 1;

  const fallback = pathname.startsWith("/pay/") ? "/" : "/dashboard";

  const cls =
    "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-3">
      {canGoBack ? (
        <button type="button" onClick={() => router.history.back()} className={cls}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      ) : (
        <Link to={fallback} className={cls}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
      )}
    </div>
  );
}
