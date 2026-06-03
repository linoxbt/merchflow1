import { defineChain } from "viem";

export const qieTestnet = defineChain({
  id: 1983,
  name: "QIE Testnet",
  nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc1testnet.qie.digital/",
        "https://rpc2testnet.qie.digital/",
        "https://rpc3testnet.qie.digital/",
        "https://rpc4testnet.qie.digital/",
        "https://rpc5testnet.qie.digital/",
        "https://rpc6testnet.qie.digital/",
      ],
    },
  },
  blockExplorers: {
    default: { name: "QIE Testnet Explorer", url: "https://testnet.qie.digital" },
  },
  testnet: true,
});

export const qieMainnet = defineChain({
  id: 1990,
  name: "QIE Mainnet",
  nativeCurrency: { name: "QIEV3", symbol: "QIEV3", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc1mainnet.qie.digital/",
        "https://rpc2mainnet.qie.digital/",
        "https://rpc3mainnet.qie.digital/",
        "https://rpc4mainnet.qie.digital/",
        "https://rpc5mainnet.qie.digital/",
      ],
    },
  },
  blockExplorers: {
    default: { name: "QIE Mainnet Explorer", url: "https://mainnet.qie.digital" },
  },
});

export const qieChains = [qieTestnet, qieMainnet] as const;
