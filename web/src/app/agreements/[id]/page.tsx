"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AgreementData,
  DeliveryData,
  DisputeData,
  RulingData,
  chainSettleContractAddress,
  createChainSettleClient,
  readFinalContract,
  shortAddress,
} from "@/lib/genlayer";
import {
  formatWeiToGen,
  isHttpsUrl,
  isPublicGithubCommitUrl,
  normalizeHttpsUrl,
  validateEvidencePaths,
} from "@/lib/safety";
import { TransactionLifecycle, TxStatus } from "@/components/transaction-lifecycle";
import { RulingVerdictCard } from "@/components/ruling-verdict-card";
import { ZapIcon, ScaleIcon, CheckIcon, AlertTriangleIcon } from "@/components/icons";
import { useWallet } from "@/lib/use-wallet";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function AgreementDetailPage() {
  const params = useParams();
  const agreementId = Number(params?.id);

  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [ruling, setRuling] = useState<RulingData | null>(null);
  const [loading, setLoading] = useState(true);

  const { account: userAccount, isConnected, connect } = useWallet();

  // Submit delivery form state
  const [repoUrl, setRepoUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [evidencePaths, setEvidencePaths] = useState("src/app/page.tsx\npackage.json");

  // Dispute form state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [complaint, setComplaint] = useState("");

  // Counter-defense form state
  const [showDefenseForm, setShowDefenseForm] = useState(false);
  const [defense, setDefense] = useState("");

  // Reopen expired bounty state
  const [reopenDays, setReopenDays] = useState(7);
  const [nowSeconds, setNowSeconds] = useState<number>(0);

  const [txStatus, setTxStatus] = useState<TxStatus>({ state: "idle" });

  useEffect(() => {
    async function loadData() {
      if (!agreementId) return;
      setNowSeconds(Math.floor(Date.now() / 1000));
      setLoading(true);
      try {
        const a = (await readFinalContract("get_agreement", [agreementId])) as AgreementData;
        setAgreement(a);

        if (a && a.status !== "open" && a.status !== "cancelled") {
          try {
            const d = (await readFinalContract("get_delivery", [agreementId])) as DeliveryData;
            setDelivery(d);
          } catch {
            // Delivery not found
          }
        }

        if (a && (a.status === "disputed" || a.status === "settled")) {
          try {
            const disp = (await readFinalContract("get_dispute", [agreementId])) as DisputeData;
            setDispute(disp);
          } catch {
            // Dispute not found
          }
        }

        if (a && a.ruling_id && Number(a.ruling_id) > 0) {
          try {
            const r = (await readFinalContract("get_ruling", [Number(a.ruling_id)])) as RulingData;
            setRuling(r);
          } catch {
            // Ruling not found
          }
        }
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [agreementId]);

  async function executeWrite(functionName: string, args: unknown[]) {
    if (!window.ethereum || !userAccount) {
      alert("Please connect your wallet first.");
      return;
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
        message: "Transaction finalized on GenLayer!",
      });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setTxStatus({
        state: "failed",
        error: err instanceof Error ? err.message : "Transaction failed.",
      });
    }
  }

  async function handleClaimBounty() {
    await executeWrite("claim_agreement", [agreementId]);
  }

  async function handleCancelOpenBounty() {
    await executeWrite("cancel_unaccepted_agreement", [agreementId]);
  }

  async function handleReclaimExpiredEscrow() {
    await executeWrite("reclaim_expired_escrow", [agreementId]);
  }

  async function handleReopenExpiredBounty() {
    const newDeadline = Math.floor(Date.now() / 1000) + reopenDays * 86400;
    await executeWrite("reopen_expired_agreement", [agreementId, newDeadline]);
  }

  async function handleSubmitDelivery(e: React.FormEvent) {
    e.preventDefault();
    if (!isPublicGithubCommitUrl(repoUrl)) {
      alert("Please provide a valid GitHub commit permalink (e.g. https://github.com/owner/repo/commit/sha40).");
      return;
    }
    if (!isHttpsUrl(deployUrl)) {
      alert("Please provide a valid HTTPS deployment URL.");
      return;
    }
    const pathCheck = validateEvidencePaths(evidencePaths);
    if (!pathCheck.valid) {
      alert(pathCheck.error);
      return;
    }
    await executeWrite("submit_delivery", [
      agreementId,
      repoUrl.trim(),
      normalizeHttpsUrl(deployUrl),
      summary.trim(),
      pathCheck.paths.join("\n"),
    ]);
  }

  async function handleRunInitialAudit() {
    await executeWrite("verify_delivery", [agreementId]);
  }

  async function handleSovereignOverrideApprove() {
    await executeWrite("approve_delivery", [agreementId]);
  }

  async function handleClaimTimeout() {
    await executeWrite("claim_uncontested_timeout", [agreementId]);
  }

  async function handleRaiseDispute(e: React.FormEvent) {
    e.preventDefault();
    if (complaint.trim().length < 10) {
      alert("Complaint must be at least 10 characters.");
      return;
    }
    await executeWrite("raise_dispute", [agreementId, complaint.trim()]);
  }

  async function handleSubmitDefense(e: React.FormEvent) {
    e.preventDefault();
    if (defense.trim().length < 10) {
      alert("Defense statement must be at least 10 characters.");
      return;
    }
    await executeWrite("submit_dispute_defense", [agreementId, defense.trim()]);
  }

  if (loading) {
    return (
      <div className="card-box text-center py-16 text-[#8a8f98] font-mono text-[13px]">
        Loading case #{agreementId} from GenLayer Studionet…
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="card-box text-center py-16 space-y-3">
        <p className="text-[16px] font-medium text-[#ffffff]">Case not found</p>
        <Link href="/" className="btn-ghost inline-flex text-[12px]">
          ← Back to Agreements
        </Link>
      </div>
    );
  }

  const userAddr = (userAccount || "").toLowerCase().trim();
  const clientAddr = (agreement.client || "").toLowerCase().trim();
  const workerAddr = (agreement.worker || "").toLowerCase().trim();

  const isOpenBounty = workerAddr === ZERO_ADDRESS;
  const isClient = Boolean(userAddr && userAddr === clientAddr);
  const isWorker = Boolean(
    userAddr && !isOpenBounty && userAddr === workerAddr
  );
  const isDeadlinePassed = nowSeconds > 0 && nowSeconds > Number(agreement.deadline);
  const criteriaList = agreement.criteria.split("\n").filter(Boolean);

  const statusLabel =
    agreement.status === "open"
      ? "OPEN BOUNTY"
      : agreement.status === "assigned"
      ? "IN PROGRESS"
      : agreement.status === "delivered"
      ? "DELIVERED / AWAITING AUDIT"
      : agreement.status === "audited"
      ? "AUDIT DEFICIENT"
      : agreement.status === "disputed"
      ? "IN DISPUTE COURT"
      : agreement.status === "settled"
      ? "SETTLED"
      : "CANCELLED";

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono text-[#62666d]">
              CASE-{agreement.id.toString().padStart(3, "0")}
            </span>
            <span className={`badge badge-${agreement.status}`}>{statusLabel}</span>
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
          <h1 className="text-2xl font-medium text-[#ffffff] tracking-tight">
            {agreement.title}
          </h1>
        </div>
        <Link
          href="/"
          className="text-[12px] font-mono text-[#8a8f98] hover:text-[#ffffff] transition-colors"
        >
          ← All Agreements
        </Link>
      </div>

      {/* Connected Account & Role Status Pill */}
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
                <span className="ml-2 text-[#8a8f98]">· Observer / Potential Builder</span>
              )}
            </span>
          ) : (
            <span className="text-[#8a8f98]">
              Wallet Disconnected · Connect to cancel & refund escrow or accept bounty
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

      {/* STATE NOTICES & ACTION BANNERS */}

      {/* 1. Open Marketplace Bounty Banner */}
      {agreement.status === "open" && (
        <div className="border border-[#e4f222]/30 bg-[#161718] p-5 rounded-[12px] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e4f222] animate-pulse" />
                <h4 className="font-medium text-[15px] text-[#ffffff]">
                  Open Marketplace Bounty
                </h4>
              </div>
              <p className="text-[13px] text-[#8a8f98] leading-relaxed">
                {isClient
                  ? "You created and funded this bounty. As long as no builder has claimed it, you have the right to cancel and reclaim 100% of the locked escrow immediately."
                  : isOpenBounty
                  ? "This milestone is open for any builder to claim. Escrow is locked on GenLayer."
                  : "Assigned contractor will deliver to this escrow."}
              </p>
            </div>

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
                className="btn-primary shrink-0 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ZapIcon className="w-3.5 h-3.5" />
                  Accept & Claim Bounty
                </span>
              </button>
            ) : null}
          </div>

          {!isClient && isConnected && (
            <p className="text-[12px] text-[#62666d] font-mono border-t border-[#23252a] pt-3">
              Accepting assigns this agreement exclusively to your connected wallet (
              {shortAddress(userAddr)}). You will then have until{" "}
              {new Date(Number(agreement.deadline) * 1000).toLocaleDateString()} to submit code & live deployment.
            </p>
          )}

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

      {/* 2. Ghosting Alert: Deadline Expired without Delivery */}
      {agreement.status === "assigned" && isDeadlinePassed && (
        <div className="border border-[#eb5757]/40 bg-[#161718] p-5 rounded-[12px] space-y-4">
          <div className="flex items-center gap-2 text-[#eb5757]">
            <AlertTriangleIcon className="w-4 h-4 text-[#eb5757] shrink-0" />
            <h4 className="font-medium text-[15px] text-[#ffffff]">
              Delivery Deadline Expired (Ghosting Safeguard)
            </h4>
          </div>
          <p className="text-[13px] text-[#8a8f98]">
            The designated delivery deadline has passed without a deliverable being submitted. The client is protected against ghosting.
          </p>

          {isClient && (
            <div className="pt-2 border-t border-[#23252a] space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#62666d] block">
                Creator Recovery Options
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleReclaimExpiredEscrow}
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="px-4 py-2 rounded-[6px] bg-[#eb5757] hover:bg-[#ff6868] text-[#ffffff] text-[13px] font-medium transition"
                >
                  Reclaim 100% Escrow (Full Refund)
                </button>

                <div className="flex items-center gap-2">
                  <select
                    value={reopenDays}
                    onChange={(e) => setReopenDays(Number(e.target.value))}
                    className="bg-[#0f1011] border border-[#23252a] text-[#d0d6e0] text-[12px] font-mono px-3 py-2 rounded-[6px] outline-none"
                  >
                    <option value={3}>+3 Days Deadline</option>
                    <option value={7}>+7 Days Deadline</option>
                    <option value={14}>+14 Days Deadline</option>
                    <option value={30}>+30 Days Deadline</option>
                  </select>
                  <button
                    onClick={handleReopenExpiredBounty}
                    disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                    className="btn-ghost text-[13px]"
                  >
                    Reopen Bounty to Marketplace
                  </button>
                </div>
              </div>
            </div>
          )}

          {isWorker && (
            <p className="text-[12px] text-[#eb5757] font-mono">
              You are assigned to this agreement, but the delivery deadline has expired. The client may reclaim funds or reopen the listing.
            </p>
          )}
        </div>
      )}

      {/* 3. Audited Deficient Banner: Creator Sovereign Override */}
      {agreement.status === "audited" && (
        <div className="border border-[#eb5757]/40 bg-[#161718] p-5 rounded-[12px] space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#eb5757]/15 border border-[#eb5757]/30 flex items-center justify-center shrink-0 mt-0.5">
              <ScaleIcon className="w-4 h-4 text-[#eb5757]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-[15px] text-[#ffffff]">
                Initial AI Audit: Criteria Deficiencies Detected
              </h4>
              <p className="text-[13px] text-[#8a8f98]">
                GenLayer validators audited the submitted delivery against criteria, but did not find 100% compliance. Autonomous 100% payout was paused.
              </p>
            </div>
          </div>

          {agreement.audit_report && (
            <div className="p-3.5 rounded-[8px] bg-[#0f1011] border border-[#23252a] text-[12px] font-mono text-[#d0d6e0] whitespace-pre-wrap">
              <span className="text-[10px] text-[#62666d] uppercase block mb-1">Validator Audit Report:</span>
              {agreement.audit_report}
            </div>
          )}

          {isClient && (
            <div className="pt-2 border-t border-[#23252a] space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#e4f222] block">
                  Creator Sovereign Override
                </span>
                <p className="text-[12px] text-[#8a8f98]">
                  Even if validators flagged deficiencies, you have the sovereign authority to accept the work and disburse full payment (100%) if you are satisfied. Alternatively, you can escalate to Dispute Court for proportional settlement.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleSovereignOverrideApprove}
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="px-4 py-2.5 rounded-[6px] bg-[#27a644] hover:bg-[#2fc452] text-[#ffffff] text-[13px] font-medium transition"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckIcon className="w-3.5 h-3.5" />
                    Override & Disburse 100% Escrow
                  </span>
                </button>

                <button
                  onClick={() => setShowDisputeForm(!showDisputeForm)}
                  className="px-4 py-2.5 rounded-[6px] bg-[#eb5757]/15 border border-[#eb5757]/30 text-[#eb5757] hover:bg-[#eb5757]/25 text-[13px] font-medium transition"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                    Escalate to Formal Dispute Court
                  </span>
                </button>
              </div>

              {showDisputeForm && (
                <form onSubmit={handleRaiseDispute} className="mt-4 p-4 rounded-[8px] border border-[#eb5757]/30 bg-[#0f1011] space-y-3">
                  <h4 className="font-mono text-[11px] uppercase text-[#eb5757]">
                    File Formal Dispute Complaint
                  </h4>
                  <textarea
                    required
                    rows={3}
                    placeholder="Specify the critical failures or unmet requirements to refer to the GenLayer court…"
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    className="input-box text-[13px]"
                  />
                  <button
                    type="submit"
                    disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                    className="px-4 py-2 rounded-[6px] bg-[#eb5757] hover:bg-[#ff6868] text-[#ffffff] text-[13px] font-medium transition"
                  >
                    Submit Dispute to Court Docket
                  </button>
                </form>
              )}
            </div>
          )}

          {isWorker && !isClient && (
            <div className="pt-2 border-t border-[#23252a] flex items-center justify-between gap-4">
              <p className="text-[12px] text-[#8a8f98]">
                Awaiting creator review. The creator can override to release full payment or escalate to dispute court.
              </p>
              <button
                onClick={() => setShowDisputeForm(!showDisputeForm)}
                className="px-3 py-1.5 rounded-[6px] border border-[#eb5757]/40 text-[#eb5757] hover:bg-[#eb5757]/10 text-[12px] font-mono transition shrink-0"
              >
                Raise Dispute
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Disputed Alert Banner */}
      {agreement.status === "disputed" && (
        <div className="border border-[#eb5757]/40 bg-[#0f1011] p-5 rounded-[12px] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#eb5757]/15 border border-[#eb5757]/30 flex items-center justify-center shrink-0">
              <ScaleIcon className="w-4 h-4 text-[#eb5757]" />
            </div>
            <div>
              <h4 className="font-medium text-[14px] text-[#ffffff]">
                Active Dispute Under Arbitration
              </h4>
              <p className="text-[12px] text-[#8a8f98] mt-0.5">
                The deliverable is currently disputed. Access the courtroom to inspect evidence, submit builder defense, or invoke the GenLayer AI magistrate.
              </p>
            </div>
          </div>
          <Link
            href={`/court/${agreement.id}`}
            className="px-4 py-2 rounded-[6px] bg-[#eb5757] hover:bg-[#ff6868] text-[#ffffff] text-[13px] font-medium transition shrink-0"
          >
            Enter Courtroom Docket →
          </Link>
        </div>
      )}

      {/* Case Details Card */}
      <div className="card-box space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#161718]/60 rounded-[8px] border border-[#23252a] text-[12px] font-mono">
          <div>
            <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Client</span>
            <span className="text-[#d0d6e0]">{shortAddress(agreement.client)}</span>
            {isClient && <span className="text-[10px] text-[#e4f222] block font-sans">(You)</span>}
          </div>
          <div>
            <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Contractor</span>
            {isOpenBounty ? (
              <span className="text-[#e4f222] font-semibold">Unclaimed (Public)</span>
            ) : (
              <span className="text-[#d0d6e0]">{shortAddress(agreement.worker)}</span>
            )}
            {isWorker && <span className="text-[10px] text-[#27a644] block font-sans">(You)</span>}
          </div>
          <div>
            <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Locked Escrow</span>
            <span className="font-medium text-[#ffffff]">{formatWeiToGen(agreement.reward)} GEN</span>
          </div>
          <div>
            <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Deadline</span>
            <span className={isDeadlinePassed ? "text-[#eb5757]" : "text-[#8a8f98]"}>
              {new Date(Number(agreement.deadline) * 1000).toLocaleDateString()}
              {isDeadlinePassed && " (Passed)"}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#62666d] mb-2">
            Contract Brief & Technical Scope
          </h3>
          <p className="text-[14px] text-[#d0d6e0] leading-relaxed whitespace-pre-wrap bg-[#161718]/40 p-4 rounded-[6px] border border-[#23252a]">
            {agreement.brief}
          </p>
        </div>

        <div>
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#62666d] mb-2">
            Acceptance Criteria ({criteriaList.length})
          </h3>
          <div className="space-y-2">
            {criteriaList.map((crit, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-[6px] bg-[#161718]/40 border border-[#23252a] text-[13px]"
              >
                <span className="font-mono text-[11px] text-[#e4f222]">{idx + 1}.</span>
                <span className="text-[#d0d6e0]">{crit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settled Settlement Box */}
        {agreement.status === "settled" && (
          <div className="border border-[#27a644]/40 bg-[#161718] p-5 rounded-[8px] text-[13px] space-y-3">
            <h4 className="font-medium text-[#27a644] flex items-center gap-1.5">
              <CheckIcon className="w-4 h-4 text-[#27a644]" />
              <span>Case Settled & Disbursed on GenLayer</span>
            </h4>
            <div className="grid grid-cols-2 gap-4 font-mono text-[12px]">
              <div>
                <span className="text-[10px] text-[#62666d] uppercase block">Contractor Payout:</span>
                <span className="font-medium text-[#27a644]">
                  {formatWeiToGen(agreement.worker_payout)} GEN
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#62666d] uppercase block">Client Refund:</span>
                <span className="font-medium text-[#eb5757]">
                  {formatWeiToGen(agreement.client_refund)} GEN
                </span>
              </div>
            </div>
            {agreement.audit_status === "passed" && (
              <p className="text-[12px] text-[#8a8f98] font-mono pt-2 border-t border-[#23252a] flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-[#27a644] shrink-0" />
                <span>Autonomous Initial AI Audit passed 100% of criteria. Escrow released automatically without dispute.</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ruling Verdict Card (if ruling recorded) */}
      {ruling && <RulingVerdictCard ruling={ruling} />}

      {/* Submitted Delivery Evidence Section */}
      {delivery && (
        <div className="card-box space-y-4">
          <h3 className="font-medium text-[16px] text-[#ffffff]">Submitted Delivery Evidence</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px] font-mono p-4 rounded-[8px] bg-[#161718]/60 border border-[#23252a]">
            <div>
              <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Repository:</span>
              <a
                href={delivery.repository_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#d0d6e0] hover:text-[#ffffff] underline break-all"
              >
                {delivery.repository_owner}/{delivery.repository_name}
              </a>
            </div>
            <div>
              <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Commit SHA:</span>
              <span className="text-[#8a8f98] break-all">{delivery.commit_sha}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Live Deployment:</span>
              <a
                href={delivery.deployment_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#e4f222] hover:underline break-all"
              >
                {delivery.deployment_url} ↗
              </a>
            </div>
            <div>
              <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Submitted At:</span>
              <span className="text-[#8a8f98]">
                {new Date(Number(delivery.delivered_at) * 1000).toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-mono uppercase text-[#62666d] mb-1.5">Contractor Summary</h4>
            <p className="text-[13px] p-3 rounded-[6px] bg-[#161718]/40 border border-[#23252a] text-[#d0d6e0]">
              {delivery.summary}
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-mono uppercase text-[#62666d] mb-1.5">Source Evidence Manifest</h4>
            <pre className="text-[12px] p-3 rounded-[6px] bg-[#161718]/40 border border-[#23252a] font-mono text-[#8a8f98] overflow-x-auto">
              {delivery.evidence_paths}
            </pre>
          </div>
        </div>
      )}

      {/* Two-Stage Action Panel: Delivered Status */}
      {agreement.status === "delivered" && (
        <div className="card-box space-y-6 border border-[#23252a]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#02b8cc]" />
              <h3 className="font-medium text-[16px] text-[#ffffff]">
                Stage 1: Autonomous AI Verification & Delivery Review
              </h3>
            </div>
            <p className="text-[13px] text-[#8a8f98]">
              Deliverable submitted. You can run the autonomous GenLayer AI audit. If 100% of criteria pass, escrow is released automatically to the builder with zero client delay.
            </p>
          </div>

          {/* Initial AI Verification Trigger */}
          <div className="p-4 rounded-[8px] bg-[#161718] border border-[#e4f222]/30 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-[14px] font-medium text-[#ffffff]">
                  Run Initial AI Verification (`verify_delivery`)
                </h4>
                <p className="text-[12px] text-[#8a8f98] mt-0.5">
                  Validators evaluate pinned code & live deployment. If 100% criteria PASS → instant full payout.
                </p>
              </div>
              <button
                onClick={handleRunInitialAudit}
                disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                className="btn-primary text-[13px] shrink-0"
              >
                <span className="flex items-center gap-1.5">
                  <ZapIcon className="w-3.5 h-3.5" />
                  Run Initial AI Audit
                </span>
              </button>
            </div>
          </div>

          {/* Alternative Client / Contractor Actions */}
          <div className="pt-2 border-t border-[#23252a] space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#62666d] block">
              Manual Review & Override Options
            </span>

            <div className="flex flex-wrap items-center gap-3">
              {isClient && (
                <button
                  onClick={handleSovereignOverrideApprove}
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="px-4 py-2 rounded-[6px] bg-[#27a644] hover:bg-[#2fc452] text-[#ffffff] text-[13px] font-medium transition"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckIcon className="w-3.5 h-3.5" />
                    Direct Approve & Disburse 100%
                  </span>
                </button>
              )}

              {(isClient || isWorker) && (
                <button
                  onClick={() => setShowDisputeForm(!showDisputeForm)}
                  className="px-4 py-2 rounded-[6px] bg-[#eb5757]/15 border border-[#eb5757]/30 text-[#eb5757] hover:bg-[#eb5757]/25 text-[13px] font-medium transition"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                    Raise Dispute Grievance
                  </span>
                </button>
              )}

              {isWorker && (
                <button
                  onClick={handleClaimTimeout}
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="btn-ghost text-[13px]"
                >
                  Claim Uncontested Timeout
                </button>
              )}
            </div>

            {/* Dispute Form */}
            {showDisputeForm && (
              <form onSubmit={handleRaiseDispute} className="mt-4 p-4 rounded-[8px] border border-[#eb5757]/30 bg-[#161718] space-y-3">
                <h4 className="font-mono text-[11px] uppercase text-[#eb5757]">
                  File Formal Dispute Complaint
                </h4>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail specifically which acceptance criteria failed or discrepancies encountered…"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  className="input-box text-[13px]"
                />
                <button
                  type="submit"
                  disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                  className="px-4 py-2 rounded-[6px] bg-[#eb5757] hover:bg-[#ff6868] text-[#ffffff] text-[13px] font-medium transition"
                >
                  Submit Dispute to GenLayer Court
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Disputed Status: Defense Filing Section */}
      {agreement.status === "disputed" && dispute && (
        <div className="card-box space-y-4 border border-[#eb5757]/30">
          <h3 className="font-medium text-[16px] text-[#ffffff]">Court Dispute Docket Evidence</h3>

          <div className="p-4 rounded-[8px] bg-[#161718] border border-[#eb5757]/20 space-y-2">
            <span className="text-[10px] font-mono uppercase text-[#eb5757] font-semibold block">
              Plaintiff Grievance Statement:
            </span>
            <p className="text-[13px] text-[#d0d6e0] whitespace-pre-wrap">{dispute.complaint}</p>
          </div>

          {/* Builder Counter-Defense Display / Form */}
          {dispute.defense ? (
            <div className="p-4 rounded-[8px] bg-[#161718] border border-[#27a644]/30 space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#27a644] font-semibold block">
                Builder Counter-Defense Statement:
              </span>
              <p className="text-[13px] text-[#d0d6e0] whitespace-pre-wrap">{dispute.defense}</p>
            </div>
          ) : isWorker ? (
            <div className="p-4 rounded-[8px] bg-[#161718] border border-[#e4f222]/30 space-y-3">
              <div className="space-y-1">
                <h4 className="text-[14px] font-medium text-[#ffffff]">
                  Submit Your Counter-Defense Statement
                </h4>
                <p className="text-[12px] text-[#8a8f98]">
                  Explain how your delivery satisfies the requirements before validators rule on the dispute.
                </p>
              </div>

              {!showDefenseForm ? (
                <button
                  onClick={() => setShowDefenseForm(true)}
                  className="btn-primary text-[13px]"
                >
                  Draft Defense Statement
                </button>
              ) : (
                <form onSubmit={handleSubmitDefense} className="space-y-3">
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide your defense, explaining specific code files, deployment tests, and why the complaint is unfounded…"
                    value={defense}
                    onChange={(e) => setDefense(e.target.value)}
                    className="input-box text-[13px]"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                      className="btn-primary text-[13px]"
                    >
                      Submit Defense to Docket
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDefenseForm(false)}
                      className="btn-ghost text-[13px]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-[#8a8f98] font-mono italic">
              No builder counter-defense statement submitted yet.
            </p>
          )}

          <div className="pt-2 flex justify-end">
            <Link
              href={`/court/${agreement.id}`}
              className="btn-primary text-[13px]"
            >
              Open Full Courtroom Docket →
            </Link>
          </div>
        </div>
      )}

      {/* Worker Submit Delivery Form (when assigned and active) */}
      {agreement.status === "assigned" && isWorker && !isDeadlinePassed && (
        <form onSubmit={handleSubmitDelivery} className="card-box space-y-4">
          <div>
            <h3 className="font-medium text-[16px] text-[#ffffff]">
              Submit Milestone Delivery Evidence
            </h3>
            <p className="text-[13px] text-[#8a8f98] mt-0.5">
              Submit your immutable GitHub commit permalink and live deployment to prove delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#d0d6e0] mb-1.5">
                GitHub Commit Permalink *
              </label>
              <input
                type="url"
                required
                placeholder="https://github.com/owner/repo/commit/sha40"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="input-box font-mono text-[12px]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#d0d6e0] mb-1.5">
                Live Public HTTPS Deployment *
              </label>
              <input
                type="url"
                required
                placeholder="https://my-app.example.com"
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                className="input-box font-mono text-[12px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#d0d6e0] mb-1.5">
              Summary of Work Delivered *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain how your delivery satisfies all the criteria..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="input-box text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#d0d6e0] mb-1.5">
              Source Evidence Paths (1 to 6 files, one per line) *
            </label>
            <textarea
              required
              rows={3}
              placeholder="src/app/page.tsx&#10;package.json"
              value={evidencePaths}
              onChange={(e) => setEvidencePaths(e.target.value)}
              className="input-box font-mono text-[12px]"
            />
          </div>

          <button
            type="submit"
            disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
            className="btn-primary w-full py-3 text-[14px]"
          >
            Submit Delivery for Initial AI Audit
          </button>
        </form>
      )}

      {/* Transaction Lifecycle Status Component */}
      <TransactionLifecycle status={txStatus} />
    </div>
  );
}
