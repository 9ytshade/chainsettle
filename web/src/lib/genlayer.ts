import { abi, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import type { CalldataEncodable } from "genlayer-js/types";
import { fromHex, toHex, zeroAddress } from "viem";

export const CHAINSETTLE_NETWORK = {
  id: studionet.id,
  name: studionet.name,
  slug: "studionet",
} as const;

export const chainSettleChainId = studionet.id;
export const genLayerExplorerUrl = "https://explorer-studio.genlayer.com";

export function genLayerTransactionUrl(hash: string) {
  return `${genLayerExplorerUrl}/tx/${hash}`;
}

export const chainSettleContractAddress =
  process.env.NEXT_PUBLIC_CHAINSETTLE_CONTRACT_ADDRESS ??
  "0x29a246a021F02D9A0b1f18a7DCc695d7Ee7643E5";

export { TransactionHashVariant };

export function createChainSettleClient(account?: `0x${string}`) {
  return createClient({
    chain: studionet,
    ...(account ? { account } : {}),
  });
}

function isTransportFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|network error|failed to fetch|timeout/i.test(message);
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  }
  if (value instanceof Uint8Array) return toHex(value);
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([key, entry]) => [String(key), toJsonSafe(entry)])
    );
  }
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    const bytes = (value as { bytes?: unknown }).bytes;
    if (bytes instanceof Uint8Array) return toHex(bytes);
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toJsonSafe(entry)])
    );
  }
  return value;
}

export async function quietReadContract(functionName: string, args: CalldataEncodable[]) {
  const calldata = abi.transactions.serialize([
    abi.calldata.encode(abi.calldata.makeCalldataObject(functionName, args, undefined)),
    false,
  ]);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(studionet.rpcUrls.default.http[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "gen_call",
        params: [
          {
            type: "read",
            to: chainSettleContractAddress,
            from: zeroAddress,
            data: calldata,
            transaction_hash_variant: TransactionHashVariant.LATEST_FINAL,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`GenLayer RPC returned HTTP ${response.status}.`);
    const payload = (await response.json()) as { error?: { message?: string }; result?: unknown };
    if (payload.error) throw new Error(payload.error.message ?? "GenLayer RPC rejected the read.");
    const result = payload.result;
    if (typeof result !== "string") throw new Error("Unexpected GenLayer RPC response.");
    return toJsonSafe(abi.calldata.decode(fromHex(`0x${result}`, "bytes")));
  } finally {
    clearTimeout(timeout);
  }
}

export async function readFinalContract(
  functionName: string,
  args: CalldataEncodable[]
): Promise<unknown> {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await quietReadContract(functionName, args);
    } catch (error) {
      if (!isTransportFailure(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error("Unable to reach GenLayer RPC after retrying.");
}

export async function checkContractVersionCompatibility(): Promise<{
  compatible: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const version = await readFinalContract("get_contract_version", []);
    if (typeof version === "string" && (version === "1.2.0" || version === "1.1.0" || version === "1.0.0")) {
      return { compatible: true, version };
    }
    const versionStr = typeof version === "string" ? version : String(version ?? "unknown");
    return {
      compatible: false,
      version: versionStr,
      error: `Contract is version "${versionStr}", but ChainSettle requires version "1.2.0".`,
    };
  } catch (error) {
    return {
      compatible: false,
      error: error instanceof Error ? error.message : "Unable to verify contract version.",
    };
  }
}

export interface AgreementData {
  id: number;
  client: string;
  worker: string;
  title: string;
  brief: string;
  criteria: string;
  reward: string | number;
  deadline: number;
  review_window: number;
  status: "open" | "assigned" | "delivered" | "audited" | "disputed" | "settled" | "cancelled";
  worker_payout: string | number;
  client_refund: string | number;
  ruling_id: number;
  audit_status?: "none" | "pending" | "passed" | "deficient";
  audit_report?: string;
  audit_attempt?: number;
}

export interface DeliveryData {
  agreement_id: number;
  repository_url: string;
  repository_owner: string;
  repository_name: string;
  commit_sha: string;
  evidence_paths: string;
  deployment_url: string;
  summary: string;
  delivered_at: number;
  delivery_version?: number;
}

export interface DisputeData {
  agreement_id: number;
  disputant: string;
  complaint: string;
  defense?: string;
  disputed_at: number;
  defense_deadline?: number;
  defense_submitted?: boolean;
  defense_waived?: boolean;
  adjudication_count: number;
}

export interface RulingData {
  id: number;
  agreement_id: number;
  verdict: "FULL_PAYOUT_WORKER" | "PARTIAL_SETTLEMENT" | "FULL_REFUND_CLIENT" | "UNDETERMINED";
  worker_basis_points?: number;
  worker_percentage: number;
  worker_percentage_display?: string;
  criteria_results: string;
  criteria_report: string;
  calculation_breakdown?: string;
  reasoning: string;
  evidence_note: string;
  ruled_at: number;
}

export interface DiscoveryResult {
  agreements: AgreementData[];
  failedIds: number[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function discoverFinalAgreements(
  page = 1,
  pageSize = 20
): Promise<DiscoveryResult> {
  try {
    const rawCount = await readFinalContract("get_agreement_count", []);
    const count = typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount ?? 0);
    if (!Number.isSafeInteger(count) || count <= 0) {
      return { agreements: [], failedIds: [], totalCount: 0, page: 1, pageSize, totalPages: 1 };
    }

    const totalPages = Math.max(1, Math.ceil(count / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);

    const startId = count - (safePage - 1) * pageSize;
    const endId = Math.max(1, startId - pageSize + 1);

    const ids: number[] = [];
    for (let i = startId; i >= endId; i--) {
      ids.push(i);
    }

    const agreements: AgreementData[] = [];
    const failedIds: number[] = [];

    for (const id of ids) {
      try {
        const item = (await readFinalContract("get_agreement", [id])) as AgreementData;
        if (item) {
          agreements.push(item);
        } else {
          failedIds.push(id);
        }
      } catch {
        failedIds.push(id);
      }
    }

    return {
      agreements,
      failedIds,
      totalCount: count,
      page: safePage,
      pageSize,
      totalPages,
    };
  } catch {
    return {
      agreements: [],
      failedIds: [],
      totalCount: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }
}

export async function retryFailedAgreements(
  failedIds: number[]
): Promise<{ recovered: AgreementData[]; stillFailed: number[] }> {
  const recovered: AgreementData[] = [];
  const stillFailed: number[] = [];

  for (const id of failedIds) {
    try {
      const item = (await readFinalContract("get_agreement", [id])) as AgreementData;
      if (item) {
        recovered.push(item);
      } else {
        stillFailed.push(id);
      }
    } catch {
      stillFailed.push(id);
    }
  }

  return { recovered, stillFailed };
}

export function shortAddress(address: string) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
