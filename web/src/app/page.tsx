"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AgreementData,
  discoverFinalAgreements,
  retryFailedAgreements,
  chainSettleChainId,
} from "@/lib/genlayer";
import { AgreementCard } from "@/components/agreement-card";
import { AgreementModal } from "@/components/agreement-modal";
import {
  ScaleIcon,
  ZapIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CpuIcon,
  ArrowRightIcon,
  RefreshCwIcon,
} from "@/components/icons";

export default function HomePage() {
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize] = useState<number>(12);
  const [loading, setLoading] = useState(true);
  const [retryingFailed, setRetryingFailed] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementData | null>(null);

  const loadAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const result = await discoverFinalAgreements(page, pageSize);
      setAgreements(result.agreements);
      setFailedIds(result.failedIds);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAgreements();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAgreements]);

  async function handleRetryFailed() {
    if (failedIds.length === 0) return;
    setRetryingFailed(true);
    try {
      const { recovered, stillFailed } = await retryFailedAgreements(failedIds);
      if (recovered.length > 0) {
        setAgreements((prev) => {
          const map = new Map<number, AgreementData>();
          for (const item of [...prev, ...recovered]) {
            map.set(item.id, item);
          }
          return Array.from(map.values()).sort((a, b) => b.id - a.id);
        });
      }
      setFailedIds(stillFailed);
    } finally {
      setRetryingFailed(false);
    }
  }

  const disputedCount = agreements.filter((a) => a.status === "disputed").length;
  const openCount = agreements.filter((a) => a.status === "open").length;
  const assignedCount = agreements.filter((a) => a.status === "assigned").length;
  const settledCount = agreements.filter((a) => a.status === "settled").length;

  const filtered = agreements.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.brief.toLowerCase().includes(q) ||
        a.client.toLowerCase().includes(q) ||
        a.worker.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-16 pb-16">
      {/* Institutional Hero Section */}
      <section className="relative pt-6 pb-4">
        <div className="max-w-4xl space-y-6">
          {/* Live Network & Protocol Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161718] border border-[#23252a] text-[11px] font-mono text-[#8a8f98]">
              <span className="w-2 h-2 rounded-full bg-[#27a644] animate-pulse" />
              <span className="text-[#ffffff] font-medium">Studionet Live</span>
              <span className="text-[#62666d]">·</span>
              <span>Chain ID {chainSettleChainId}</span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161718] border border-[#23252a] text-[11px] font-mono text-[#8a8f98]">
              <span className="text-[#e4f222]">v1.2.0</span>
              <span>Intelligent Contract</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-medium text-[#ffffff] tracking-[-0.03em] leading-[1.04]">
            Intelligent Escrows & Sovereign Dispute Resolution.
          </h1>

          <p className="text-[17px] text-[#8a8f98] leading-relaxed max-w-3xl">
            ChainSettle elevates freelance escrow into an autonomous smart contract agreement protocol on GenLayer. Deliverables are evaluated directly by validator LLMs against pinned code repositories; creators hold sovereign override authority; irreconcilable disputes escalate to a decentralized micro-arbitration court with mathematical Basis Points payouts (0-10,000 BPS).
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link href="/agreements/create" className="btn-primary flex items-center gap-2">
              <ZapIcon className="w-4 h-4 text-[#08090a]" />
              <span>Create Milestone Escrow</span>
            </Link>

            <Link href="/court" className="btn-ghost flex items-center gap-2">
              <ScaleIcon className="w-4 h-4 text-[#8a8f98]" />
              <span>Court Docket</span>
              {disputedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#eb5757]/20 text-[#eb5757] font-mono text-[10px] font-medium">
                  {disputedCount}
                </span>
              )}
            </Link>

            <Link href="/protocol" className="btn-ghost flex items-center gap-1.5 text-[13px]">
              <span>Protocol Architecture</span>
              <ArrowRightIcon className="w-3.5 h-3.5 text-[#62666d]" />
            </Link>
          </div>
        </div>

        {/* Live On-Chain Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mt-12 pt-8 border-t border-[#23252a]">
          <div className="p-4 rounded-[8px] bg-[#0f1011] border border-[#23252a]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#62666d] block mb-1">
              On-Chain Agreements
            </span>
            <span className="text-2xl font-medium font-mono text-[#ffffff]">
              {totalCount}
            </span>
          </div>
          <div className="p-4 rounded-[8px] bg-[#0f1011] border border-[#23252a]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#62666d] block mb-1">
              Open to Claim
            </span>
            <span className="text-2xl font-medium font-mono text-[#e4f222]">
              {openCount}
            </span>
          </div>
          <div className="p-4 rounded-[8px] bg-[#0f1011] border border-[#23252a]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#62666d] block mb-1">
              In Progress
            </span>
            <span className="text-2xl font-medium font-mono text-[#02b8cc]">
              {assignedCount}
            </span>
          </div>
          <div className="p-4 rounded-[8px] bg-[#0f1011] border border-[#23252a]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#62666d] block mb-1">
              Active Disputes
            </span>
            <span className="text-2xl font-medium font-mono text-[#eb5757]">
              {disputedCount}
            </span>
          </div>
          <div className="p-4 rounded-[8px] bg-[#0f1011] border border-[#23252a] col-span-2 lg:col-span-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#62666d] block mb-1">
              Settled & Paid
            </span>
            <span className="text-2xl font-medium font-mono text-[#27a644]">
              {settledCount}
            </span>
          </div>
        </div>
      </section>

      {/* Protocol Architecture: 3 Sovereign Pillars */}
      <section className="space-y-6">
        <div className="border-b border-[#23252a] pb-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#e4f222] block mb-1">
            Institutional Guarantees
          </span>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#ffffff] tracking-tight">
            How ChainSettle Solves The Freelance Trilemma
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1 */}
          <div className="p-6 rounded-[10px] bg-[#0f1011] border border-[#23252a] space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-[8px] bg-[#02b8cc]/10 border border-[#02b8cc]/30 flex items-center justify-center text-[#02b8cc]">
              <CpuIcon className="w-5 h-5" />
            </div>
            <h3 className="text-[16px] font-medium text-[#ffffff]">
              Autonomous AI Audit
            </h3>
            <p className="text-[13px] text-[#8a8f98] leading-relaxed">
              Upon deliverable submission, GenLayer validators audit pinned GitHub commits and live web endpoints under the Equivalence Principle. If 100% of criteria PASS, full escrow is disbursed immediately without client drag.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-[10px] bg-[#0f1011] border border-[#23252a] space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-[8px] bg-[#e4f222]/10 border border-[#e4f222]/30 flex items-center justify-center text-[#e4f222]">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <h3 className="text-[16px] font-medium text-[#ffffff]">
              Creator Sovereign Override
            </h3>
            <p className="text-[13px] text-[#8a8f98] leading-relaxed">
              If validators flag criteria deficiencies, the creator is never trapped in forced arbitration. If the client is satisfied with 80% completion, they hold sovereign authority to override and disburse 100% payment on-chain.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-[10px] bg-[#0f1011] border border-[#23252a] space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-[8px] bg-[#eb5757]/10 border border-[#eb5757]/30 flex items-center justify-center text-[#eb5757]">
              <ScaleIcon className="w-5 h-5" />
            </div>
            <h3 className="text-[16px] font-medium text-[#ffffff]">
              Adversarial Court & BPS Math
            </h3>
            <p className="text-[13px] text-[#8a8f98] leading-relaxed">
              Unresolved disputes enter the small-claims courtroom. The contractor submits rebuttal evidence, and validator magistrates determine proportional settlements via Basis Points (0-10,000 BPS), strictly conserving 100% of funds.
            </p>
          </div>
        </div>
      </section>

      {/* Two-Stage Workflow Pipeline Overview */}
      <section className="p-6 sm:p-8 rounded-[12px] bg-[#0f1011] border border-[#23252a] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#23252a] pb-4">
          <div>
            <span className="text-[11px] font-mono text-[#e4f222] uppercase tracking-wider block mb-1">
              Deterministic Lifecycle
            </span>
            <h3 className="text-[20px] font-medium text-[#ffffff] tracking-tight">
              Two-Stage Agreement State Machine
            </h3>
          </div>
          <Link
            href="/protocol#lifecycle"
            className="text-[12px] font-mono text-[#8a8f98] hover:text-[#ffffff] flex items-center gap-1 transition"
          >
            <span>View Full Spec</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[12px] font-mono">
          <div className="p-4 rounded-[8px] bg-[#161718] border border-[#23252a] space-y-2">
            <div className="flex items-center justify-between text-[#8a8f98]">
              <span className="text-[10px] uppercase">Step 01</span>
              <span className="text-[#e4f222]">STAGE 1</span>
            </div>
            <h4 className="text-[14px] text-[#ffffff] font-sans font-medium">Escrow Lock & Claim</h4>
            <p className="text-[#8a8f98] font-sans text-[12px]">
              Client locks GEN reward. Direct contractor or open bounty claimable by any verified wallet.
            </p>
          </div>

          <div className="p-4 rounded-[8px] bg-[#161718] border border-[#23252a] space-y-2">
            <div className="flex items-center justify-between text-[#8a8f98]">
              <span className="text-[10px] uppercase">Step 02</span>
              <span className="text-[#02b8cc]">AUDIT</span>
            </div>
            <h4 className="text-[14px] text-[#ffffff] font-sans font-medium">Deliver & Auto-Audit</h4>
            <p className="text-[#8a8f98] font-sans text-[12px]">
              Contractor commits 40-hex SHA & URL. Initial AI verification tests 100% criteria compliance.
            </p>
          </div>

          <div className="p-4 rounded-[8px] bg-[#161718] border border-[#23252a] space-y-2">
            <div className="flex items-center justify-between text-[#8a8f98]">
              <span className="text-[10px] uppercase">Step 03</span>
              <span className="text-[#27a644]">SETTLE</span>
            </div>
            <h4 className="text-[14px] text-[#ffffff] font-sans font-medium">Sovereign Release</h4>
            <p className="text-[#8a8f98] font-sans text-[12px]">
              If 100% PASS, instant auto-disbursement. If deficient, client can exercise 100% sovereign override.
            </p>
          </div>

          <div className="p-4 rounded-[8px] bg-[#161718] border border-[#23252a] space-y-2">
            <div className="flex items-center justify-between text-[#8a8f98]">
              <span className="text-[10px] uppercase">Step 04</span>
              <span className="text-[#eb5757]">STAGE 2</span>
            </div>
            <h4 className="text-[14px] text-[#ffffff] font-sans font-medium">Courtroom Verdict</h4>
            <p className="text-[#8a8f98] font-sans text-[12px]">
              Disputes open defense window. GenLayer magistrate consensus delivers mathematically fair ruling.
            </p>
          </div>
        </div>
      </section>

      {/* Partial Data Notice Banner */}
      {failedIds.length > 0 && (
        <div className="p-4 rounded-[8px] border border-[#eb5757]/40 bg-[#161718] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangleIcon className="w-4 h-4 text-[#eb5757] shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-[#ffffff]">
                Partial On-Chain Data Loaded
              </p>
              <p className="text-[12px] text-[#8a8f98]">
                Agreement #{failedIds.join(", #")} could not be fetched due to transient GenLayer RPC latency.
              </p>
            </div>
          </div>
          <button
            onClick={handleRetryFailed}
            disabled={retryingFailed}
            className="btn-ghost text-[12px] py-1.5 px-3 border-[#eb5757]/40 text-[#eb5757] hover:bg-[#eb5757]/10 flex items-center gap-1.5"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${retryingFailed ? "animate-spin" : ""}`} />
            <span>{retryingFailed ? "Retrying…" : "Retry Failed Records"}</span>
          </button>
        </div>
      )}

      {/* Live On-Chain Agreements Docket */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All Agreements" },
              { id: "open", label: "Open to Claim" },
              { id: "assigned", label: "In Progress" },
              { id: "delivered", label: "Delivered" },
              { id: "audited", label: "Audit Review" },
              { id: "disputed", label: "Disputed Court" },
              { id: "settled", label: "Settled" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                  filter === id
                    ? "bg-[#ffffff] text-[#08090a]"
                    : "bg-[#0f1011] border border-[#23252a] text-[#8a8f98] hover:text-[#d0d6e0] hover:border-[#383b3f]"
                }`}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by title, brief, address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-box text-[13px] py-2 px-3"
            />
          </div>
        </div>

        {/* Discovery Counter */}
        <div className="flex items-center justify-between text-xs font-mono text-[#8a8f98]">
          <span>
            Displaying {agreements.length} of {totalCount} total on-chain records
            {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
          </span>
          <span className="text-[11px] text-[#62666d]">Newest first</span>
        </div>

        {/* Agreements Grid */}
        {loading ? (
          <div className="card-box text-center py-16 text-[#8a8f98] font-mono text-[13px] flex flex-col items-center justify-center gap-2">
            <RefreshCwIcon className="w-5 h-5 text-[#e4f222] animate-spin" />
            <span>Fetching finalized state from GenLayer Studionet…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-box text-center py-16 space-y-3">
            <p className="text-[16px] font-medium text-[#ffffff]">
              No matching agreements found
            </p>
            <p className="text-[13px] text-[#8a8f98] max-w-md mx-auto">
              {search || filter !== "all"
                ? "No agreements matched your current filter criteria."
                : "No agreements exist yet on this contract."}
            </p>
            <Link href="/agreements/create" className="btn-primary mt-2 inline-flex items-center gap-2">
              <ZapIcon className="w-4 h-4 text-[#08090a]" />
              <span>Create First Escrow</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((agreement) => (
              <AgreementCard
                key={agreement.id}
                agreement={agreement}
                onSelect={setSelectedAgreement}
              />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 border-t border-[#23252a]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="btn-ghost text-[12px] py-1.5 px-3"
            >
              ← Previous
            </button>
            <span className="text-xs font-mono text-[#d0d6e0]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="btn-ghost text-[12px] py-1.5 px-3"
            >
              Next →
            </button>
          </div>
        )}
      </section>

      {/* Expanded Agreement Details Modal */}
      <AgreementModal
        key={selectedAgreement ? selectedAgreement.id : "none"}
        agreement={selectedAgreement}
        onClose={() => setSelectedAgreement(null)}
        onRefresh={loadAgreements}
      />
    </div>
  );
}
