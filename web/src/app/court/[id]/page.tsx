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
import { formatWeiToGen } from "@/lib/safety";
import { TransactionLifecycle, TxStatus } from "@/components/transaction-lifecycle";
import { RulingVerdictCard } from "@/components/ruling-verdict-card";
import { ScaleIcon } from "@/components/icons";
import { useWallet } from "@/lib/use-wallet";

export default function CourtTrialPage() {
  const params = useParams();
  const caseId = Number(params?.id);

  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [ruling, setRuling] = useState<RulingData | null>(null);
  const [loading, setLoading] = useState(true);

  const { account: userAccount } = useWallet();

  // Counter-defense state
  const [defense, setDefense] = useState("");
  const [showDefenseForm, setShowDefenseForm] = useState(false);

  const [txStatus, setTxStatus] = useState<TxStatus>({ state: "idle" });

  useEffect(() => {
    async function loadCase() {
      if (!caseId) return;
      setLoading(true);
      try {
        const a = (await readFinalContract("get_agreement", [caseId])) as AgreementData;
        setAgreement(a);

        try {
          const d = (await readFinalContract("get_delivery", [caseId])) as DeliveryData;
          setDelivery(d);
        } catch {}

        try {
          const disp = (await readFinalContract("get_dispute", [caseId])) as DisputeData;
          setDispute(disp);
        } catch {}

        if (a && a.ruling_id && Number(a.ruling_id) > 0) {
          try {
            const r = (await readFinalContract("get_ruling", [Number(a.ruling_id)])) as RulingData;
            setRuling(r);
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    }
    void loadCase();
  }, [caseId]);

  async function handleAdjudicate() {
    if (!window.ethereum || !userAccount) {
      alert("Please connect your wallet to call the GenLayer magistrate.");
      return;
    }

    setTxStatus({
      state: "submitting",
      message: "Convening GenLayer validator jury and fetching evidence…",
    });

    try {
      const client = createChainSettleClient(userAccount as `0x${string}`);
      const hash = await client.writeContract({
        address: chainSettleContractAddress as `0x${string}`,
        functionName: "adjudicate_dispute",
        args: [caseId],
        value: BigInt(0),
      });

      const hashStr = String(hash);
      setTxStatus({
        state: "pending",
        hash: hashStr,
        message: "Validators analyzing evidence & reaching Equivalence Consensus…",
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
          message: "Adjudication transaction failed on GenLayer.",
        });
        return;
      }

      setTxStatus({
        state: "finalized",
        hash: hashStr,
        message: "Consensus ruling finalized! Funds disbursed on-chain.",
      });
      setTimeout(() => window.location.reload(), 2500);
    } catch (err) {
      setTxStatus({
        state: "failed",
        error: err instanceof Error ? err.message : "Adjudication failed.",
      });
    }
  }

  async function handleSubmitDefense(e: React.FormEvent) {
    e.preventDefault();
    if (!window.ethereum || !userAccount) {
      alert("Please connect your wallet first.");
      return;
    }
    if (defense.trim().length < 10) {
      alert("Defense statement must be at least 10 characters.");
      return;
    }

    setTxStatus({
      state: "submitting",
      message: "Submitting builder defense to GenLayer docket…",
    });

    try {
      const client = createChainSettleClient(userAccount as `0x${string}`);
      const hash = await client.writeContract({
        address: chainSettleContractAddress as `0x${string}`,
        functionName: "submit_dispute_defense",
        args: [caseId, defense.trim()],
        value: BigInt(0),
      });

      const hashStr = String(hash);
      setTxStatus({
        state: "pending",
        hash: hashStr,
        message: "Submitting defense to GenLayer validators…",
      });

      let defenseFailed = false;
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
            defenseFailed = true;
            break;
          }
        } catch {}
      }

      if (defenseFailed) {
        setTxStatus({
          state: "failed",
          hash: hashStr,
          message: "Failed to record defense statement on GenLayer.",
        });
        return;
      }

      setTxStatus({
        state: "finalized",
        hash: hashStr,
        message: "Defense statement recorded on-chain!",
      });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setTxStatus({
        state: "failed",
        error: err instanceof Error ? err.message : "Failed to submit defense.",
      });
    }
  }

  if (loading) {
    return (
      <div className="card-box text-center py-16 text-[#8a8f98] font-mono text-[13px]">
        Loading trial evidence from GenLayer Studionet…
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="card-box text-center py-16 space-y-3">
        <p className="text-[16px] font-medium text-[#ffffff]">Trial docket not found</p>
        <Link href="/court" className="btn-ghost inline-flex text-[12px]">
          ← Back to Court Docket
        </Link>
      </div>
    );
  }

  const userAddr = (userAccount || "").toLowerCase().trim();
  const clientAddr = (agreement.client || "").toLowerCase().trim();
  const workerAddr = (agreement.worker || "").toLowerCase().trim();

  const isDisputed = agreement.status === "disputed";
  const criteriaList = agreement.criteria.split("\n").filter(Boolean);
  const isWorker = Boolean(userAddr && workerAddr && userAddr === workerAddr);
  const isClient = Boolean(userAddr && clientAddr && userAddr === clientAddr);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Courtroom Header */}
      <div className="card-box border border-[#23252a] bg-[#0f1011] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono uppercase text-[#eb5757]">
                TRIAL DOCKET #{caseId.toString().padStart(3, "0")}
              </span>
              <span className={`badge badge-${agreement.status}`}>{agreement.status}</span>
              {isClient && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#e4f222]/15 border border-[#e4f222]/30 text-[#e4f222]">
                  Claimant (You)
                </span>
              )}
              {isWorker && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#27a644]/15 border border-[#27a644]/30 text-[#27a644]">
                  Defendant (You)
                </span>
              )}
            </div>
            <h1 className="text-2xl font-medium text-[#ffffff] tracking-tight">
              {agreement.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/agreements/${agreement.id}`}
              className="text-[12px] font-mono text-[#8a8f98] hover:text-[#ffffff] transition-colors"
            >
              View Agreement
            </Link>
            <Link
              href="/court"
              className="text-[12px] font-mono text-[#8a8f98] hover:text-[#ffffff] transition-colors"
            >
              ← Court Docket
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#23252a] text-[12px] font-mono">
          <div>
            <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Claimant (Client)</span>
            <span className="text-[#d0d6e0]">{shortAddress(agreement.client)}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Defendant (Contractor)</span>
            <span className="text-[#d0d6e0]">{shortAddress(agreement.worker)}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Disputed Escrow</span>
            <span className="font-medium text-[#ffffff]">{formatWeiToGen(agreement.reward)} GEN</span>
          </div>
          <div>
            <span className="text-[10px] text-[#62666d] uppercase block mb-0.5">Defense Filed</span>
            <span className={dispute?.defense ? "text-[#27a644]" : "text-[#eb5757]"}>
              {dispute?.defense ? "Yes" : "Pending"}
            </span>
          </div>
        </div>
      </div>

      {/* RULING VERDICT DISPLAY (If final ruling exists) */}
      {ruling && <RulingVerdictCard ruling={ruling} />}

      {/* ADJUDICATE ACTION HERO (If under active dispute) */}
      {isDisputed && (
        <div className="card-box border border-[#e4f222]/30 bg-[#0f1011] p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#e4f222] animate-pulse" />
              <h2 className="text-[16px] font-medium text-[#ffffff]">
                Convene GenLayer Validator Magistrate Jury
              </h2>
            </div>
            <p className="text-[13px] text-[#8a8f98] leading-relaxed">
              Both parties file their evidence and grievance statements. Any network participant can trigger the Intelligent Contract&apos;s Equivalence Principle adjudication. Validators independently fetch the commit-pinned source files, audit the live deployment, evaluate the claimant complaint and contractor defense, and disburse proportional Basis Points settlement.
            </p>
          </div>

          {/* Primary Action Button (Acid Lime) */}
          <button
            onClick={handleAdjudicate}
            disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
            className="btn-primary w-full py-3.5 text-[14px]"
          >
            {txStatus.state === "submitting" || txStatus.state === "pending" ? (
              "Magistrate Jury in Session (Consensus Evaluation)…"
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ScaleIcon className="w-4 h-4" />
                Adjudicate Dispute via GenLayer AI
              </span>
            )}
          </button>

          <TransactionLifecycle status={txStatus} />
        </div>
      )}

      {/* EVIDENCE DOCKET (Side-by-Side Comparison) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: The Contract Terms & Client Dispute */}
        <div className="card-box space-y-4">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#62666d] border-b border-[#23252a] pb-2">
            Plaintiff Docket (Client)
          </h3>

          <div>
            <h4 className="text-[12px] font-medium text-[#d0d6e0] mb-2">Contract Acceptance Criteria</h4>
            <div className="space-y-1.5">
              {criteriaList.map((crit, idx) => (
                <div key={idx} className="p-2.5 rounded-[6px] bg-[#161718]/40 border border-[#23252a] text-[12px] font-mono">
                  <span className="text-[#e4f222] font-medium">{idx + 1}.</span>{" "}
                  <span className="text-[#d0d6e0]">{crit}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[12px] font-medium text-[#eb5757] mb-2">Formal Dispute Grievance</h4>
            <p className="text-[13px] p-3 rounded-[6px] bg-[#161718] border border-[#eb5757]/30 text-[#d0d6e0] leading-relaxed whitespace-pre-wrap">
              {dispute?.complaint ?? "Complaint statement unavailable."}
            </p>
          </div>
        </div>

        {/* Right: The Worker's Deliverable Evidence & Counter-Defense */}
        <div className="card-box space-y-4">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#62666d] border-b border-[#23252a] pb-2">
            Defense Docket (Contractor)
          </h3>

          {/* Builder Counter-Defense Statement */}
          {dispute?.defense ? (
            <div>
              <h4 className="text-[12px] font-medium text-[#27a644] mb-2">
                Builder Counter-Defense Statement
              </h4>
              <p className="text-[13px] p-3 rounded-[6px] bg-[#161718] border border-[#27a644]/30 text-[#d0d6e0] leading-relaxed whitespace-pre-wrap">
                {dispute.defense}
              </p>
            </div>
          ) : isWorker && isDisputed ? (
            <div className="p-3.5 rounded-[8px] bg-[#161718] border border-[#e4f222]/30 space-y-3">
              <div className="space-y-1">
                <h4 className="text-[13px] font-medium text-[#ffffff]">
                  File Your Rebuttal Statement
                </h4>
                <p className="text-[12px] text-[#8a8f98]">
                  Explain how your deliverables meet the specifications before the validators adjudicate.
                </p>
              </div>

              {!showDefenseForm ? (
                <button
                  onClick={() => setShowDefenseForm(true)}
                  className="btn-primary text-[12px]"
                >
                  Draft Defense Rebuttal
                </button>
              ) : (
                <form onSubmit={handleSubmitDefense} className="space-y-2.5">
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide your defense and evidence details for the GenLayer magistrates…"
                    value={defense}
                    onChange={(e) => setDefense(e.target.value)}
                    className="input-box text-[13px]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={txStatus.state === "submitting" || txStatus.state === "pending"}
                      className="btn-primary text-[12px]"
                    >
                      Submit Defense
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDefenseForm(false)}
                      className="btn-ghost text-[12px]"
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

          {delivery ? (
            <div className="space-y-3 text-[12px] pt-2 border-t border-[#23252a]">
              <div>
                <span className="text-[10px] font-mono text-[#62666d] uppercase block mb-0.5">Pinned Commit SHA</span>
                <span className="font-mono text-[#8a8f98] break-all">{delivery.commit_sha}</span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#62666d] uppercase block mb-0.5">Repository Permalink</span>
                <a
                  href={delivery.repository_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[#d0d6e0] hover:text-[#ffffff] underline break-all"
                >
                  {delivery.repository_url}
                </a>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#62666d] uppercase block mb-0.5">Live HTTPS Deployment</span>
                <a
                  href={delivery.deployment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[#e4f222] hover:underline break-all"
                >
                  {delivery.deployment_url} ↗
                </a>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#62666d] uppercase block mb-0.5">Contractor Summary</span>
                <p className="p-2.5 rounded-[6px] bg-[#161718]/40 border border-[#23252a] text-[#d0d6e0]">
                  {delivery.summary}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#62666d] uppercase block mb-0.5">Evidence Manifest</span>
                <pre className="p-2 rounded-[6px] bg-[#161718]/40 border border-[#23252a] font-mono text-[11px] text-[#8a8f98] overflow-x-auto">
                  {delivery.evidence_paths}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#8a8f98] italic">No delivery submitted.</p>
          )}
        </div>
      </div>
    </div>
  );
}
