# MerchFlow Contracts

## Merchant Registry

`contracts/MerchantRegistry.sol` stores the first on-chain merchant profile proof.

Stored per wallet:

- `wallet`
- `metadataHash`
- `categoryHash`
- `onboardedAt`
- `active`

The readable business profile is intentionally not stored directly on-chain. The app hashes a canonical JSON profile and registers that hash. Later migrations can move the readable JSON to IPFS/Arweave and keep the same on-chain hash pattern.

## QIE Testnet Deploy

Create `/root/merchflow1/.env.local`:

```env
QIE_TESTNET_PRIVATE_KEY=your_private_key_here
QIE_TESTNET_RPC_URL=https://rpc1testnet.qie.digital/
QIE_TESTNET_CHAIN_ID=1983
```

Deploy:

```bash
cd /root/merchflow1
set -a
source .env.local
set +a
forge create contracts/MerchantRegistry.sol:MerchantRegistry \
  --rpc-url "$QIE_TESTNET_RPC_URL" \
  --private-key "$QIE_TESTNET_PRIVATE_KEY"
```

After deployment, add the address to `.env.local`:

```env
VITE_QIE_MERCHANT_REGISTRY_TESTNET=0x...
```

Then restart the app so Vite picks up the new public contract address.
