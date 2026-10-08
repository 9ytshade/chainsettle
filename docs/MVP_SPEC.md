# ChainSettle MVP Specification (v1.2.0)

## 1. Product Promise

ChainSettle settles freelance agreements, bounties, and micro-arbitration milestones without requiring either party to trust the other.

A creator locks an escrow reward in native GEN with plain-English acceptance criteria, either as an **Open Marketplace Bounty** or a **Direct Assignment**. An assigned builder submits verifiable public evidence (GitHub commit SHA + source manifest + live HTTPS deployment). 

GenLayer validators perform an **autonomous initial AI audit**: if 100% of criteria are satisfied, escrow is released automatically without client intervention. If deficiencies are flagged, the creator can exercise a sovereign override or escalate to the **Adversarial Dispute Court** - where validators evaluate both plaintiff grievances and builder counter-defenses to disburse continuous Basis Points ($0\text{--}10{,}000\text{ BPS}$) settlements.

---

## 2. Core Personas & Roles

### The Creator (Client)
* Publishes milestone escrows in GEN: either open to the public marketplace (`worker = 0x0`) or directly assigned.
* Defines 1 to 5 explicit acceptance criteria, delivery deadline, and review window.
* Reclaims 100% of escrow or reopens the bounty if an assigned builder ghosts past the deadline.
* Holds **Sovereign Override Authority**: can disburse 100% full payment even if the initial audit flags minor defects.
* Files formal dispute complaints if delivered work has unacceptable deficiencies.

### The Builder (Contractor / Autonomous Agent)
* Discovers and claims open bounties from the public board (`claim_agreement`).
* Submits commit-pinned deliverables (immutable 40-character lowercase hex SHA + up to 6 source files + live HTTPS permalink).
* Claims 100% uncontested payment if the creator remains silent beyond the review window.
* Files counter-defense statements and rebuttal notes if a dispute is registered.

### The Decentralized Validator Jury
* Executes `verify_delivery()` to independently audit code evidence against criteria.
* Executes `adjudicate_dispute()` under the Equivalence Principle, deriving continuous Basis Points settlements based on criteria weighting.

---

## 3. Two-Stage State Lifecycle

```text
[Open] ────────────────────────► [Cancelled] (creator cancelled before claim)
  │
  ▼ (builder claims agreement)
[Assigned] ────────────────────► [Cancelled / Open] (ghosting deadline elapsed: reclaim or reopen)
  │
  ▼ (builder submits delivery)
[Delivered]
  │
  ▼ (verify_delivery: initial AI audit)
  ├───► 100% Criteria Passed ──► [Settled: 100% Worker Payout]
  └───► Deficiencies Flagged ──► [Audited]
                                    ├───► Creator Override ──► [Settled: 100% Worker Payout]
                                    └───► Formal Dispute ────► [Disputed]
                                                                  │
                                                                  ▼ (builder defense + adjudicate_dispute)
                                                              [Settled: Proportional BPS Payout]
```

---

## 4. Basis Points Mathematical Settlement Engine

Continuous payout derivation across $0\text{--}10{,}000\text{ BPS}$:
* $\text{worker\_payout} = \lfloor (\text{reward} \times \text{worker\_basis\_points}) / 10,000 \rfloor$
* $\text{client\_refund} = \text{reward} - \text{worker\_payout}$
* Exact conservation invariant: $\text{worker\_payout} + \text{client\_refund} \equiv \text{reward}$

---

## 5. Future Protocol Roadmap

1. **Creator & Builder Profiles & Dashboards:**
   - Historical records of past and active bounties, cumulative GEN earnings, on-chain reliability ratings, and dispute records.
2. **Multi-Channel Push Notifications:**
   - Real-time notification dispatchers for bounty claims, delivery submissions, dispute filings, and 48-hour defense timers.
3. **Builder Staking & Ghosting Penalty:**
   - Collateral staking required for high-value bounties, with slashed deposits and temporary blacklisting if a builder ghosts.
4. **Multi-Milestone Contracts & Multi-Token Collateral:**
   - Staged milestone trees and deposits in stablecoins (USDC / USDT) on GenLayer.

---

**ChainSettle Protocol Specification**  
© 2026 ChainSettle · Architected & Built by **9ytshade**  
GenLayer Studionet Contract: `0xD94f893C237551ca887991f0725aa96fc746B86F`
