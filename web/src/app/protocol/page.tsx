import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import {
  chainSettleContractAddress,
  chainSettleChainId,
  genLayerExplorerUrl,
} from "@/lib/genlayer";

const protocolSections = [
  { id: "model", label: "01. Two-Stage Escrow & Court Model" },
  { id: "lifecycle", label: "02. Agreement Lifecycle State Machine" },
  { id: "bps-engine", label: "03. Dynamic Basis Points Math" },
  { id: "validators", label: "04. Validator Consensus & Equivalence" },
  { id: "ghosting-errors", label: "05. Ghosting Safeguards & Evidence Errors" },
  { id: "invariants", label: "06. Security Invariants & Guarantees" },
  { id: "deployment", label: "07. Live Deployment & Specifications" },
  { id: "roadmap", label: "08. Future Protocol Roadmap" },
];

export default function ProtocolPage() {
  return (
    <div className="max-w-[1300px] mx-auto space-y-12 pb-16">
      {/* Protocol Header */}
      <header className="border-b border-[var(--color-graphite)] pb-12 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-carbon)] border border-[var(--color-graphite)] text-[11px] font-mono text-[var(--color-fog)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e4f222]" />
              <span>CHAINSETTLE / TWO-STAGE HYBRID ESCROW & DISPUTE COURT ARCHITECTURE</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-medium text-[var(--color-paper)] tracking-[-0.022em] leading-tight">
              From open marketplace bounties to autonomous AI verification and sovereign dispute settlement.
            </h1>
            <p className="text-[16px] text-[var(--color-fog)] leading-relaxed max-w-3xl">
              The complete on-chain specification, mathematical formulation, and validator consensus mechanisms governing ChainSettle v1.2.0: how hybrid bounties are created and claimed, how deliverables are verified autonomously by GenLayer AI, how client sovereign overrides operate, and how the adversarial dispute court adjudicates proportional Basis Points (BPS) payouts.
            </p>
          </div>

          <aside className="lg:col-span-4 p-5 rounded-[12px] bg-[var(--color-carbon)] border border-[var(--color-graphite)] space-y-3.5 shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
              Protocol In One Sentence
            </span>
            <p className="text-[15px] text-[var(--color-paper)] font-medium leading-snug">
              Autonomous AI verification first with sovereign creator override, backed by adversarial dispute court and continuous Basis Points settlement.
            </p>
            <div className="pt-2 border-t border-[var(--color-graphite)] font-mono text-[11px] text-[var(--color-fog)] space-y-1.5">
              <div className="flex justify-between">
                <span>Contract Version:</span>
                <span className="text-[#e4f222] font-semibold">1.2.0 (Hybrid & Two-Stage)</span>
              </div>
              <div className="flex justify-between">
                <span>Consensus Engine:</span>
                <span className="text-[var(--color-paper)] font-semibold">Equivalence Principle</span>
              </div>
              <div className="flex justify-between">
                <span>Architect & Creator:</span>
                <span className="text-[#e4f222] font-semibold">9ytshade</span>
              </div>
            </div>
          </aside>
        </div>
      </header>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Navigation Table of Contents (3 cols) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
            Table of Contents
          </span>
          <nav className="flex flex-col space-y-1 text-[13px] border-l border-[var(--color-graphite)] pl-3.5">
            {protocolSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-[var(--color-fog)] hover:text-[#e4f222] transition-colors py-1 leading-snug"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Deep Dive Content Sections (9 cols) */}
        <div className="lg:col-span-9 space-y-16">
          {/* Section 01: The Model */}
          <section id="model" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-graphite)] pb-3">
              <span className="text-[11px] font-mono text-[#e4f222] block mb-1">01 / ARCHITECTURE</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                The Two-Stage Escrow & Dispute Court Model
              </h2>
            </div>
            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              ChainSettle eliminates the structural failure modes of legacy freelance escrow systems: client delay, subjective hostage funds, rigid binary settlements, and builder ghosting. It synthesizes non-deterministic LLM reasoning with deterministic crypto-economic finality across a Two-Stage lifecycle:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="card-box bg-[var(--color-carbon)] p-5 space-y-3 border-l-2 border-l-[#02b8cc]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#02b8cc]">STAGE 1</span>
                  <h3 className="text-[16px] font-medium text-[var(--color-paper)]">Autonomous AI Verification</h3>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Upon deliverable submission, the GenLayer validator jury audits the pinned GitHub commit and live URL against the agreement&apos;s criteria. If 100% of criteria PASS, 100% of the locked escrow is released autonomously to the builder immediately - no client delay or approval games. If deficiencies are flagged, the creator can exercise a sovereign override or escalate to court.
                </p>
              </div>

              <div className="card-box bg-[var(--color-carbon)] p-5 space-y-3 border-l-2 border-l-[#eb5757]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#eb5757]">STAGE 2</span>
                  <h3 className="text-[16px] font-medium text-[var(--color-paper)]">Adversarial Dispute Court</h3>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  When a dispute is triggered, the builder receives an on-chain defense window to submit counter-evidence and rebuttal notes. GenLayer magistrates independently evaluate the client complaint, builder defense, commit-pinned source files, and live deployment, determining a mathematically fair Basis Points payout (0 to 10,000 BPS).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="card-box bg-[var(--color-carbon)] p-5 space-y-2">
                <span className="text-[11px] font-mono text-[#e4f222]">PARTY A</span>
                <h3 className="text-[15px] font-medium text-[var(--color-paper)]">The Creator</h3>
                <p className="text-[12px] text-[var(--color-fog)] leading-relaxed">
                  Posts an Open Marketplace Bounty or Direct Escrow with criteria and deposits native GEN reward. Retains sovereign full-release override if initial audit flags minor defects.
                </p>
              </div>

              <div className="card-box bg-[var(--color-carbon)] p-5 space-y-2">
                <span className="text-[11px] font-mono text-[#27a644]">PARTY B</span>
                <h3 className="text-[15px] font-medium text-[var(--color-paper)]">The Builder</h3>
                <p className="text-[12px] text-[var(--color-fog)] leading-relaxed">
                  Claims open bounties from the marketplace or accepts direct assignment. Submits commit-pinned source code, live deployment permalink, and counter-defense statement if challenged.
                </p>
              </div>

              <div className="card-box bg-[var(--color-carbon)] p-5 space-y-2">
                <span className="text-[11px] font-mono text-[#6366f1]">PARTY C</span>
                <h3 className="text-[15px] font-medium text-[var(--color-paper)]">Validator Jury</h3>
                <p className="text-[12px] text-[var(--color-fog)] leading-relaxed">
                  Independent GenLayer nodes execute non-deterministic web fetches, audit code evidence against criteria, and disburse cryptographic settlement under the Equivalence Principle.
                </p>
              </div>
            </div>
          </section>

          {/* Section 02: Agreement Lifecycle */}
          <section id="lifecycle" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-graphite)] pb-3">
              <span className="text-[11px] font-mono text-[#e4f222] block mb-1">02 / PROTOCOL FLOW</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Agreement Lifecycle State Machine
              </h2>
            </div>

            <div className="space-y-4">
              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-obsidian)] border border-[var(--color-graphite)] font-mono text-[11px] text-[#e4f222]">
                    STEP 1
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Create & Fund Escrow (`create_agreement`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Creator specifies the technical brief, 1 to 5 criteria, deadline, and locks native GEN. If created as an <strong>Open Marketplace Bounty</strong>, <code className="font-mono">worker = 0x0</code> and initial status is <code className="font-mono text-[#6366f1]">open</code>. If created as a <strong>Direct Escrow</strong> with an assigned address, initial status is <code className="font-mono text-[#02b8cc]">assigned</code>.
                </p>
              </div>

              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-obsidian)] border border-[var(--color-graphite)] font-mono text-[11px] text-[#27a644]">
                    STEP 2
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Marketplace Acceptance (`claim_agreement`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Any builder browsing the public marketplace can claim an open bounty before the deadline. Claiming assigns the bounty exclusively to their address, locking the submission window and transitioning status to <code className="font-mono text-[#02b8cc]">assigned</code>.
                </p>
              </div>

              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-obsidian)] border border-[var(--color-graphite)] font-mono text-[11px] text-[#02b8cc]">
                    STEP 3
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Commit-Pinned Delivery Submission (`submit_delivery`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  The designated builder submits evidence: an immutable 40-hex lowercase GitHub commit SHA, public repository permalink, live HTTPS URL, delivery summary, and up to 6 source files in an evidence manifest. Status transitions to <code className="font-mono text-[#02b8cc]">delivered</code>.
                </p>
              </div>

              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-obsidian)] border border-[var(--color-graphite)] font-mono text-[11px] text-[#e4f222]">
                    STEP 4
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Autonomous Initial AI Verification (`verify_delivery`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Validators independently audit the commit code and live deployment against the criteria:
                  <br />
                  • <strong>100% Criteria Passed:</strong> Autonomous immediate settlement! 100% of escrow reward is disbursed directly to the builder on-chain, transitioning status to <code className="font-mono text-[#27a644]">settled</code>.
                  <br />
                  • <strong>Criteria Deficiencies Flagged (&lt; 100%):</strong> Status transitions to <code className="font-mono text-[#eb5757]">audited</code> (<code className="font-mono">audit_status = deficient</code>), activating Creator Sovereign Choice.
                </p>
              </div>

              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-obsidian)] border border-[var(--color-graphite)] font-mono text-[11px] text-[#8b5cf6]">
                    STEP 5
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Creator Sovereign Override vs. Formal Dispute
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  If the audit flags deficiencies, the creator chooses:
                  <br />
                  • <strong>Sovereign Override (`approve_delivery`):</strong> Creator accepts the deliverable anyway (e.g. happy with 85% completion), releasing 100% of escrow directly to the builder without going through dispute court.
                  <br />
                  • <strong>Trigger Dispute (`raise_dispute`):</strong> Creator files a formal complaint, referring the case to the Adversarial Dispute Court.
                </p>
              </div>

              <div className="card-box p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-obsidian)] border border-[var(--color-graphite)] font-mono text-[11px] text-[#eb5757]">
                    STEP 6
                  </span>
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Builder Defense & Magistrate Adjudication (`submit_dispute_defense` & `adjudicate_dispute`)
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  The builder submits their counter-defense statement into the docket. GenLayer validators convene as a magistrate jury, evaluating claimant complaint + builder rebuttal + pinned code + live deployment, deriving continuous Basis Points settlement and disbursing funds immediately.
                </p>
              </div>
            </div>
          </section>

          {/* Section 03: Mathematical Basis Points Engine */}
          <section id="bps-engine" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-graphite)] pb-3">
              <span className="text-[11px] font-mono text-[#e4f222] block mb-1">03 / MATHEMATICAL FORMULATION</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                The Dynamic Basis Points (BPS) Engine
              </h2>
            </div>

            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              Standard arbitration contracts force unfair binary all-or-nothing outcomes or fixed 50/50 splits. If a builder completes 64.2% of a complex technical scope, a 0% payout unfairly enriches the client, while a 100% payout cheats the client. ChainSettle scales payouts continuously across the integer spectrum from 0 to 10,000 Basis Points (0.00% to 100.00%):
            </p>

            {/* Formula Block 1 */}
            <div className="card-box bg-[var(--color-obsidian)] p-6 space-y-3 border border-[var(--color-graphite)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
                Formula 1: Proportional Escrow Disbursement
              </span>
              <div className="p-4 rounded-[6px] bg-[var(--color-carbon)] border border-[var(--color-graphite)] font-mono text-[13px] text-[var(--color-paper)] space-y-2">
                <div>worker_payout = ⌊ (reward × worker_basis_points) / 10,000 ⌋</div>
                <div>client_refund = reward - worker_payout</div>
                <div className="text-[11px] text-[var(--color-fog)] pt-1">
                  Invariant: worker_payout + client_refund ≡ reward (Zero dust loss, 100% value conservation)
                </div>
              </div>
            </div>

            {/* Formula Block 2 */}
            <div className="card-box bg-[var(--color-obsidian)] p-6 space-y-3 border border-[var(--color-graphite)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
                Formula 2: Weighted Criteria Completion Derivation
              </span>
              <div className="p-4 rounded-[6px] bg-[var(--color-carbon)] border border-[var(--color-graphite)] font-mono text-[13px] text-[var(--color-paper)] space-y-2">
                <div>worker_basis_points = ∑ [ Weight(i) × Score(i) ]  for i = 1 to N</div>
                <div className="text-[11px] text-[var(--color-fog)] space-y-1 pt-1">
                  <div>where ∑ Weight(i) = 10,000 BPS (100.00%)</div>
                  <div>and Score(i) ∈ {'{'} FAIL: 0.0,  PARTIAL: 0.5 (or fractional progress),  PASS: 1.0 {'}'}</div>
                </div>
              </div>
            </div>

            {/* Formula Block 3 */}
            <div className="card-box bg-[var(--color-obsidian)] p-6 space-y-3 border border-[var(--color-graphite)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
                Formula 3: Equivalence Principle Consensus Thresholds
              </span>
              <div className="p-4 rounded-[6px] bg-[var(--color-carbon)] border border-[var(--color-graphite)] font-mono text-[13px] text-[var(--color-paper)] space-y-2">
                <div>leader_verdict ≡ validator_verdict (Categorical agreement required)</div>
                <div>| leader_basis_points - validator_basis_points | ≤ 500 BPS (± 5.0% consensus tolerance)</div>
              </div>
            </div>

            {/* Practical Numerical Examples */}
            <div className="card-box space-y-4">
              <h3 className="font-medium text-[15px] text-[var(--color-paper)]">
                Concrete Settlement Examples in Production
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-4 rounded-[8px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] space-y-2">
                  <span className="text-[#eb5757] font-semibold block text-[11px]">CASE A: 23.6% COMPLETION</span>
                  <p className="text-[var(--color-fog)] font-sans">
                    Builder implemented UI scaffolding (23.6%), but failed smart contract integration, test suite, and live deployment.
                  </p>
                  <div className="pt-2 border-t border-[var(--color-graphite)] space-y-1">
                    <div>Basis Points: <span className="text-[var(--color-paper)]">2,360 BPS</span></div>
                    <div>Worker Payout: <span className="text-[#27a644]">23.60 GEN</span></div>
                    <div>Client Refund: <span className="text-[#eb5757]">76.40 GEN</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-[8px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] space-y-2">
                  <span className="text-[#e4f222] font-semibold block text-[11px]">CASE B: 50.0% HALF DONE</span>
                  <p className="text-[var(--color-fog)] font-sans">
                    Core API endpoints delivered and working; remaining frontend dashboards abandoned.
                  </p>
                  <div className="pt-2 border-t border-[var(--color-graphite)] space-y-1">
                    <div>Basis Points: <span className="text-[var(--color-paper)]">5,000 BPS</span></div>
                    <div>Worker Payout: <span className="text-[#27a644]">50.00 GEN</span></div>
                    <div>Client Refund: <span className="text-[#eb5757]">50.00 GEN</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-[8px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] space-y-2">
                  <span className="text-[#27a644] font-semibold block text-[11px]">CASE C: 86.0% HIGH COMPLETION</span>
                  <p className="text-[var(--color-fog)] font-sans">
                    Full functional milestone passed with high quality; minor non-critical responsive mobile styling defect.
                  </p>
                  <div className="pt-2 border-t border-[var(--color-graphite)] space-y-1">
                    <div>Basis Points: <span className="text-[var(--color-paper)]">8,600 BPS</span></div>
                    <div>Worker Payout: <span className="text-[#27a644]">86.00 GEN</span></div>
                    <div>Client Refund: <span className="text-[#eb5757]">14.00 GEN</span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 04: Validators & Equivalence Principle */}
          <section id="validators" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-graphite)] pb-3">
              <span className="text-[11px] font-mono text-[#e4f222] block mb-1">04 / CONSENSUS ENGINE</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                How Validators Work Under the Hood
              </h2>
            </div>

            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              GenLayer does not rely on centralized webhooks or trusted oracle intermediaries. Intelligent Contracts execute under the <strong>Equivalence Principle</strong> across independent validator nodes in the decentralized network:
            </p>

            <div className="space-y-4">
              <div className="card-box space-y-2">
                <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                  1. Non-Deterministic Data Ingestion (`gl.nondet.web.get`)
                </h4>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  During transaction execution, the validator leader executes <code className="font-mono">evaluate()</code>. The leader issues HTTP GET requests to GitHub&apos;s raw CDN for each pinned evidence path in the manifest:
                  <code className="block my-2 p-2 rounded bg-[var(--color-obsidian)] font-mono text-[11px] text-[var(--color-paper)] overflow-x-auto">
                    https://raw.githubusercontent.com/{'{owner}'}/{'{repo}'}/{'{commit_sha}'}/{'{path}'}
                  </code>
                  And queries the live HTTPS deployment URL. Both text responses are bounded safely (up to 40,000 characters total) to prevent memory overflows.
                </p>
              </div>

              <div className="card-box space-y-2">
                <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                  2. Prompt Injection Hardening & Data Fencing
                </h4>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Evidence is treated strictly as unexecutable quoted data. External files are wrapped inside XML quotation fences (<code className="font-mono">&lt;source_bundle&gt;</code> and <code className="font-mono">&lt;deployment_evidence&gt;</code>). The magistrate prompt explicitly commands validators to ignore any system instructions, role shifts, or approval directives contained within submitted source code.
                </p>
              </div>

              <div className="card-box space-y-2">
                <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                  3. Equivalence Principle Validation (`validate(leader_result)`)
                </h4>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Validators independently rerun the evaluation and verify the leader&apos;s output. If the majority of validators agree on the verdict classification and the basis points calculation falls within tolerance (≤ 500 BPS), consensus is finalized and state mutation occurs.
                </p>
              </div>
            </div>
          </section>

          {/* Section 05: Ghosting Safeguards & Evidence Errors */}
          <section id="ghosting-errors" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-graphite)] pb-3">
              <span className="text-[11px] font-mono text-[#e4f222] block mb-1">05 / SAFEGUARDS & ERROR HANDLING</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Ghosting Protections & Network Error Handling
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="card-box space-y-3 border border-[#e4f222]/30">
                <span className="text-[10px] font-mono uppercase text-[#e4f222] font-semibold">
                  Ghosting Protection (`reclaim_expired_escrow` / `reopen`)
                </span>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  If a builder claims or is assigned a bounty but ghosts past the deadline without submitting evidence, the creator can reclaim 100% of the locked escrow (<code className="font-mono text-[#eb5757]">reclaim_expired_escrow</code>) or reopen the bounty to the marketplace with a new deadline (<code className="font-mono text-[#02b8cc]">reopen_expired_agreement</code>).
                </p>
              </div>

              <div className="card-box space-y-3 border border-[#eb5757]/30">
                <span className="text-[10px] font-mono uppercase text-[#eb5757] font-semibold">
                  Deterministic Evidence Failure (HTTP 404 / 410)
                </span>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  If an evidence file or repository returns HTTP 404 (Not Found), 410 (Gone), or is empty, the deliverable is verified defective. The magistrate issues <strong className="text-[var(--color-paper)]">FULL_REFUND_CLIENT</strong> (0 BPS), immediately returning funds to the creator.
                </p>
              </div>

              <div className="card-box space-y-3 border border-[var(--color-graphite)] sm:col-span-2">
                <span className="text-[10px] font-mono uppercase text-[var(--color-fog)] font-semibold">
                  Transient Network Outages (HTTP 429 / 5xx)
                </span>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  If GitHub or deployment hosts experience rate limits (HTTP 429) or server errors (HTTP 500/502/503), the verdict records <strong className="text-[var(--color-paper)]">UNDETERMINED</strong> (0 BPS). Zero funds are disbursed, and the case remains in <code className="font-mono text-[#eb5757]">disputed</code> status for safe re-triggering.
                </p>
              </div>
            </div>
          </section>

          {/* Section 06: Security Invariants */}
          <section id="invariants" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-graphite)] pb-3">
              <span className="text-[11px] font-mono text-[#e4f222] block mb-1">06 / FORMAL INVARIANTS</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Smart Contract Security Protections
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              {[
                "Escrow funds locked at creation: msg.value > 0 enforced deterministically.",
                "Zero self-dealing: creator cannot claim or assign themselves as worker.",
                "Immutable deliverable pinning: evidence bound permanently to 40-hex SHA.",
                "Sovereign override integrity: creator can only override with 100% full release.",
                "Exact fund conservation: worker_payout + client_refund ≡ total reward.",
                "Single disbursement guarantee: settled status prevents double payouts.",
                "Append-only audit trail: every dispute and ruling remains public on-chain.",
                "Native transfer safety: external value moves via _Recipient.emit_transfer.",
              ].map((text, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-[8px] bg-[var(--color-carbon)] border border-[var(--color-graphite)] flex items-start gap-2.5"
                >
                  <CheckIcon className="w-4 h-4 text-[#27a644] shrink-0 mt-0.5" />
                  <span className="text-[var(--color-fog)]">{text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 07: Deployment & Toolchain */}
          <section id="deployment" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-graphite)] pb-3">
              <span className="text-[11px] font-mono text-[#e4f222] block mb-1">07 / LIVE DEPLOYMENT</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Live Deployment & Network Specifications
              </h2>
            </div>

            <div className="card-box bg-[var(--color-carbon)] p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[12px]">
                <div>
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">Network</span>
                  <span className="text-[var(--color-paper)] font-medium">GenLayer Studionet</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">Chain ID</span>
                  <span className="text-[var(--color-paper)] font-medium">{chainSettleChainId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">Contract Version</span>
                  <span className="text-[#e4f222] font-medium">1.2.0 (Two-Stage Hybrid Escrow)</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-ash)] uppercase block mb-0.5">Deployed Address</span>
                  <a
                    href={`${genLayerExplorerUrl}/address/${chainSettleContractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#e4f222] underline break-all"
                  >
                    {chainSettleContractAddress} ↗
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--color-graphite)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[12px] text-[var(--color-fog)]">
                  Ready to post a marketplace bounty or test autonomous AI verification?
                </span>
                <div className="flex items-center gap-3">
                  <Link href="/agreements/create" className="btn-primary text-[13px]">
                    <span>+ New Escrow</span>
                  </Link>
                  <Link href="/court" className="btn-ghost text-[13px]">
                    <span>Court Docket</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Section 08: Future Protocol Roadmap */}
          <section id="roadmap" className="space-y-6 scroll-mt-24">
            <div className="border-b border-[var(--color-graphite)] pb-3">
              <span className="text-[11px] font-mono text-[#e4f222] block mb-1">08 / EVOLUTION</span>
              <h2 className="text-2xl font-medium text-[var(--color-paper)] tracking-tight">
                Future Protocol Roadmap & Planned Upgrades
              </h2>
            </div>

            <p className="text-[14px] text-[var(--color-fog)] leading-relaxed">
              ChainSettle is architected for extensible decentralization. The following enhancements are slated for subsequent protocol upgrades:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card-box space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#e4f222]" />
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Creator & Builder Profiles & Dashboards
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Dedicated user dashboard pages indexing past and active bounties, cumulative GEN earnings, on-chain reliability ratings, dispute success ratios, and verified delivery track records.
                </p>
              </div>

              <div className="card-box space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#02b8cc]" />
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Multi-Channel Push Notifications
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Real-time notification pipeline dispatching alerts when a bounty is claimed, evidence is delivered, an audit completes, or a dispute triggers the 48-hour counter-defense countdown.
                </p>
              </div>

              <div className="card-box space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#eb5757]" />
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Builder Staking & Ghosting Blacklist
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Reputation-weighted builder staking required to claim high-value bounties. Staked collateral is slashed and deposited to the client if the builder ghosts past the delivery deadline.
                </p>
              </div>

              <div className="card-box space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                  <h4 className="font-medium text-[15px] text-[var(--color-paper)]">
                    Multi-Milestone & Multi-Token Collateral
                  </h4>
                </div>
                <p className="text-[13px] text-[var(--color-fog)] leading-relaxed">
                  Support for progressive milestone trees (releasing funds per phase) and multi-token collateral deposits (USDC, USDT, and custom ERC20 tokens alongside native GEN).
                </p>
              </div>
            </div>
          </section>

          {/* Footer Attribution Banner */}
          <div className="pt-8 border-t border-[var(--color-graphite)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[var(--color-fog)]">
            <span>CHAINSETTLE PROTOCOL SPECIFICATION GUIDE</span>
            <span className="text-[var(--color-paper)]">
              © 2026 CHAINSETTLE · ARCHITECTED & BUILT BY{" "}
              <strong className="text-[#e4f222]">9YTSHADE</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
