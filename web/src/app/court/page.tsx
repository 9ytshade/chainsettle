"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AgreementData,
  discoverFinalAgreements,
  retryFailedAgreements,
  shortAddress,
} from "@/lib/genlayer";
import { formatWeiToGen } from "@/lib/safety";
import { AlertTriangleIcon } from "@/components/icons";

export default function CourtDocketPage() {
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [loading, setLoading] = useState(true);
  const [retryingFailed, setRetryingFailed] = useState(false);

  useEffect(() => {
    async function load() {
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
    }
    void load();
  }, [page, pageSize]);

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

  const disputedCases = agreements.filter((a) => a.status === "disputed");
  const adjudicatedCases = agreements.filter(
    (a) => a.status === "settled" && Number(a.ruling_id) > 0
  );

  return (
    <div className="space-y-10">
      {/* Docket Header */}
      <div className="card-box bg-[#0f1011] border border-[#23252a] rounded-[12px] p-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#eb5757] animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#eb5757]">
            GenLayer Magistrate Jury Docket
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-medium text-[#ffffff] tracking-tight">
          Decentralized Small-Claims Courtroom
        </h1>
        <p className="text-[14px] text-[#8a8f98] max-w-2xl leading-relaxed pt-1">
          When clients and contractors dispute a milestone, evidence enters this docket. Independent GenLayer AI validator nodes evaluate the commit-pinned source files and live deployment under the Equivalence Principle to disburse proportional settlement rulings.
        </p>
      </div>

      {/* Partial Data Notice Banner */}
      {failedIds.length > 0 && (
        <div className="p-4 rounded-[8px] border border-[#eb5757]/40 bg-[#161718] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangleIcon className="w-4 h-4 text-[#eb5757] shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-[#ffffff]">
                Partial Docket Data Loaded
              </p>
              <p className="text-[12px] text-[#8a8f98]">
                Case #{failedIds.join(", #")} could not be fetched due to transient GenLayer RPC latency.
              </p>
            </div>
          </div>
          <button
            onClick={handleRetryFailed}
            disabled={retryingFailed}
            className="btn-ghost text-[12px] py-1.5 px-3 border-[#eb5757]/40 text-[#eb5757] hover:bg-[#eb5757]/10"
          >
            {retryingFailed ? "Retrying…" : "Retry Failed Records"}
          </button>
        </div>
      )}

      {/* Active Disputes Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#23252a] pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-medium text-[#ffffff]">
              Active Disputes Under Adjudication
            </h2>
            <span className="badge badge-disputed">{disputedCases.length}</span>
          </div>
          <span className="text-xs font-mono text-[#8a8f98]">
            Docket total: {totalCount} records indexed
          </span>
        </div>

        {loading ? (
          <div className="card-box text-center py-12 text-[#8a8f98] font-mono text-[13px]">
            Querying active disputes from GenLayer Studionet…
          </div>
        ) : disputedCases.length === 0 ? (
          <div className="card-box text-center py-12 text-[#8a8f98] text-[13px]">
            No active disputes on the docket. All delivered milestones are settled or awaiting direct client review.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {disputedCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="card-box border border-[#eb5757]/30 bg-[#0f1011] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-[#62666d]">
                      CASE-{caseItem.id.toString().padStart(3, "0")}
                    </span>
                    <span className="badge badge-disputed">DISPUTED</span>
                  </div>

                  <h3 className="font-medium text-[16px] text-[#ffffff] mb-1.5 line-clamp-1">
                    {caseItem.title}
                  </h3>
                  <p className="text-[13px] text-[#8a8f98] line-clamp-2 mb-4 leading-relaxed">
                    {caseItem.brief}
                  </p>

                  <div className="p-3 bg-[#161718]/60 border border-[#23252a] rounded-[6px] text-[12px] font-mono mb-4 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#62666d] uppercase block">At Stake</span>
                      <span className="text-[#ffffff] font-medium">
                        {formatWeiToGen(caseItem.reward)} GEN
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#62666d] uppercase block">Parties</span>
                      <span className="text-[#d0d6e0]">
                        {shortAddress(caseItem.client)} vs {shortAddress(caseItem.worker)}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/court/${caseItem.id}`}
                  className="w-full text-center py-2.5 rounded-[6px] bg-[#eb5757] hover:bg-[#ff6868] text-[#ffffff] font-medium text-[13px] transition flex items-center justify-center gap-1.5"
                >
                  <span>Enter Courtroom & Adjudicate</span>
                  <span className="font-mono text-[11px]">→</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historical Adjudicated Cases */}
      {adjudicatedCases.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-[#23252a] pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-medium text-[#ffffff]">
                Historical Adjudication Rulings
              </h2>
              <span className="badge badge-settled">{adjudicatedCases.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {adjudicatedCases.map((caseItem) => (
              <div key={caseItem.id} className="card-box bg-[#0f1011] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-[#62666d]">
                      CASE-{caseItem.id.toString().padStart(3, "0")}
                    </span>
                    <span className="badge badge-settled">RULING FINALIZED</span>
                  </div>
                  <h3 className="font-medium text-[15px] text-[#ffffff] mb-2 line-clamp-1">
                    {caseItem.title}
                  </h3>
                  <div className="flex justify-between text-[12px] font-mono p-3 bg-[#161718]/60 rounded-[6px] border border-[#23252a] my-2">
                    <span className="text-[#27a644]">
                      Contractor: {formatWeiToGen(caseItem.worker_payout)} GEN
                    </span>
                    <span className="text-[#eb5757]">
                      Refund: {formatWeiToGen(caseItem.client_refund)} GEN
                    </span>
                  </div>
                </div>
                <Link
                  href={`/court/${caseItem.id}`}
                  className="pt-2 text-[12px] font-mono text-[#8a8f98] hover:text-[#ffffff] flex items-center justify-end gap-1 transition-colors"
                >
                  <span>Inspect Magistrate Ruling</span>
                  <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pagination Controls */}
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
    </div>
  );
}
