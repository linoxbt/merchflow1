# MerchFlow Audit Report

Date: 2026-06-08  
Repo: https://github.com/linoxbt/merchflow1  
Local path: `/root/merchflow1`

## Executive Summary

MerchFlow is a strong QIE hackathon demo because it focuses on a concrete merchant workflow: create invoices, share payment links/QR codes, accept QIE payments, record payroll, and derive a credit profile from business activity.

The current implementation is now more honest about QIE integrations:

- QIE Wallet is handled through the injected EVM provider, branded as "Connect QIE Wallet".
- QIE mainnet/testnet are configured with the documented chain IDs and RPCs.
- Invoice links are shortened to `/p/:invoiceId`.
- QR codes encode the shortened public payment URL.
- QIE Stable is read-only: the app displays the connected wallet balance as a reference.
- QIE DEX is linked only when the user has a low native QIE gas balance.
- QIE Pass and QIE Oracle have been removed because they did not align with the current product flow.

The largest remaining weakness is still source-of-truth integrity. Supabase stores merchants, invoices, payroll, loans, pool deposits, and activity. Several server functions accept wallet addresses and transaction hashes from the browser without signature/session binding or server-side chain verification.

## Sources Checked

- QIE network docs: `https://docs.qie.digital/getting-started-with-qie-blockchain/4.-access-mainnet-or-testnet`
- QIE website: `https://www.qie.digital/`
- QIE Wallet: `https://www.qiewallet.me/`
- QIE DEX docs/app: `https://qiedex.qie.digital/about-qiedex`, `https://www.dex.qie.digital/`

Relevant QIE facts:

- QIE mainnet chain ID: `1990`
- QIE mainnet symbol: `QIEV3`
- QIE testnet chain ID: `1983`
- QIE testnet symbol: `QIE`
- Mainnet explorer: `https://mainnet.qie.digital/`
- Testnet explorer: `https://testnet.qie.digital/`
- QIE Wallet is positioned as a multi-chain wallet that connects to dApps.
- QIE is EVM-compatible, so injected-provider wallet integration is the right baseline when no dedicated QIE Wallet SDK is published.

## Changes Made

### Short Payment Links And QR Codes

Added `src/lib/payment-links.ts`:

- `getPaymentPath(invoiceNumber)` returns `/p/:invoiceNumber`
- `getPaymentUrl(invoiceNumber)` returns an absolute browser URL where possible
- `parsePaymentTarget(text)` accepts both `/p/...` and legacy `/pay/...`

Added `src/routes/p.$invoiceId.tsx` as the short public payment route.

Invoice copy buttons and QR payloads now use the shortened URL, for example:

```text
https://your-domain.example/p/INV-0001
```

### QIE Wallet Integration

Removed RainbowKit UI and config.

Added:

- `src/components/qie-wallet-button.tsx`
- local wagmi `injected()` connector config

The app now uses a "Connect QIE Wallet" button over the injected EIP-1193 provider. If no injected provider is present, the UI points users to QIE Wallet.

### QIE Stable And QIE DEX

QIE Stable is now read-only only:

- `useQieStableBalance()` reads `balanceOf` and `decimals`.
- Dashboard/payroll display the connected wallet's QIE Stable balance as a reference.
- Invoice payment no longer forces ERC-20 QIE Stable transfer.

QIE DEX is now a low-gas helper only:

- `src/components/gas-top-up-banner.tsx`
- If connected native gas balance is below `0.02`, the app shows "Get QIE for gas" linking to QIE DEX.

### Vercel Blank Page Fix

Fixed two likely causes:

- Supabase service-role client is lazy-created, so missing `MERCHFLOW_SUPABASE_SERVICE_ROLE_KEY` no longer crashes public SSR routes at module import time.
- Nitro Vercel preset is forced in `vite.config.ts`, and `vercel.json` uses the TanStack Start framework preset.
- Build script uses a larger Node heap to avoid production-build OOM.

## What Is Well Implemented

### Product Concept

The app has a coherent merchant operating-system story:

- invoice creation
- public payment links
- QR payment flow
- payroll records
- claim codes
- credit scoring
- QIE ecosystem exploration

### QIE Network Setup

`src/lib/chains.ts` correctly configures QIE mainnet/testnet chain IDs, RPC URLs, symbols, and explorers.

### Payment UX

The invoice flow is the strongest part:

- merchant creates an invoice
- app generates a short URL and QR code
- customer opens a public payment page
- QIE Wallet connects through the injected provider
- native QIE transfer is submitted
- receipt wait happens before calling `markInvoicePaid`

### QR Code UX

QR generation uses `qrcode.react`, supports copy/download, and now encodes a shorter public URL.

### Deployment Shape

Production build now generates Vercel Build Output API files:

- `.vercel/output/config.json`
- `.vercel/output/functions/__server.func/index.mjs`
- `.vercel/output/static/...`

This is the correct shape for SSR routes instead of a static-only blank page.

## What Is Not Well Implemented

### Critical: Server Functions Trust Browser Wallet Identity

Server functions accept wallet addresses from request bodies and mutate Supabase with a service-role key.

Examples:

- `registerMerchant` trusts `wallet`
- `createInvoice` trusts `merchantWallet`
- `createPayrollRun` trusts `merchantWallet`
- `requestLoan` trusts `wallet`
- `depositToPool` trusts `wallet`

Required fix:

- implement wallet signature login or SIWE-style challenges
- verify signatures server-side
- derive wallet identity from the verified session, not client input

### Critical: Payment Status Is Not Server-Verified

`markInvoicePaid` trusts a client-submitted tx hash after the frontend waits for a receipt. The server still does not independently verify:

- tx exists on QIE
- tx succeeded
- recipient equals invoice merchant wallet
- value equals invoice amount
- chain ID is supported
- invoice is still payable

Required fix:

- use server-side `viem` receipt lookup
- verify native transfer recipient/value
- make confirmation idempotent
- reject stale/cancelled invoices

### Critical: Payroll And Credit Are Ledger Simulations

Payroll creates records and claim codes, but does not transfer or escrow funds on-chain. Credit and pool flows are database records with generated/fake tx hashes.

Required fix:

- implement payroll batch transfer or escrow contract
- implement claim-code escrow/redeem contract
- implement lending pool contract
- verify all repayment/deposit/disbursement transactions server-side

### Medium: Invoice Number Race Condition

Invoice numbers are generated by reading the latest invoice and incrementing. Concurrent creates can collide.

Required fix:

- use database sequence or unique constraint with retry

### Medium: Tests Are Missing

Add tests for:

- payment link helper behavior
- QR payload values
- QIE Wallet connect state
- invoice tx verification
- server-function auth rejection

## Does This App Require Supabase?

Right now, yes. The current app requires Supabase for:

- merchants
- invoices
- payroll runs
- payroll recipients
- claim codes
- loans
- pool deposits
- activity feed

The product does not inherently require Supabase. Supabase is being used as the source of truth for a prototype.

To make it fully on-chain, replace those tables with contracts and use an indexer only for fast UI reads.

## What Is Left To Make It Fully On-Chain

1. Merchant registry contract.
2. Invoice registry plus payment confirmation contract.
3. Payroll batch transfer or payroll escrow contract.
4. Claim-code escrow using hashed secrets or signed claims.
5. Lending pool contract for deposits, borrows, repayments, interest, and defaults.
6. Server-side or indexer-backed tx verification until the UI reads fully from chain.
7. Wallet-signature authentication for all server mutations that remain.
8. Event indexer for dashboard/history queries.

## Final Assessment

Current readiness: strong hackathon demo, not production payment infrastructure.

The most important next engineering step is server-side transaction verification for invoice payments. That would turn the strongest user-facing flow into a defensible real payment flow.
