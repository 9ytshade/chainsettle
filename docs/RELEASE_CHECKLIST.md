# ChainSettle Release Checklist

## 1. Toolchain Verification
* [x] GenLayer CLI: `0.39.1` (`npx genlayer --version`)
* [x] Studionet Network: Chain ID `61999` (`npx genlayer network info`)
* [x] Python environment: `genlayer-py==0.16.3`, `genlayer-test==0.29.2`, `genvm-linter==0.7.1`

## 2. Contract Linter Gate
* [x] `genvm-lint contracts/chainsettle.py` passes with zero errors.
* [x] `genvm-lint validate contracts/chainsettle.py` confirms:
  * Contract: `ChainSettle`
  * Methods: 14 (7 view, 7 write)
  * Version: `1.1.0`

## 3. Direct Mode Testing Gate
* [x] `pytest tests/direct/ -v` passes 100% of test cases (21/21 in 3.57s).
* [x] Scenarios covered:
  * Agreement creation & deposit escrow.
  * Invalid parameters & boundary rejection.
  * Delivery submission & commit validation.
  * Direct client approval & 100% payout.
  * Uncontested timeout settlement.
  * Dispute registration.
  * Dynamic criteria-weighted BPS proportional split (23.6%, 50%, 86%).
  * Itemized mathematical breakdown derivation.
  * Undetermined retry handling.

## 4. Frontend Safety Gate
* [x] Linear Design System implemented: midnight precision instrument dark palette (`#08090a`, `#0f1011`, `#161718`, `#23252a`, `#e4f222`).
* [x] `npm run check` (Vitest 8/8 + ESLint clean + Next.js build all 6 routes) passes clean.
* [x] No private keys or mnemonics in code, `.env.local`, or logs.
* [x] Contract version compatibility guard active (`1.1.0`).
* [x] Real-time transaction lifecycle tracker for write calls.

## 5. Studionet E2E Live Verification
* [x] Contract deployed to Studionet (Chain 61999).
  * Contract Address: `0xF00E730A1c9BF3163eAAF584880adA78E1511f58`
  * Transaction Hash: `0x87f43ab15ce691534f85a436fc01ad3c86b285b9bea9fa79ef649ecbdbe9b9ae`
* [x] Address recorded in `web/.env.local`, `web/.env.example`, `web/src/lib/genlayer.ts`, and `README.md`.
* [x] Live RPC read verified (`get_contract_version` -> `"1.1.0"`).
