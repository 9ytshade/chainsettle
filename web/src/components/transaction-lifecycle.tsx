"use client";

import { useState } from "react";
import { genLayerTransactionUrl } from "@/lib/genlayer";
import { CheckIcon, XIcon, CopyIcon } from "@/components/icons";

export interface TxStatus {
  state: "idle" | "submitting" | "pending" | "finalized" | "failed";
  hash?: string;
  error?: string;
  message?: string;
}

export function TransactionLifecycle({ status }: { status: TxStatus }) {
  const [copiedHash, setCopiedHash] = useState(false);

  if (status.state === "idle") return null;

  const isFinalized = status.state === "finalized";
  const isFailed = status.state === "failed";

  return (
    <div
      className={`mt-4 p-4 rounded-[6px] border text-[13px] transition-all bg-[#0f1011] ${
        isFinalized
          ? "border-[#27a644]/40 text-[#ffffff]"
          : isFailed
          ? "border-[#eb5757]/40 text-[#ffffff]"
          : "border-[#23252a] text-[#d0d6e0]"
      }`}
    >
      <div className="flex items-center gap-3">
        {status.state === "submitting" && (
          <span className="w-2.5 h-2.5 rounded-full bg-[#d0d6e0] animate-ping" />
        )}
        {status.state === "pending" && (
          <span className="w-3 h-3 rounded-full border-2 border-[#e4f222] border-t-transparent animate-spin shrink-0" />
        )}
        {isFinalized && (
          <span className="w-5 h-5 rounded-full bg-[#27a644]/20 text-[#27a644] flex items-center justify-center shrink-0">
            <CheckIcon className="w-3 h-3 text-[#27a644]" />
          </span>
        )}
        {isFailed && (
          <span className="w-5 h-5 rounded-full bg-[#eb5757]/20 text-[#eb5757] flex items-center justify-center shrink-0">
            <XIcon className="w-3 h-3 text-[#eb5757]" />
          </span>
        )}

        <div className="flex-1">
          <p className="font-medium text-[13px] text-[#ffffff]">
            {status.state === "submitting" && "Transmitting payload to GenLayer Studionet…"}
            {status.state === "pending" && "Validators executing consensus & Equivalence verification…"}
            {isFinalized && "Transaction confirmed & finalized on Studionet"}
            {isFailed && "Transaction failed"}
          </p>
          {status.message && (
            <p className="text-[12px] text-[#8a8f98] mt-0.5">{status.message}</p>
          )}
          {status.error && (
            <p className="text-[11px] font-mono text-[#eb5757] mt-1 break-all">
              {status.error}
            </p>
          )}
        </div>

        {status.hash && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(status.hash!);
                setCopiedHash(true);
                setTimeout(() => setCopiedHash(false), 2000);
              }}
              title="Copy transaction hash to clipboard"
              className="text-[11px] font-mono text-[#8a8f98] hover:text-[#ffffff] px-2.5 py-1 rounded bg-[#161718] border border-[#23252a] hover:border-[#383a42] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedHash ? (
                <>
                  <CheckIcon className="w-3 h-3 text-[#27a644]" />
                  <span className="text-[#27a644]">Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3 h-3 text-[#8a8f98]" />
                  <span>Copy Hash</span>
                </>
              )}
            </button>
            <a
              href={genLayerTransactionUrl(status.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-[#8a8f98] hover:text-[#ffffff] px-2.5 py-1 rounded bg-[#161718] border border-[#23252a] hover:border-[#383a42] transition-colors flex items-center gap-1"
            >
              <span>Explorer</span>
              <span>↗</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
