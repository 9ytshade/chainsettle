"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AgreementData,
  chainSettleContractAddress,
  createChainSettleClient,
  readFinalContract,
  shortAddress,
} from "@/lib/genlayer";
import { formatWeiToGen } from "@/lib/safety";
import { useWallet } from "@/lib/use-wallet";
import { TransactionLifecycle, TxStatus } from "@/components/transaction-lifecycle";
import {
  ZapIcon,
  ScaleIcon,
  CheckIcon,
  XIcon,
  CopyIcon,
} from "@/components/icons";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface AgreementModalProps {
  agreement: AgreementData | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export function AgreementModal({
  agreement: initialAgreement,
  onClose,
  onRefresh,
}: AgreementModalProps) {
  const [refreshedAgreement, setRefreshedAgreement] = useState<AgreementData | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>({ state: "idle" });
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  const { account: userAccount, isConnected, connect } = useWallet();

  const agreement = refreshedAgreement || initialAgreement;

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!agreement) return null;

  const userAddr = (userAccount || "").toLowerCase().trim();
  const clientAddr = (agreement.client || "").toLowerCase().trim();
  const workerAddr = (agreement.worker || "").toLowerCase().trim();

  const isOpenBounty = workerAddr === ZERO_ADDRESS;
  const isClient = Boolean(userAddr && userAddr === clientAddr);
  const isWorker = Boolean(userAddr && !isOpenBounty && userAddr === workerAddr);

  const isDeadlinePassed = nowSeconds > 0 && nowSeconds > Number(agreement.deadline);
  const criteriaList = (agreement.criteria || "").split("\n").filter(Boolean);

  const deadlineDate = new Date(Number(agreement.deadline) * 1000);
  const formattedLocalDeadline = deadlineDate.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const formattedUtcDeadline = deadlineDate.toUTCString();

  async function reloadCurrentAgreement() {
    if (!agreement) return;
    try {
      const refreshed = (await readFinalContract("get_agreement", [
        agreement.id,
      ])) as AgreementData;
      if (refreshed) setRefreshedAgreement(refreshed);
      if (onRefresh) onRefresh();
    } catch {
      // Ignore background refresh errors
    }
  }

  async function executeWrite(functionName: string, args: unknown[]) {
    if (!window.ethereum || !userAccount) {
      const acc = await connect();
      if (!acc) {
        alert("Please connect your wallet first.");
        return;
      }
    }

    setTxStatus({ state: "submitting", message: `Executing ${functionName}…` });

    try {
      const client = createChainSettleClient(userAccount as `0x${string}`);
      const hash = await client.writeContract({
        address: chainSettleContractAddress as `0x${string}`,
        functionName,
        args: args as Parameters<typeof client.writeContract>[0]["args"],
        value: BigInt(0),
      });

      const hashStr = String(hash);
      setTxStatus({
        state: "pending",
        hash: hashStr,
        message: "Waiting for validator consensus on GenLayer…",
      });

      let terminalFailure = false;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const tx = (await client.getTransaction({
            hash: hashStr as unknown as Parameters<typeof client.getTransaction>[0]["hash"],
          })) as Record<string, unknown>;
          const st = String(tx?.statusName ?? tx?.status ?? "");
          if (st === "FINALIZED") break;
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
        message: "Transaction finalized on GenLayer!",
      });

      await reloadCurrentAgreement();
    } catch (err) {
      setTxStatus({
        state: "failed",
        error: err instanceof Error ? err.message : "Transaction failed.",
      });
    }
  }

  async function handleClaimBounty() {
    if (!agreement) return;
    await executeWrite("claim_agreement", [agreement.id]);
  }

  async function handleCancelOpenBounty() {
    if (!agreement) return;
    await executeWrite("cancel_unaccepted_agreement", [agreement.id]);
  }

  async function handleRunInitialAudit() {
    if (!agreement) return;
    await executeWrite("verify_delivery", [agreement.id]);
  }

  async function handleSovereignOverrideApprove() {
    if (!agreement) return;
    await executeWrite("approve_delivery", [agreement.id]);
  }

  let badgeColor = "bg-[var(--color-obsidian)] border-[var(--color-graphite)] text-[var(--color-fog)]";
  let statusLabel = agreement.status.toUpperCase();

  if (agreement.status === "open") {
    badgeColor = "bg-[#e4f222]/15 border-[#e4f222]/40 text-[#e4f222] font-semibold";
    statusLabel = "OPEN BOUNTY";
  } else if (agreement.status === "assigned") {
    badgeColor = "bg-blue-500/15 border-blue-500/30 text-blue-400";
    statusLabel = "IN PROGRESS";
  } else if (agreement.status === "delivered") {
    badgeColor = "bg-purple-500/15 border-purple-500/30 text-purple-400";
    statusLabel = "DELIVERED / AWAITING AUDIT";
  } else if (agreement.status === "audited") {
    badgeColor = "bg-amber-500/15 border-amber-500/30 text-amber-400";
    statusLabel = "AUDIT DEFICIENT";
  } else if (agreement.status === "disputed") {
    badgeColor = "bg-[#eb5757]/15 border-[#eb5757]/30 text-[#eb5757]";
    statusLabel = "IN DISPUTE COURT";
  } else if (agreement.status === "settled") {
    badgeColor = "bg-[#27a644]/15 border-[#27a644]/30 text-[#27a644]";
    statusLabel = "SETTLED";
  } else if (agreement.status === "cancelled") {
    badgeColor = "bg-red-500/15 border-red-500/30 text-red-400";
    statusLabel = "CANCELLED";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f1011] border border-[#27292d] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#d0d6e0]">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#23252a]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-[#8a8f98]">
                CASE-{agreement.id.toString().padStart(3, "0")}
              </span>
              <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                {statusLabel}
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
            <h2 className="text-xl sm:text-2xl font-medium text-[#ffffff] tracking-tight">
              {agreement.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg border border-[#23252a] hover:border-[#383a42] text-[#8a8f98] hover:text-[#ffffff] bg-[#161718] transition cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* User Account Role Indicator Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#161718]/80 border border-[#23252a] text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-[#27a644]" : "bg-[#8a8f98]"
              }`}
            />
            {isConnected ? (
              <span>
                Connected:{" "}
                <span className="text-[#ffffff] font-medium">{shortAddress(userAddr)}</span>
                {isClient ? (
                  <span className="ml-2 text-[#e4f222]">· Recognized as Agreement Creator</span>
                ) : isWorker ? (
                  <span className="ml-2 text-[#27a644]">· Recognized as Assigned Contractor</span>
                ) : (
                  <span className="ml-2 text-[#8a8f98]">· Observer</span>
                )}
              </span>
            ) : (
              <span className="text-[#8a8f98]">
                Wallet Disconnected · Connect to manage cancellation or claim bounty
              </span>
            )}
          </div>

          {!isConnected && (
            <button
              onClick={() => void connect()}
              className="btn-primary text-xs py-1 px-3"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* State Notice & Action Banner */}
        {agreement.status === "open" && (
          <div className="p-5 rounded-xl border border-[#e4f222]/30 bg-[#161718] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#e4f222] animate-pulse" />
                  <h4 className="font-medium text-[15px] text-[#ffffff]">
                    Open Marketplace Bounty
                  </h4>
                </div>
                <p className="text-xs text-[#8a8f98] leading-relaxed">
                  {isClient
                    ? "You created and funded this bounty. As long as no contractor has claimed it, you can cancel it at any time to receive a 100% escrow refund back to your wallet."
                    : isOpenBounty
                    ? "This milestone is open for any builder to claim. Escrow is locked and verified on GenLayer Studionet."
                    : "Contractor assigned to this agreement."}
                </p>
              </div>

              {/* Action Buttons based on role */}
              {isClient ? (
                <button
                  onClick={handleCancelOpenBounty}
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="px-4 py-2 rounded-[6px] bg-[#eb5757] hover:bg-[#ff6868] text-[#ffffff] text-xs font-mono font-medium transition shrink-0 cursor-pointer shadow-sm"
                >
                  Cancel & Refund Escrow
                </button>
              ) : !isClient && isConnected ? (
                <button
                  onClick={handleClaimBounty}
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="btn-primary text-xs shrink-0 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ZapIcon className="w-3.5 h-3.5" />
                    Accept & Claim Bounty
                  </span>
                </button>
              ) : null}
            </div>

            {isClient && (
              <p className="text-[11px] font-mono text-[#8a8f98] border-t border-[#23252a] pt-3 flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-[#27a644] shrink-0" />
                <span>
                  Escrow refund of {formatWeiToGen(agreement.reward)} GEN will return directly to your creator account ({shortAddress(agreement.client)}).
                </span>
              </p>
            )}
          </div>
        )}

        {agreement.status === "delivered" && (
          <div className="p-5 rounded-xl border border-purple-500/40 bg-[#161718] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-[15px] text-[#ffffff]">
                  Deliverable Submitted · Ready for Review
                </h4>
                <p className="text-xs text-[#8a8f98] mt-0.5">
                  Milestone submitted. Run the autonomous GenLayer AI audit to verify code & deployment.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunInitialAudit}
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="btn-primary text-xs shrink-0 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ZapIcon className="w-3.5 h-3.5" />
                    Run AI Verification
                  </span>
                </button>
                {isClient && (
                  <button
                    onClick={handleSovereignOverrideApprove}
                    disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                    className="px-3.5 py-2 rounded-[6px] bg-[#27a644] hover:bg-[#2fc452] text-[#ffffff] text-xs font-medium transition cursor-pointer"
                  >
                    Direct Approve 100%
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {agreement.status === "audited" && (
          <div className="p-5 rounded-xl border border-amber-500/40 bg-[#161718] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-[15px] text-[#ffffff]">
                  Audit Deficiencies Detected · Creator Sovereign Override
                </h4>
                <p className="text-xs text-[#8a8f98] mt-0.5">
                  Initial AI audit detected criteria gaps. The creator can override to release full payment or escalate to dispute court.
                </p>
              </div>
              {isClient && (
                <button
                  onClick={handleSovereignOverrideApprove}
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="px-4 py-2 rounded-[6px] bg-[#27a644] hover:bg-[#2fc452] text-[#ffffff] text-xs font-medium transition shrink-0 cursor-pointer"
                >
                  Override & Disburse 100%
                </button>
              )}
            </div>
          </div>
        )}

        {agreement.status === "disputed" && (
          <div className="p-5 rounded-xl border border-[#eb5757]/40 bg-[#161718] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[6px] bg-[#eb5757]/15 border border-[#eb5757]/30 flex items-center justify-center shrink-0">
                <ScaleIcon className="w-4 h-4 text-[#eb5757]" />
              </div>
              <div>
                <h4 className="font-medium text-[14px] text-[#ffffff]">Active Dispute Docket</h4>
                <p className="text-xs text-[#8a8f98]">
                  Case escalated to the GenLayer Dispute Court for proportional BPS arbitration.
                </p>
              </div>
            </div>
            <Link
              href={`/court/${agreement.id}`}
              className="px-4 py-2 rounded-[6px] bg-[#eb5757] hover:bg-[#ff6868] text-[#ffffff] text-xs font-medium transition shrink-0"
            >
              Enter Courtroom →
            </Link>
          </div>
        )}

        {agreement.status === "settled" && (
          <div className="p-5 rounded-xl border border-[#27a644]/40 bg-[#161718] space-y-2">
            <h4 className="font-medium text-sm text-[#27a644] flex items-center gap-1.5">
              <CheckIcon className="w-4 h-4 text-[#27a644]" />
              <span>Settlement Finalized on GenLayer Studionet</span>
            </h4>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs pt-2">
              <div>
                <span className="text-[10px] text-[#8a8f98] uppercase block">Contractor Payout:</span>
                <span className="text-[#27a644] font-medium">
                  {formatWeiToGen(agreement.worker_payout)} GEN
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8a8f98] uppercase block">Client Refund:</span>
                <span className="text-[#eb5757] font-medium">
                  {formatWeiToGen(agreement.client_refund)} GEN
                </span>
              </div>
            </div>
          </div>
        )}

        {agreement.status === "cancelled" && (
          <div className="p-5 rounded-xl border border-red-500/30 bg-[#161718] space-y-1.5">
            <h4 className="font-medium text-sm text-red-400 flex items-center gap-1.5">
              <XIcon className="w-4 h-4 text-red-400" />
              <span>Bounty Cancelled Prior to Claim</span>
            </h4>
            <p className="text-xs text-[#8a8f98] font-mono">
              100% of the locked escrow ({formatWeiToGen(agreement.reward)} GEN) was returned to the creator.
            </p>
          </div>
        )}

        {/* In-Modal Transaction Lifecycle Tracker */}
        <TransactionLifecycle status={txStatus} />

        {/* Technical Brief Box */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#8a8f98]">
            Contract Brief & Technical Scope
          </h3>
          <p className="text-sm text-[#d0d6e0] leading-relaxed whitespace-pre-wrap bg-[#161718]/60 p-4 rounded-xl border border-[#23252a]">
            {agreement.brief}
          </p>
        </div>

        {/* Acceptance Criteria List */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#8a8f98]">
            Acceptance Criteria ({criteriaList.length})
          </h3>
          <div className="space-y-2">
            {criteriaList.map((crit, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-[#161718]/40 border border-[#23252a] text-xs"
              >
                <span className="font-mono text-[#e4f222] font-semibold">{idx + 1}.</span>
                <span className="text-[#d0d6e0]">{crit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Precision Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#161718]/80 rounded-xl border border-[#23252a] text-xs font-mono">
          <div>
            <span className="text-[10px] text-[#8a8f98] uppercase block mb-0.5">Creator</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#ffffff] font-medium">{shortAddress(agreement.client)}</span>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(agreement.client);
                  setCopiedAddress("client");
                  setTimeout(() => setCopiedAddress(null), 1500);
                }}
                title="Copy client address"
                className="hover:text-[#ffffff] text-[#8a8f98] transition cursor-pointer"
              >
                {copiedAddress === "client" ? (
                  <CheckIcon className="w-3 h-3 text-[#27a644]" />
                ) : (
                  <CopyIcon className="w-3 h-3" />
                )}
              </button>
            </div>
            {isClient && <span className="text-[10px] text-[#e4f222] font-sans block">(You)</span>}
          </div>

          <div>
            <span className="text-[10px] text-[#8a8f98] uppercase block mb-0.5">Contractor</span>
            {isOpenBounty ? (
              <span className="text-[#e4f222] font-semibold">Unassigned (Public)</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[#ffffff] font-medium">{shortAddress(agreement.worker)}</span>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(agreement.worker);
                    setCopiedAddress("worker");
                    setTimeout(() => setCopiedAddress(null), 1500);
                  }}
                  title="Copy worker address"
                  className="hover:text-[#ffffff] text-[#8a8f98] transition cursor-pointer"
                >
                  {copiedAddress === "worker" ? (
                    <CheckIcon className="w-3 h-3 text-[#27a644]" />
                  ) : (
                    <CopyIcon className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
            {isWorker && <span className="text-[10px] text-[#27a644] font-sans block">(You)</span>}
          </div>

          <div>
            <span className="text-[10px] text-[#8a8f98] uppercase block mb-0.5">Locked Escrow</span>
            <span className="text-[#ffffff] font-semibold text-sm">
              {formatWeiToGen(agreement.reward)} GEN
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[#8a8f98] uppercase block mb-0.5">Delivery Deadline</span>
            <span className={isDeadlinePassed ? "text-[#eb5757]" : "text-[#d0d6e0]"}>
              {formattedLocalDeadline}
            </span>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="pt-4 border-t border-[#23252a] flex items-center justify-between gap-4 text-xs font-mono">
          <span className="text-[#8a8f98] hidden sm:inline">
            UTC Deadline: {formattedUtcDeadline}
          </span>
          <div className="flex items-center gap-3 ml-auto">
            <Link
              href={`/agreements/${agreement.id}`}
              className="text-[#e4f222] hover:underline font-medium flex items-center gap-1"
            >
              <span>Open Dedicated Docket Page</span>
              <span>↗</span>
            </Link>
            <button
              onClick={onClose}
              className="btn-ghost text-xs py-1.5 px-3 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
