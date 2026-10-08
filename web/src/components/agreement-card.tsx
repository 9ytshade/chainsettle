"use client";

import Link from "next/link";
import { AgreementData, shortAddress } from "@/lib/genlayer";
import { formatWeiToGen } from "@/lib/safety";
import { useWallet } from "@/lib/use-wallet";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface AgreementCardProps {
  agreement: AgreementData;
  onSelect?: (agreement: AgreementData) => void;
}

export function AgreementCard({ agreement, onSelect }: AgreementCardProps) {
  const { account } = useWallet();
  const userAddr = (account || "").toLowerCase().trim();
  const clientAddr = (agreement.client || "").toLowerCase().trim();
  const workerAddr = (agreement.worker || "").toLowerCase().trim();

  const isClient = Boolean(userAddr && userAddr === clientAddr);
  const isWorker = Boolean(userAddr && workerAddr !== ZERO_ADDRESS && userAddr === workerAddr);

  const genReward = formatWeiToGen(agreement.reward);
  const deadlineDate = new Date(Number(agreement.deadline) * 1000).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  const isDisputed = agreement.status === "disputed";
  const isOpenBounty = agreement.status === "open" && workerAddr === ZERO_ADDRESS;

  let badgeColor = "bg-[var(--color-obsidian)] border-[var(--color-graphite)] text-[var(--color-fog)]";
  let statusLabel = agreement.status.toUpperCase();

  if (isOpenBounty) {
    badgeColor = "bg-[#e4f222]/15 border-[#e4f222]/40 text-[#e4f222] font-semibold";
    statusLabel = "OPEN BOUNTY";
  } else if (agreement.status === "assigned") {
    badgeColor = "bg-blue-500/15 border-blue-500/30 text-blue-400";
    statusLabel = "IN PROGRESS";
  } else if (agreement.status === "delivered") {
    badgeColor = "bg-purple-500/15 border-purple-500/30 text-purple-400";
    statusLabel = "DELIVERED";
  } else if (agreement.status === "audited") {
    badgeColor = "bg-amber-500/15 border-amber-500/30 text-amber-400";
    statusLabel = "AUDIT DEFICIENT";
  } else if (agreement.status === "disputed") {
    badgeColor = "bg-[#eb5757]/15 border-[#eb5757]/30 text-[#eb5757]";
    statusLabel = "DISPUTED";
  } else if (agreement.status === "settled") {
    badgeColor = "bg-[#27a644]/15 border-[#27a644]/30 text-[#27a644]";
    statusLabel = "SETTLED";
  } else if (agreement.status === "cancelled") {
    badgeColor = "bg-red-500/15 border-red-500/30 text-red-400";
    statusLabel = "CANCELLED";
  }

  function handleCardClick(e: React.MouseEvent) {
    // If clicking a link or interactive child, don't hijack
    const target = e.target as HTMLElement;
    if (target.closest("a") || target.closest("button")) return;
    if (onSelect) onSelect(agreement);
  }

  return (
    <div
      onClick={handleCardClick}
      className="card-box flex flex-col justify-between group hover:border-[#383b3f] transition-all duration-150 cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[var(--color-ash)]">
              CASE-{agreement.id.toString().padStart(3, "0")}
            </span>
            {isClient && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#e4f222]/15 border border-[#e4f222]/30 text-[#e4f222]">
                Creator (You)
              </span>
            )}
            {isWorker && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#27a644]/15 border border-[#27a644]/30 text-[#27a644]">
                Contractor (You)
              </span>
            )}
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {statusLabel}
          </span>
        </div>

        <h3 className="font-medium text-[16px] text-[var(--color-paper)] tracking-tight leading-snug mb-2 line-clamp-2 group-hover:text-[#e4f222] transition-colors">
          {agreement.title}
        </h3>

        <p className="text-[13px] text-[var(--color-fog)] line-clamp-2 mb-4 leading-relaxed">
          {agreement.brief}
        </p>

        {/* Precision metadata panel */}
        <div className="grid grid-cols-2 gap-2 text-[12px] font-mono p-3 rounded-[6px] bg-[var(--color-obsidian)]/80 border border-[var(--color-graphite)] mb-4">
          <div>
            <span className="text-[10px] text-[var(--color-ash)] uppercase block">Creator</span>
            <span className="text-[var(--color-mist)]">{shortAddress(agreement.client)}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--color-ash)] uppercase block">Contractor</span>
            <span className="text-[var(--color-mist)]">
              {isOpenBounty ? (
                <span className="text-[#e4f222] font-semibold">Unassigned</span>
              ) : (
                shortAddress(agreement.worker)
              )}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--color-ash)] uppercase block">Escrow</span>
            <span className="text-[var(--color-paper)] font-medium">{genReward} GEN</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--color-ash)] uppercase block">Deadline</span>
            <span className="text-[var(--color-fog)]">{deadlineDate}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--color-graphite)] flex items-center justify-between text-[13px]">
        {/* Primary modal trigger button */}
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(agreement)}
            className={`font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDisputed
                ? "text-[#eb5757] hover:text-[#ff7878]"
                : isClient && isOpenBounty
                ? "text-[#e4f222] hover:underline"
                : isOpenBounty
                ? "text-[#e4f222] hover:underline"
                : "text-[var(--color-fog)] hover:text-[var(--color-paper)]"
            }`}
          >
            <span>
              {isDisputed
                ? "Inspect Dispute (Modal)"
                : isClient && isOpenBounty
                ? "Manage / Cancel Escrow"
                : isOpenBounty
                ? "Inspect & Claim Bounty"
                : "View Details (Modal)"}
            </span>
            <span className="text-[11px] font-mono">→</span>
          </button>
        ) : (
          <Link
            href={`/agreements/${agreement.id}`}
            className="text-[#e4f222] hover:underline font-medium flex items-center gap-1.5 transition-colors"
          >
            <span>View Agreement</span>
            <span className="text-[11px] font-mono">→</span>
          </Link>
        )}

        {/* Small direct link to full page */}
        <Link
          href={isDisputed ? `/court/${agreement.id}` : `/agreements/${agreement.id}`}
          onClick={(e) => e.stopPropagation()}
          title="Open dedicated page permalink"
          className="text-[11px] font-mono text-[#8a8f98] hover:text-[#ffffff] transition-colors p-1"
        >
          <span>Page ↗</span>
        </Link>
      </div>
    </div>
  );
}
