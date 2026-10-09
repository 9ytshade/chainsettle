# ChainSettle

**ChainSettle** is an autonomous freelance marketplace, milestone escrow, and AI dispute court built on GenLayer Intelligent Contracts.

Creators publish milestone escrows in native GEN either as **Open Marketplace Bounties** or **Direct Assignments** with plain-English acceptance criteria. Builders submit commit-pinned deliverables (immutable GitHub SHA + live HTTPS deployment). 

GenLayer validators perform an **autonomous initial AI audit**: if 100% of criteria pass, escrow is autonomously released to the builder without client delay. If deficiencies are flagged, the creator retains the sovereign right to override and release full payment or escalate to the **Adversarial Dispute Court** - where validators evaluate plaintiff grievances and builder counter-defenses, disbursing mathematically continuous Basis Points ($0\text{--}10{,}000\text{ BPS}$) settlements.

---

## Live Studionet Deployment & Toolchain
- **Author & Architect:** 9ytshade
- **Contract Version:** `1.2.0` (Two-Stage Hybrid Escrow & Adversarial Dispute Court)
- **Network:** GenLayer Studionet (Chain ID: `61999`)
- **Contract Address:** [`0x29a246a021F02D9A0b1f18a7DCc695d7Ee7643E5`](https://explorer-studio.genlayer.com/address/0x29a246a021F02D9A0b1f18a7DCc695d7Ee7643E5)
- **Deployment Transaction:** [`0x0a45950603bfc16f9e0692f319bc4ae87d036c01996db86eea5807517939220a`](https://explorer-studio.genlayer.com/tx/0x0a45950603bfc16f9e0692f319bc4ae87d036c01996db86eea5807517939220a)
- **Deployment Consensus Status:** `ACCEPTED` (Majority Agree on Studionet)
- **CLI Toolchain:** `genlayer` 0.39.1 · `genlayer-py` 0.16.3 · `gltest` 0.29.2 · `genvm-linter` 0.7.1
- **Documentation:** [MVP Specification](docs/MVP_SPEC.md) · [Contract Specification](docs/CONTRACT_SPEC.md) · [Studionet Live Run Report](docs/STUDIONET_LIVE_RUN_REPORT.md) · [In-App Protocol Guide](web/src/app/protocol/page.tsx)

---

## Two-Stage Core Architecture

```
[Open Bounty] ─────────► [Assigned] ─────────► [Delivered]
      │                       │                      │
(creator cancel)       (ghosting timeout:       (verify_delivery:
      │                 reclaim or reopen)     initial AI audit)
      ▼                       ▼                      │
 [Cancelled]             [Cancelled / Open]         ┌┴─────────────────────┐
                                                    ▼                      ▼
                                            [100% Passed]         [Deficiencies Flagged]
                                                    │                      │
                                                    ▼             (creator sovereign choice)
                                            [Settled: 100%]        ┌───────┴───────┐
                                                                   ▼               ▼
                                                           (override 100%)    (raise_dispute)
                                                                   │               │
                                                                   ▼               ▼
                                                           [Settled: 100%]    [Disputed]
                                                                                   │
                                                                       (builder counter-defense)
                                                                                   │
                                                                                   ▼
                                                                           (adjudicate_dispute)
                                                                                   │
                                                                                   ▼
                                                                           [Settled: BPS Math]
```

### 1. Hybrid Creation & Public Marketplace Claiming
- **Open Marketplace Bounties:** Created with `worker = 0x0`, status `open`. Any builder browsing the marketplace can call `claim_agreement` to lock the bounty exclusively to their address until the deadline.
- **Direct Escrow:** Created with a pre-designated contractor address, status `assigned`.

### 2. Builder Ghosting Safeguards
- If an assigned builder ghosts past the delivery deadline without submitting work, the creator can:
  - `reclaim_expired_escrow`: Reclaim a 100% refund of the locked escrow.
  - `reopen_expired_agreement`: Reopen the bounty to the marketplace with an extended deadline.

### 3. Stage 1: Autonomous AI Verification First
- When the builder submits work pinned to an immutable GitHub commit SHA and live HTTPS deployment, any party can call `verify_delivery`.
- GenLayer validators independently audit the deliverables against the plain-English acceptance criteria.
- **100% Criteria Passed:** Escrow is autonomously disbursed 100% to the builder immediately. No client delay or hostage funds.
- **Deficiencies Detected (< 100%):** Flagged as `audited` (`audit_status = deficient`), activating the Creator Sovereign Choice.

### 4. Creator Sovereign Override
- Even if validators flag minor defects, the creator retains the sovereign right to call `approve_delivery` to override and disburse 100% of funds. (No arbitrary partial client override to prevent client squeezing).
- Alternatively, the creator or builder can escalate to the Adversarial Dispute Court (`raise_dispute`).

### 5. Stage 2: Adversarial Dispute Court & Continuous Basis Points Math
- The builder can file a counter-defense statement into the docket (`submit_dispute_defense`).
- GenLayer validators convene as a magistrate jury (`adjudicate_dispute`), evaluating plaintiff complaint + builder rebuttal + commit-pinned code + live deployment.
- Payouts are computed continuously across the full integer spectrum from 0 to 10,000 Basis Points ($0\text{--}10{,}000\text{ BPS}$):
  $$\text{worker\_payout} = \lfloor (\text{reward} \times \text{worker\_basis\_points}) / 10,000 \rfloor$$
  $$\text{client\_refund} = \text{reward} - \text{worker\_payout}$$
  $$\text{Invariant: } \text{worker\_payout} + \text{client\_refund} \equiv \text{reward}$$

---

## Live Studionet On-Chain Verification Matrix

All core state transitions and mathematical invariants have been executed and finalized live on GenLayer Studionet (`0xD94f893C237551ca887991f0725aa96fc746B86F`):

| Case | Lifecycle Scenario | Agreement | Validator Consensus | Financial Settlement |
| :--- | :--- | :--- | :--- | :--- |
| **A** | **Pre-Claim Cancellation & Refund** | Agreement #2 | Client revoked before worker claim | **100% Escrow (0.01 GEN)** refunded to client |
| **B** | **Autonomous AI Audit & Auto-Payout** | Agreement #3 | Consensus: `PASS\|PASS` (100%) | **100% Escrow (0.01 GEN)** auto-released to builder |
| **C** | **Deficient Audit & Sovereign Override**| Agreement #4 | Flagged `deficient` (`PASS\|FAIL`) | **100% Escrow (0.01 GEN)** via creator sovereign choice |
| **D** | **Adversarial Dispute Court Arbitration** | Agreement #5 | Ruling #1: `PARTIAL_SETTLEMENT` | **7,500 BPS (75%) Builder / 2,500 BPS (25%) Client** |

*For complete transaction traces, validator reasoning, and balance deltas, consult the [Studionet Live Run Report](docs/STUDIONET_LIVE_RUN_REPORT.md).*

---

## Web Architecture & Institutional UI/UX

1. **Expanded Agreement Modal:** Clicking any agreement card on the home page opens a rich modal dialog displaying complete technical specifications, acceptance criteria, precision metadata, and role-aware action controls.
2. **Reactive Wallet State:** Global `useWallet` hook automatically synchronizes account changes, chain switching, and real-time role recognition (`Creator (You)` vs `Contractor (You)`).
3. **Copy Transaction Hash:** One-click clipboard copy button with visual confirmation integrated into the live transaction lifecycle tracker.
4. **Zero-Slop Standard:** Clean typography with zero em/en dashes, zero emojis, and a dedicated 17-icon SVG library in a Linear Midnight Dark aesthetic.

---

## Future Protocol Roadmap & Planned Upgrades

1. **Creator & Builder Profiles & Dashboards:**
   - Dedicated dashboard indexing on-chain reputation ratings, cumulative GEN earnings, completed bounties, and dispute victory ratios.
2. **Multi-Channel Push Notifications:**
   - Real-time email and Web Push notifications for job claims, delivery submissions, audit results, and 48-hour dispute defense timers.
3. **Builder Staking & Ghosting Penalty:**
   - Collateral staking required for high-value bounties, with slashed deposits and temporary blacklisting if a builder claims and ghosts.
4. **Multi-Milestone Contracts & Multi-Token Collateral:**
   - Structured milestone trees and escrow deposits in stablecoins (USDC / USDT) on GenLayer.

---

## Running Contract Verification & Tests

```powershell
# Set Windows UTF-8 encoding for checkmarks
$env:PYTHONIOENCODING="utf-8"

# Lint and validate intelligent contract
genvm-lint contracts/chainsettle.py
genvm-lint validate contracts/chainsettle.py

# Run Pytest Direct Mode Test Suite (16/16 passing)
python -m pytest tests/direct/test_chainsettle.py -v
```

## Running Web App

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view ChainSettle.

---

**ChainSettle Protocol** · © 2026 ChainSettle · Architected & Built by **9ytshade**
