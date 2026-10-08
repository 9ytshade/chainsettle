"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  chainSettleContractAddress,
  checkContractVersionCompatibility,
  createChainSettleClient,
} from "@/lib/genlayer";
import {
  isEthereumAddress,
  parseGenToWei,
  validateCriteria,
} from "@/lib/safety";
import { TransactionLifecycle, TxStatus } from "@/components/transaction-lifecycle";
import { GlobeIcon, TargetIcon, CalendarIcon, ZapIcon } from "@/components/icons";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function CreateAgreementPage() {
  const router = useRouter();
  const [agreementType, setAgreementType] = useState<"open" | "direct">("open");
  const [title, setTitle] = useState("");
  const [worker, setWorker] = useState("");
  const [reward, setReward] = useState("");
  const [brief, setBrief] = useState("");
  const [criteria, setCriteria] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("14");
  const [reviewWindowDays, setReviewWindowDays] = useState("7");

  const [txStatus, setTxStatus] = useState<TxStatus>({ state: "idle" });

  const criteriaValidation = useMemo(() => validateCriteria(criteria), [criteria]);

  // Dual timezone calculation
  const timezoneInfo = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
      const now = new Date();
      const targetDate = new Date(now.getTime() + Number(deadlineDays || 14) * 86400 * 1000);
      const unixSeconds = Math.floor(targetDate.getTime() / 1000);
      const localStr = targetDate.toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      });
      const utcStr = targetDate.toUTCString();
      return {
        timezone: tz,
        localString: localStr,
        utcString: utcStr,
        unixSeconds,
      };
    } catch {
      return {
        timezone: "Local",
        localString: "",
        utcString: "",
        unixSeconds: 0,
      };
    }
  }, [deadlineDays]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTxStatus({ state: "idle" });

    try {
      if (!window.ethereum) throw new Error("MetaMask is required to create an agreement.");
      if (title.trim().length < 3) throw new Error("Title must be at least 3 characters.");
      
      const targetWorker = agreementType === "open" ? ZERO_ADDRESS : worker.trim();
      if (agreementType === "direct" && !isEthereumAddress(targetWorker)) {
        throw new Error("Enter a valid 0x worker Ethereum address for direct escrow.");
      }
      
      if (brief.trim().length < 20) throw new Error("Brief must be at least 20 characters.");
      if (!criteriaValidation.valid) throw new Error(criteriaValidation.error ?? "Invalid criteria.");

      const rewardWei = parseGenToWei(reward);
      if (rewardWei <= BigInt(0)) throw new Error("Reward must be greater than zero.");

      const deadlineTimestamp = BigInt(
        Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400
      );
      const reviewWindowSeconds = BigInt(Number(reviewWindowDays) * 86400);

      // Check contract version compatibility
      const versionCheck = await checkContractVersionCompatibility();
      if (!versionCheck.compatible) {
        throw new Error(versionCheck.error ?? "Incompatible contract version.");
      }

      const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
      if (!accounts[0]) throw new Error("Connect your wallet first from the header.");

      setTxStatus({ state: "submitting", message: "Broadcasting escrow creation to Studionet…" });

      const client = createChainSettleClient(accounts[0] as `0x${string}`);
      const hash = await client.writeContract({
        address: chainSettleContractAddress as `0x${string}`,
        functionName: "create_agreement",
        args: [
          targetWorker,
          title.trim(),
          brief.trim(),
          criteriaValidation.items.join("\n"),
          deadlineTimestamp,
          reviewWindowSeconds,
        ],
        value: rewardWei,
      });

      const hashStr = String(hash);
      setTxStatus({
        state: "pending",
        hash: hashStr,
        message: "Waiting for validator consensus…",
      });

      // Poll until finalized, halting immediately on terminal states
      let terminalFailure = false;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const tx = (await client.getTransaction({
            hash: hashStr as unknown as Parameters<typeof client.getTransaction>[0]["hash"],
          })) as Record<string, unknown>;
          const st = String(tx?.statusName ?? tx?.status ?? "");
          if (st === "FINALIZED") {
            break;
          }
          if (st === "FAILED" || st === "REVERTED" || st === "CANCELED") {
            terminalFailure = true;
            break;
          }
        } catch {}
      }

      if (terminalFailure) {
        setTxStatus({
          state: "failed",
          hash: hashStr,
          message: "Transaction reached terminal failure on GenLayer.",
        });
        return;
      }

      setTxStatus({
        state: "finalized",
        hash: hashStr,
        message:
          agreementType === "open"
            ? "Open Bounty published to marketplace docket! Redirecting in a few seconds…"
            : "Direct Escrow created and assigned to contractor! Redirecting in a few seconds…",
      });
      setTimeout(() => router.push("/"), 6000);
    } catch (err) {
      setTxStatus({
        state: "failed",
        error: err instanceof Error ? err.message : "Failed to create agreement.",
      });
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-graphite)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e4f222]" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-fog)]">
              ChainSettle Escrow Engine v1.2.0
            </span>
          </div>
          <h1 className="text-3xl font-medium text-[var(--color-paper)] tracking-tight">
            Create Milestone Escrow
          </h1>
          <p className="text-[14px] text-[var(--color-fog)] mt-1">
            Publish an open marketplace bounty for any builder to claim, or lock direct escrow for a specific contractor.
          </p>
        </div>
        <Link
          href="/"
          className="btn-ghost self-start sm:self-auto text-[12px] font-mono shrink-0 cursor-pointer"
        >
          ← Agreements
        </Link>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Comprehensive Form (8 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 card-box space-y-6">
          {/* Agreement Type Toggle */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-paper)] mb-2.5">
              Escrow Distribution Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAgreementType("open")}
                className={`p-3.5 rounded-[8px] border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  agreementType === "open"
                    ? "bg-[var(--color-obsidian)] border-[#e4f222] shadow-sm"
                    : "bg-[var(--color-carbon)] border-[var(--color-graphite)] hover:border-[var(--color-smoke)] text-[var(--color-fog)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[13px] flex items-center gap-2">
                    <GlobeIcon className="w-4 h-4 text-[#e4f222]" />
                    Open Marketplace Bounty
                  </span>
                  {agreementType === "open" && (
                    <span className="text-[10px] font-mono bg-[#e4f222] text-[#08090a] px-1.5 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--color-ash)] leading-snug">
                  Unassigned. Anyone can browse the marketplace board and claim this bounty.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAgreementType("direct")}
                className={`p-3.5 rounded-[8px] border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  agreementType === "direct"
                    ? "bg-[var(--color-obsidian)] border-[#e4f222] shadow-sm"
                    : "bg-[var(--color-carbon)] border-[var(--color-graphite)] hover:border-[var(--color-smoke)] text-[var(--color-fog)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[13px] flex items-center gap-2">
                    <TargetIcon className="w-4 h-4 text-[#e4f222]" />
                    Direct Assignment
                  </span>
                  {agreementType === "direct" && (
                    <span className="text-[10px] font-mono bg-[#e4f222] text-[#08090a] px-1.5 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--color-ash)] leading-snug">
                  Assign directly to a specific contractor wallet address upfront.
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--color-paper)] mb-2">
              Agreement Title <span className="text-[var(--color-coral-red)]">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Next.js Landing Page & Stripe Checkout Integration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-box text-[14px]"
            />
            <p className="text-[11px] text-[var(--color-ash)] mt-1.5">
              Clear milestone headline identifying the deliverable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {agreementType === "direct" ? (
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-paper)] mb-2">
                  Contractor Wallet Address <span className="text-[var(--color-coral-red)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={worker}
                  onChange={(e) => setWorker(e.target.value)}
                  className="input-box font-mono text-[12px]"
                />
                <p className="text-[11px] text-[var(--color-ash)] mt-1.5">
                  Designated recipient permitted to submit deliverables.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-[8px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <GlobeIcon className="w-3.5 h-3.5 text-[#e4f222]" />
                  <span className="text-[11px] font-mono text-[#e4f222] font-semibold">
                    UNASSIGNED (OPEN BOUNTY)
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-fog)] leading-relaxed">
                  Anyone can review criteria and click &quot;Accept / Claim Job&quot; from the public docket.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[var(--color-paper)] mb-2">
                Escrow Reward (GEN) <span className="text-[var(--color-coral-red)]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 100"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="input-box text-[14px]"
              />
              <p className="text-[11px] text-[var(--color-ash)] mt-1.5">
                Native GEN deposited into the contract on creation.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--color-paper)] mb-2">
              Milestone Scope & Requirements <span className="text-[var(--color-coral-red)]">*</span>
            </label>
            <textarea
              required
              rows={5}
              maxLength={10000}
              placeholder="Detail the technical deliverable, repository expectations, framework versions, and features required…"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="input-box text-[13px] leading-relaxed"
            />
            <p className="text-[11px] text-[var(--color-ash)] mt-1.5">
              The primary brief used by validators to audit deliverables in case of dispute.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[13px] font-medium text-[var(--color-paper)]">
                Acceptance Criteria <span className="text-[var(--color-coral-red)]">*</span>
              </label>
              <span className="text-[11px] font-mono text-[var(--color-fog)]">
                {criteriaValidation.items.length}/5 criteria (one per line)
              </span>
            </div>
            <textarea
              required
              rows={4}
              maxLength={3000}
              placeholder="1. Mobile responsive layout across iOS and Android&#10;2. Stripe webhook handles checkout.session.completed&#10;3. Public deployment displays verified live product catalog"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              className="input-box font-mono text-[12px] leading-relaxed"
            />
            <p className="text-[11px] text-[var(--color-ash)] mt-1.5">
              Each criterion is evaluated independently (PASS, PARTIAL, FAIL). Put each item on a separate line.
            </p>
            {!criteriaValidation.valid && criteria.length > 0 && (
              <p className="text-xs text-[var(--color-coral-red)] font-mono mt-1">
                {criteriaValidation.error}
              </p>
            )}
          </div>

          {/* Timezone Precision & Delivery Timing */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-paper)] mb-2">
                  Delivery Window (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  className="input-box text-[14px]"
                />
                <p className="text-[11px] text-[var(--color-ash)] mt-1.5">
                  Allocated days from creation for contractor to deliver code.
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[var(--color-paper)] mb-2">
                  Review Window (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={reviewWindowDays}
                  onChange={(e) => setReviewWindowDays(e.target.value)}
                  className="input-box text-[14px]"
                />
                <p className="text-[11px] text-[var(--color-ash)] mt-1.5">
                  Client review period before uncontested worker claim activates.
                </p>
              </div>
            </div>

            {/* Live Dual-Timezone Preview Box */}
            <div className="p-4 rounded-[8px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] space-y-2 text-[12px] font-mono">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-[#e4f222]" />
                <span className="text-[10px] uppercase text-[#e4f222] font-semibold tracking-wider">
                  Deadline Timezone Conversion Preview
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-1">
                <div>
                  <span className="text-[#62666d] block mb-0.5">Your Local Time ({timezoneInfo.timezone}):</span>
                  <span className="text-[var(--color-paper)] font-medium">{timezoneInfo.localString}</span>
                </div>
                <div>
                  <span className="text-[#62666d] block mb-0.5">Final On-Chain UTC Deadline:</span>
                  <span className="text-[#e4f222] font-medium">{timezoneInfo.utcString}</span>
                </div>
              </div>
              <div className="text-[10px] text-[#8a8f98] pt-1 border-t border-[var(--color-graphite)] flex justify-between">
                <span>Unix Epoch: {timezoneInfo.unixSeconds}</span>
                <span>Duration: {deadlineDays} days from transaction finality</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={
                txStatus.state === "submitting" ||
                txStatus.state === "pending" ||
                !criteriaValidation.valid
              }
              className="btn-primary w-full py-3.5 text-[14px]"
            >
              {txStatus.state === "submitting" || txStatus.state === "pending" ? (
                "Processing on GenLayer…"
              ) : agreementType === "open" ? (
                <span className="flex items-center justify-center gap-2">
                  <ZapIcon className="w-4 h-4" />
                  Deposit {reward || "0"} GEN & Publish Open Bounty
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ZapIcon className="w-4 h-4" />
                  Deposit {reward || "0"} GEN & Lock Direct Escrow
                </span>
              )}
            </button>
          </div>

          <TransactionLifecycle status={txStatus} />

          {txStatus.state === "finalized" && (
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <span>Go to Agreements Docket</span>
                <span className="font-mono">→</span>
              </button>
            </div>
          )}
        </form>

        {/* Right Column: Explanatory Context (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card-box space-y-4 text-[13px]">
            <h3 className="font-medium text-[var(--color-paper)] border-b border-[var(--color-graphite)] pb-2 text-[15px]">
              How ChainSettle Protects You
            </h3>

            <div className="space-y-3 text-[var(--color-fog)]">
              <div className="p-3 rounded-[6px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] space-y-1">
                <strong className="text-[var(--color-paper)] block font-mono text-[11px]">
                  1. Hybrid Marketplace
                </strong>
                <span>
                  Post open bounties for anyone to claim, or lock escrow directly to an existing collaborator.
                </span>
              </div>

              <div className="p-3 rounded-[6px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] space-y-1">
                <strong className="text-[var(--color-paper)] block font-mono text-[11px]">
                  2. Autonomous AI Verification
                </strong>
                <span>
                  Validators inspect code first. If 100% of criteria pass, escrow is released automatically without client delay.
                </span>
              </div>

              <div className="p-3 rounded-[6px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] space-y-1">
                <strong className="text-[var(--color-paper)] block font-mono text-[11px]">
                  3. Creator Sovereign Override
                </strong>
                <span>
                  If minor defects are flagged, the creator can still release 100% full payment, or escalate to dispute court.
                </span>
              </div>

              <div className="p-3 rounded-[6px] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] space-y-1">
                <strong className="text-[var(--color-paper)] block font-mono text-[11px]">
                  4. Proportional Basis Points Court
                </strong>
                <span>
                  Disputed payouts are continuously scaled (0 to 10,000 BPS) based on verified delivered scope (e.g. 23.6%, 50%, 86%).
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-[10px] bg-[var(--color-carbon)] border border-[var(--color-graphite)] space-y-2 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] block">
              Evidence Requirements
            </span>
            <ul className="space-y-1.5 text-[var(--color-fog)] font-mono text-[11px]">
              <li>• Immutable 40-hex GitHub commit SHA</li>
              <li>• Public HTTPS deployment demo</li>
              <li>• 1 to 6 relative source files manifest</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
