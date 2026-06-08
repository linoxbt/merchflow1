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

## Invoice Registry

`contracts/InvoiceRegistry.sol` replaces Supabase invoice rows when a registry address is configured.

Stored per invoice:

- `id`
- `number`
- `merchant`
- `payer`
- `amountQieWei`
- `amountUsdCents`
- `dueDate`
- `createdAt`
- `paidAt`
- `status`
- `metadataHash`
- `memo`

The app creates invoices through the registry, lists invoice IDs per merchant with `getMerchantInvoices`, hydrates each row with `getInvoice`, and pays invoices through `payInvoice`. `payInvoice` accepts the exact native QIE amount, marks the invoice paid, emits `InvoicePaid`, and forwards QIE to the merchant.

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

forge create contracts/InvoiceRegistry.sol:InvoiceRegistry \
  --rpc-url "$QIE_TESTNET_RPC_URL" \
  --private-key "$QIE_TESTNET_PRIVATE_KEY"
```

After deployment, add the addresses to `.env.local`:

```env
VITE_QIE_MERCHANT_REGISTRY_TESTNET=0x...
VITE_QIE_INVOICE_REGISTRY_TESTNET=0x...
```

Then restart the app so Vite picks up the new public contract address.
