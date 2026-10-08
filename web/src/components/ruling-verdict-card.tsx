"use client";

import { RulingData } from "@/lib/genlayer";
import { RulerIcon } from "@/components/icons";

export function RulingVerdictCard({ ruling }: { ruling: RulingData }) {
  const bps =
    ruling.worker_basis_points !== undefined
      ? Number(ruling.worker_basis_points)
      : Number(ruling.worker_percentage) * 100;
  const workerPct = bps / 100;
  const clientPct = (10000 - bps) / 100;
  const workerDisplay =
    ruling.worker_percentage_display ??
    `${workerPct.toFixed(2).replace(/\.?0+$/, "")}%`;
  const clientDisplay = `${clientPct.toFixed(2).replace(/\.?0+$/, "")}%`;

  const isFullWorker = ruling.verdict === "FULL_PAYOUT_WORKER";
  const isPartial = ruling.verdict === "PARTIAL_SETTLEMENT";
  const isFullRefund = ruling.verdict === "FULL_REFUND_CLIENT";
  const isUndetermined = ruling.verdict === "UNDETERMINED";

  const criteriaLines = ruling.criteria_report
    ? ruling.criteria_report.split("\n").filter(Boolean)
    : [];

  return (
    <div className="card-box bg-[#0f1011] border border-[#23252a] rounded-[12px] p-6 space-y-6">
      {/* Verdict Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#23252a] pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#62666d] block">
            GenLayer Validator Magistrate Ruling
          </span>
          <h2 className="text-[20px] font-medium text-[#ffffff] tracking-tight flex items-center gap-2 mt-1">
            <span>
              {isFullWorker && "Full Payout to Contractor"}
              {isPartial &&
                `Proportional Settlement (${workerDisplay} / ${clientDisplay})`}
              {isFullRefund && "Full Escrow Refund to Client"}
              {isUndetermined && "Undetermined (Retryable)"}
            </span>
          </h2>
        </div>
        <span
          className={`badge self-start sm:self-auto ${
            isFullWorker
              ? "badge-settled"
              : isPartial
              ? "badge-open"
              : isFullRefund
              ? "badge-disputed"
              : "badge-cancelled"
          }`}
        >
          {ruling.verdict}
        </span>
      </div>

      {/* Proportional Split Bar (Basis Points Precision) */}
      {!isUndetermined && (
        <div className="space-y-2">
          <div className="flex justify-between items-baseline text-[12px] font-mono">
            <span className="text-[#27a644] font-medium flex items-center gap-1.5">
              <span>Contractor Share:</span>
              <span className="text-[#ffffff]">{workerDisplay}</span>
              <span className="text-[10px] text-[#62666d]">({bps} BPS)</span>
            </span>
            <span className="text-[#eb5757] font-medium flex items-center gap-1.5">
              <span>Client Refund:</span>
              <span className="text-[#ffffff]">{clientDisplay}</span>
              <span className="text-[10px] text-[#62666d]">
                ({10000 - bps} BPS)
              </span>
            </span>
          </div>
          <div className="h-2 w-full bg-[#161718] border border-[#23252a] flex overflow-hidden rounded-[4px]">
            <div
              style={{ width: `${workerPct}%` }}
              className="bg-[#27a644] h-full transition-all duration-500"
            />
            <div
              style={{ width: `${clientPct}%` }}
              className="bg-[#eb5757] h-full transition-all duration-500"
            />
          </div>
        </div>
      )}

      {/* Arithmetic Calculation Breakdown */}
      {ruling.calculation_breakdown && (
        <div className="p-4 rounded-[6px] bg-[#161718] border border-[#23252a] space-y-1.5">
          <div className="flex items-center gap-2">
            <RulerIcon className="w-3.5 h-3.5 text-[#e4f222]" />
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#e4f222]">
              Mathematical Derivation ({bps} Basis Points)
            </h4>
          </div>
          <p className="text-[#d0d6e0] font-mono text-[12px] leading-relaxed break-words">
            {ruling.calculation_breakdown}
          </p>
        </div>
      )}

      {/* Consensus Reasoning */}
      <div className="p-4 rounded-[6px] bg-[#161718] border border-[#23252a] space-y-1.5">
        <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#62666d]">
          Consensus Rationale & Evidence Audit
        </h4>
        <p className="text-[#d0d6e0] text-[14px] leading-relaxed">
          {ruling.reasoning}
        </p>
        {ruling.evidence_note && (
          <p className="text-[12px] font-mono text-[#8a8f98] pt-1">
            Note: {ruling.evidence_note}
          </p>
        )}
      </div>

      {/* Itemized Criteria Results */}
      {criteriaLines.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#62666d]">
            Criteria Adjudication Manifest
          </h4>
          <div className="space-y-1.5">
            {criteriaLines.map((line, idx) => {
              const isPass = line.includes("PASS");
              const isPartialCrit = line.includes("PARTIAL");
              const isFail = line.includes("FAIL");
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-[6px] border border-[#23252a] bg-[#161718]/40 text-[12px] font-mono"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium ${
                      isPass
                        ? "badge-settled"
                        : isPartialCrit
                        ? "badge-delivered"
                        : isFail
                        ? "badge-disputed"
                        : "badge-cancelled"
                    }`}
                  >
                    {isPass
                      ? "PASS"
                      : isPartialCrit
                      ? "PARTIAL"
                      : isFail
                      ? "FAIL"
                      : "UNDETERMINED"}
                  </span>
                  <span className="flex-1 text-[#d0d6e0]">{line}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
