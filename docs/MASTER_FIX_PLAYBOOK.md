# GenLayer Master Production Fix Playbook & Release Standard

> **The Definitive Gold Standard for Intelligent Contract dApps**  
> *Architected & Standardized by 9ytshade (2026)*

This playbook documents the battle-tested engineering patterns, security controls, and resilience standards implemented in **ChainSettle** (and derived from **ProofPay**). Use this playbook as the non-negotiable standard for all upcoming GenLayer projects before submitting to production or external audits.

---

## Core Architecture & Table of Contents

1. [Protocol Documentation & Truth Alignment](#1-protocol-documentation--truth-alignment)
2. [Resilient On-Chain Reads & Partial Data Warnings](#2-resilient-on-chain-reads--partial-data-warnings)
3. [Newest-First Pagination & Discovery Beyond 100 Records](#3-newest-first-pagination--discovery-beyond-100-records)
4. [Timezone Precision & Dual-Timezone Confirmation](#4-timezone-precision--dual-timezone-confirmation)
5. [Terminal Polling Discipline & Leak Prevention](#5-terminal-polling-discipline--leak-prevention)
6. [Dependency Hardening & Lockfile Synchronization](#6-dependency-hardening--lockfile-synchronization)
7. [Offline-Independent Builds (Zero Google Font Reliance)](#7-offline-independent-builds-zero-google-font-reliance)
8. [Comprehensive Critical-Flows Test Matrix](#8-comprehensive-critical-flows-test-matrix)
9. [Smart Contract Invariants & Direct Mode Testing](#9-smart-contract-invariants--direct-mode-testing)
10. [Pre-Submission Release Checklist](#10-pre-submission-release-checklist)

---

## 1. Protocol Documentation & Truth Alignment

### The Invariant
**The public `/protocol` page, `README.md`, and specification docs MUST match the exact behavior of the deployed contract with 100% mathematical precision.**

### Failure Mode Prevented
- Claiming an old 80/100 threshold when the deployed contract requires 100% PASS.
- Mismatch between storage types (`pipe-separated` vs `JSON`).
- Misrepresenting transient network retries (`HTTP 429/5xx` as `UNDETERMINED`) vs deterministic code defects (`HTTP 404/410` as `FAIL / FULL_REFUND_CLIENT`).

### The Standard Pattern
- **Stage 1 (Autonomous Verification):** Document that 100% of criteria must PASS for automatic release. Any failure ($< 100\%$) routes to `audited` (`audit_status = deficient`), activating the creator's sovereign override.
- **Stage 2 (Adversarial Dispute Court):** Document the builder's counter-defense window and the continuous Basis Points ($0\text{--}10{,}000\text{ BPS}$) mathematical derivation with zero dust loss:
  $$\text{worker\_payout} = \lfloor (\text{reward} \times \text{worker\_basis\_points}) / 10,000 \rfloor$$
  $$\text{client\_refund} = \text{reward} - \text{worker\_payout}$$
  $$\text{Invariant: } \text{worker\_payout} + \text{client\_refund} \equiv \text{reward}$$

---

## 2. Resilient On-Chain Reads & Partial Data Warnings

### The Invariant
**Never silently discard failed RPC reads. A dApp must NEVER present an incomplete record set as complete.**

### Failure Mode Prevented
- An intermittent RPC timeout causes Case #3 to be dropped. The user sees a list with Case #3 missing, assuming it was deleted or never existed on-chain.

### The Standard Pattern (`lib/genlayer.ts`)
```ts
export interface DiscoveryResult {
  agreements: AgreementData[];
  failedIds: number[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// In loop:
for (const id of ids) {
  try {
    const item = await readFinalContract("get_agreement", [id]);
    if (item) agreements.push(item);
    else failedIds.push(id);
  } catch {
    failedIds.push(id); // Record dropped ID!
  }
}
```

### UI Implementation
When `failedIds.length > 0`, immediately render a prominent **Partial Data Warning Banner**:
```tsx
{failedIds.length > 0 && (
  <div className="p-4 rounded-[8px] border border-[#eb5757]/40 bg-[#161718] flex items-center justify-between">
    <div>
      <p className="font-medium text-[#ffffff]">Partial On-Chain Data Loaded</p>
      <p className="text-xs text-[#8a8f98]">
        Case #{failedIds.join(", #")} could not be fetched due to transient RPC latency.
      </p>
    </div>
    <button onClick={handleRetryFailed} className="btn-ghost text-xs">
      Retry Failed Records
    </button>
  </div>
)}
```

---

## 3. Newest-First Pagination & Discovery Beyond 100 Records

### The Invariant
**Contract discovery must load descending from `total_count` and support full pagination.**

### Failure Mode Prevented
- Starting from ID 1 up to 100 causes new bounties to never appear once more than 100 exist on-chain.

### Mathematical Slicing Formula
```ts
const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
const safePage = Math.min(Math.max(1, page), totalPages);

const startId = totalCount - (safePage - 1) * pageSize;
const endId = Math.max(1, startId - pageSize + 1);

const ids: number[] = [];
for (let i = startId; i >= endId; i--) {
  ids.push(i);
}
```

### UI Standards
- Always display: `Showing X of Y total on-chain records (Page P of N) · Newest first`.
- Provide clean `Previous` and `Next` buttons with boundary disabling (`page <= 1`, `page >= totalPages`).

---

## 4. Timezone Precision & Dual-Timezone Confirmation

### The Invariant
**Never label a date input as "UTC" when the browser input represents local time. Always provide a live dual-timezone preview.**

### Failure Mode Prevented
- User in GMT+3 inputs `6:00 PM` believing it is UTC, causing the on-chain deadline to expire 3 hours earlier than intended.

### The Standard Pattern
1. Label the field: `Delivery Deadline (Your Local Time: UTC±X)`.
2. Compute dynamic timezone information via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
3. Render a live preview box showing:
   - **Local Date & Time:** `Thursday, Oct 15, 2026, 6:00 PM (GMT+1)`
   - **Final On-Chain UTC Deadline:** `2026-10-15 17:00:00 UTC`
   - **Unix Epoch (Seconds):** `1792083600`
   - **Allocated Work Duration:** `14 days (336 hours) from finality`
4. Show the exact final UTC deadline in the pre-flight summary before triggering the wallet transaction.

---

## 5. Terminal Polling Discipline & Leak Prevention

### The Invariant
**When a transaction reaches a terminal state (`FINALIZED`, `FAILED`, `REVERTED`, `CANCELED`), STOP all polling intervals immediately.**

### Failure Mode Prevented
- Endless 2s/5s polling loops running in the background, consuming browser memory, causing state thrashing, and hammering public RPC nodes.
- Mistaking intermediate consensus states (`ACCEPTED`) for permanent irreversible finality (`FINALIZED`).

### The Standard Pattern
```ts
let terminalFailure = false;
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  try {
    const tx = await client.getTransaction({ hash: hashStr });
    const st = String(tx?.statusName ?? tx?.status ?? "");
    if (st === "FINALIZED") {
      break; // Halt polling immediately!
    }
    if (st === "FAILED" || st === "REVERTED" || st === "CANCELED") {
      terminalFailure = true;
      break; // Halt polling immediately!
    }
  } catch {}
}

if (terminalFailure) {
  setTxStatus({ state: "failed", message: "Transaction failed on GenLayer." });
  return;
}
setTxStatus({ state: "finalized", message: "Transaction finalized on GenLayer!" });
```

---

## 6. Dependency Hardening & Lockfile Synchronization

### The Invariant
**Every repository must have a synchronized, committed `package-lock.json` with zero critical security advisories.**

### Failure Mode Prevented
- CI failing on `npm ci` due to missing packages or desynchronized lockfiles.
- Known prototype pollution or path traversal vulnerabilities in test utilities (e.g., `tinypool <= 2.1.1` in old Vitest releases).

### The Standard Pattern
1. In `web/package.json`, use npm `overrides` to pin secure sub-dependencies:
   ```json
   "overrides": {
     "tinypool": "^2.2.0",
     "braces": "^3.0.3"
   }
   ```
2. Generate lockfile:
   ```bash
   npm install --package-lock-only
   ```
3. Verify clean security audit:
   ```bash
   npm audit
   ```

---

## 7. Offline-Independent Builds (Zero Google Font Reliance)

### The Invariant
**Production builds must NEVER depend on network calls to Google Fonts or third-party style CDNs.**

### Failure Mode Prevented
- Next.js Turbopack build failure when Google Fonts endpoint is throttled or offline.
- Privacy compliance violations (GDPR font transfer issues).

### The Standard Pattern
In `src/app/globals.css`:
```css
@theme {
  --font-inter-variable: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-berkeley-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace;
}
```
In `src/app/layout.tsx`:
- Do NOT import `next/font/google`.
- Rely exclusively on local system font stacks or self-hosted `next/font/local`.

---

## 8. Comprehensive Critical-Flows Test Matrix

### The Invariant
**Unit tests must cover not only pure functions, but real mathematical settlement invariants, pagination limits, and state machines.**

### Required Test Suites (`lib/critical-flows.test.ts`)
1. **Basis Points Mathematical Invariant:**
   - Worker share + Client refund ≡ Total reward (tested across odd prime wei and 1 wei boundaries).
   - Numerical derivation tests for 0%, 23.6%, 50%, 86%, and 100%.
2. **Descending Pagination Math:**
   - Page 1 newest slice (`ids = [100..91]`).
   - Middle page slice (`ids = [90..81]`).
   - Final page remainder slice (`ids = [5..1]`).
   - Out-of-bounds page clamping.
3. **RPC Failure Isolation & Recovery:**
   - Simulated RPC drop isolation into `failedIds`.
   - Merging recovered records in descending ID order.
4. **Timezone & Duration Conversion:**
   - Valid integer epoch generation from local strings.
   - 14-day duration validation (`1,209,600` seconds).
5. **Address Formatting & Balance Precision:**
   - 42-char address short formatting (`0xABCD…1234`).
   - Fractional GEN balance rendering (`2.5 GEN`).
6. **Terminal State Machine:**
   - Exact classification of `FINALIZED`, `FAILED`, `REVERTED` vs non-terminal `PENDING`, `ACCEPTED`.

---

## 9. Smart Contract Invariants & Direct Mode Testing

### The Invariant
**The intelligent contract must be audited against the complete state-transition matrix using local Direct Mode simulation.**

### Verified State Matrix (`tests/direct/test_chainsettle.py`)
- **Creation:** msg.value > 0 enforced; client cannot be worker; future deadline required.
- **Hybrid Claiming:** Open marketplace bounty (`worker = 0x0`) claimable by any non-client.
- **Cancellation:** Client can cancel only before claim/submission with 100% refund. Client blocked from arbitrary cancellation once assigned.
- **Ghosting Safeguard:** Client reclaims 100% escrow if builder ghosts past deadline. Client can reopen bounty to marketplace with new deadline.
- **Submission:** Valid 40-hex commit SHA, HTTPS URL, and 1-6 evidence files required. Only assigned worker can submit. Post-deadline submission rejected.
- **Autonomous AI Verification:** 100% criteria PASS $\rightarrow$ immediate autonomous 100% payout to builder. Deficiencies ($< 100\%$) pause auto-payout and flag case as `audited / deficient`.
- **Creator Sovereign Override:** Creator can override deficient audit and disburse 100% escrow directly.
- **Adversarial Dispute Court:** Builder can submit counter-defense. GenLayer validators adjudicate complaint + defense + code + live deployment, computing continuous Basis Points ($0\text{--}10{,}000\text{ BPS}$).
- **Mutual Exclusivity:** A settled, cancelled, or refunded case cannot be paid out again. Zero double-spend risk.

---

## 10. Pre-Submission Release Checklist

Before submitting any build, execute and verify this exact command sequence:

```powershell
# 1. Contract Linter Check
$env:PYTHONIOENCODING="utf-8"
genvm-lint contracts/chainsettle.py
genvm-lint validate contracts/chainsettle.py

# 2. Pytest Direct Mode Test Suite
python -m pytest tests/direct/test_chainsettle.py -v
# REQUIREMENT: 100% passing

# 3. Frontend Comprehensive Unit Tests
cd web
npm run test
# REQUIREMENT: All test files passing (21+ tests)

# 4. Zero-Warning ESLint
npm run lint
# REQUIREMENT: 0 errors, 0 warnings

# 5. Production Next.js Build
npm run build
# REQUIREMENT: Exit code 0, all static/dynamic routes compiled
```

---

*Authored by 9ytshade for ChainSettle, ProofPay, and all future GenLayer Intelligent Contract projects.*
