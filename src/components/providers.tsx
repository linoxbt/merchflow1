import { useEffect, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { ThemeProvider, useTheme } from "next-themes";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig } from "@/lib/wagmi-config";
import { WalletProvider } from "@/lib/wallet";

function RainbowKitThemed({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const theme =
    resolvedTheme === "dark"
      ? darkTheme({
          accentColor: "hsl(189 78% 38%)",
          accentColorForeground: "white",
          borderRadius: "medium",
          overlayBlur: "small",
        })
      : lightTheme({
          accentColor: "hsl(189 78% 38%)",
          accentColorForeground: "white",
          borderRadius: "medium",
          overlayBlur: "small",
        });
  return <RainbowKitProvider theme={theme} modalSize="compact">{children}</RainbowKitProvider>;
}

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
          <RainbowKitThemed>
            <WalletProvider>{children}</WalletProvider>
          </RainbowKitThemed>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
