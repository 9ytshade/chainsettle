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

      if (st === "FINALIZED" || st === "ACCEPTED") {
        return {
          status: "finalized",
          hash,
          receipt: tx,
        };
      }

      if (st === "FAILED" || st === "REVERTED" || st === "CANCELED") {
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
