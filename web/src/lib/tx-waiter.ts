/**
 * tx-waiter.ts
 *
 * Centralized transaction receipt polling helper for GenLayer Studionet.
 * Strictly differentiates between:
 * - "finalized": Confirmed on Studionet consensus.
 * - "failed": Terminal rejection (FAILED, REVERTED, CANCELED).
 * - "timeout": Reached polling deadline without confirmed status (NEVER falsely reports finalized).
 */

export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  onPoll?: (attempt: number, status: string) => void;
}

export type TxWaitResult =
  | { status: "finalized"; hash: string; receipt?: Record<string, unknown> }
  | { status: "failed"; hash: string; error?: string }
  | { status: "timeout"; hash: string; lastSeenStatus?: string };

export async function waitForTransactionReceipt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { getTransaction: (args: { hash: any }) => Promise<any> },
  hash: string,
  options?: WaitOptions
): Promise<TxWaitResult> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const intervalMs = options?.intervalMs ?? 2_000;
  const maxAttempts = Math.max(1, Math.floor(timeoutMs / intervalMs));

  let lastStatus = "PENDING";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = (await client.getTransaction({ hash: hash as any })) as Record<string, unknown>;
      const st = String(tx?.statusName ?? tx?.status ?? "").toUpperCase();
      lastStatus = st || lastStatus;

      options?.onPoll?.(attempt, lastStatus);

      // ACCEPTED is a transitional consensus state (status 5), NEVER terminal finalization!
      if (st === "ACCEPTED" || st === "5") {
        options?.onPoll?.(attempt, "ACCEPTED (Awaiting Validator Finalization)");
        continue;
      }

      if (st === "FINALIZED" || st === "7") {
        // Verify on-chain execution success before confirming finality
        const executionResult = tx?.txExecutionResult;
        const executionResultName = String(tx?.txExecutionResultName ?? "").toUpperCase();
        const resultVal = tx?.result;
        const resultName = String(tx?.resultName ?? "").toUpperCase();

        if (
          executionResult === 2 ||
          executionResultName === "FINISHED_WITH_ERROR" ||
          resultVal === 2 ||
          resultVal === 7 ||
          resultName === "FAILURE"
        ) {
          return {
            status: "failed",
            hash,
            error: "Transaction consensus completed but execution failed/reverted on-chain.",
          };
        }

        const consensusData = tx?.consensus_data as Record<string, unknown> | undefined;
        if (consensusData?.leader_receipt) {
          const receipts = Array.isArray(consensusData.leader_receipt)
            ? (consensusData.leader_receipt as Record<string, unknown>[])
            : [consensusData.leader_receipt as Record<string, unknown>];

          for (const r of receipts) {
            const resStatus = String(
              (r?.result as Record<string, unknown> | undefined)?.status ?? ""
            ).toLowerCase();
            const execRes = String(r?.execution_result ?? "").toUpperCase();
            if (resStatus === "error" || execRes === "FINISHED_WITH_ERROR" || Boolean(r?.error)) {
              const errMsg =
                typeof r?.error === "string"
                  ? r.error
                  : typeof (r?.result as Record<string, unknown>)?.payload === "string"
                  ? ((r?.result as Record<string, unknown>).payload as string)
                  : "Transaction reverted on-chain during consensus execution.";
              return {
                status: "failed",
                hash,
                error: errMsg,
              };
            }
          }
        }

        return {
          status: "finalized",
          hash,
          receipt: tx,
        };
      }

      if (
        st === "FAILED" ||
        st === "REVERTED" ||
        st === "CANCELED" ||
        st === "8" ||
        st === "UNDETERMINED" ||
        st === "6" ||
        st === "VALIDATORS_TIMEOUT" ||
        st === "12" ||
        st === "LEADER_TIMEOUT" ||
        st === "13"
      ) {
        return {
          status: "failed",
          hash,
          error: `Transaction terminated with status ${st}`,
        };
      }
    } catch {
      // Transient network or RPC poll error - continue polling until timeout
    }
  }

  // Never assume finalized on timeout!
  return {
    status: "timeout",
    hash,
    lastSeenStatus: lastStatus,
  };
}
