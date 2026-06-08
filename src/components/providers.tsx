import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { wagmiConfig } from "@/lib/wagmi-config";
import { WalletProvider } from "@/lib/wallet";

export function Providers({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>{children}</WalletProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
