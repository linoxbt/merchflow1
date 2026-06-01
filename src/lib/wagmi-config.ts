import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { qieMainnet, qieTestnet } from "./chains";

export const WALLETCONNECT_PROJECT_ID = "f0d6f8162be1beccf221b4e2f8bd7026";

export const wagmiConfig = getDefaultConfig({
  appName: "MerchFlow",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [qieTestnet, qieMainnet],
  ssr: true,
});
