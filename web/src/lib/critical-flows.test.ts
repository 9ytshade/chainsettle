import { describe, expect, it } from "vitest";
import { formatGenDisplay, formatWeiToGen, parseGenToWei } from "./safety";
import { shortAddress } from "./genlayer";

describe("1. Basis Points Math & Value Conservation Invariant", () => {
  function calculateBpsSplit(rewardWei: bigint, basisPoints: number) {
    if (basisPoints < 0 || basisPoints > 10_000) {
      throw new Error("Basis points out of range");
    }
    const workerPayout = (rewardWei * BigInt(basisPoints)) / BigInt(10_000);
    const clientRefund = rewardWei - workerPayout;
    return { workerPayout, clientRefund };
  }

  it("conserves 100% of value with zero dust loss across diverse inputs", () => {
    const testCases = [
      { reward: BigInt(100) * BigInt(10 ** 18), bps: 2360 }, // 23.6%
      { reward: BigInt(50) * BigInt(10 ** 18), bps: 5000 },  // 50.0%
      { reward: BigInt(86) * BigInt(10 ** 18), bps: 8600 },  // 86.0%
      { reward: BigInt(100) * BigInt(10 ** 18), bps: 10000 }, // 100%
      { reward: BigInt(100) * BigInt(10 ** 18), bps: 0 },     // 0%
      { reward: BigInt(999999999999999999n), bps: 3333 },     // Odd prime wei
      { reward: BigInt(1), bps: 5000 },                      // 1 wei boundary
    ];

    for (const { reward, bps } of testCases) {
      const { workerPayout, clientRefund } = calculateBpsSplit(reward, bps);
      expect(workerPayout + clientRefund).toBe(reward);
      expect(workerPayout).toBeGreaterThanOrEqual(BigInt(0));
      expect(clientRefund).toBeGreaterThanOrEqual(BigInt(0));
    }
  });

  it("accurately derives 23.6%, 50%, and 86% case payouts", () => {
    const reward = parseGenToWei("100"); // 100 GEN

    // Case A: 23.6% (2,360 BPS)
    const caseA = calculateBpsSplit(reward, 2360);
    expect(formatWeiToGen(caseA.workerPayout)).toBe("23.6");
    expect(formatWeiToGen(caseA.clientRefund)).toBe("76.4");

    // Case B: 50.0% (5,000 BPS)
    const caseB = calculateBpsSplit(reward, 5000);
    expect(formatWeiToGen(caseB.workerPayout)).toBe("50");
    expect(formatWeiToGen(caseB.clientRefund)).toBe("50");

    // Case C: 86.0% (8,600 BPS)
    const caseC = calculateBpsSplit(reward, 8600);
    expect(formatWeiToGen(caseC.workerPayout)).toBe("86");
    expect(formatWeiToGen(caseC.clientRefund)).toBe("14");
  });
});

describe("2. Newest-First Pagination & Discovery Slicing Logic", () => {
  function computePaginationSlice(totalCount: number, page: number, pageSize: number) {
    if (totalCount <= 0) {
      return { ids: [], totalPages: 1, safePage: 1 };
    }
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startId = totalCount - (safePage - 1) * pageSize;
    const endId = Math.max(1, startId - pageSize + 1);

    const ids: number[] = [];
    for (let i = startId; i >= endId; i--) {
      ids.push(i);
    }
    return { ids, totalPages, safePage };
  }

  it("correctly slices newest records first on Page 1", () => {
    const { ids, totalPages, safePage } = computePaginationSlice(100, 1, 10);
    expect(totalPages).toBe(10);
    expect(safePage).toBe(1);
    expect(ids).toEqual([100, 99, 98, 97, 96, 95, 94, 93, 92, 91]);
  });

  it("correctly slices middle page (Page 2)", () => {
    const { ids, safePage } = computePaginationSlice(100, 2, 10);
    expect(safePage).toBe(2);
    expect(ids).toEqual([90, 89, 88, 87, 86, 85, 84, 83, 82, 81]);
  });

  it("correctly slices the last page with partial count (Page 3 of 25 records)", () => {
    const { ids, totalPages, safePage } = computePaginationSlice(25, 3, 10);
    expect(totalPages).toBe(3);
    expect(safePage).toBe(3);
    expect(ids).toEqual([5, 4, 3, 2, 1]);
  });

  it("handles empty and boundary counts safely", () => {
    expect(computePaginationSlice(0, 1, 10).ids).toEqual([]);
    expect(computePaginationSlice(1, 1, 10).ids).toEqual([1]);
    // Page requested exceeds total pages
    const clamped = computePaginationSlice(5, 99, 10);
    expect(clamped.safePage).toBe(1);
    expect(clamped.ids).toEqual([5, 4, 3, 2, 1]);
  });
});

describe("3. Partial RPC Failure Tracking & Resilience", () => {
  it("isolates failed IDs without discarding successful reads", () => {
    const targetIds = [10, 9, 8, 7, 6];
    const simulatedRpcFailures = new Set([8, 6]);

    const agreements: { id: number; title: string }[] = [];
    const failedIds: number[] = [];

    for (const id of targetIds) {
      if (simulatedRpcFailures.has(id)) {
        failedIds.push(id);
      } else {
        agreements.push({ id, title: `Agreement #${id}` });
      }
    }

    expect(agreements.map((a) => a.id)).toEqual([10, 9, 7]);
    expect(failedIds).toEqual([8, 6]);
  });

  it("recovers missing IDs on retry and preserves descending order", () => {
    const existing = [
      { id: 10, title: "Agreement #10" },
      { id: 9, title: "Agreement #9" },
      { id: 7, title: "Agreement #7" },
    ];
    const recovered = [
      { id: 8, title: "Agreement #8" },
      { id: 6, title: "Agreement #6" },
    ];

    const mergedMap = new Map<number, { id: number; title: string }>();
    for (const item of [...existing, ...recovered]) {
      mergedMap.set(item.id, item);
    }
    const finalSorted = Array.from(mergedMap.values()).sort((a, b) => b.id - a.id);

    expect(finalSorted.map((a) => a.id)).toEqual([10, 9, 8, 7, 6]);
  });
});

describe("4. Deadline Timezone & UTC Conversion Math", () => {
  it("correctly converts local date string to integer UTC timestamp", () => {
    const dateInput = "2026-10-15T18:00";
    const parsed = new Date(dateInput);
    const unixSeconds = Math.floor(parsed.getTime() / 1000);

    expect(Number.isSafeInteger(unixSeconds)).toBe(true);
    expect(unixSeconds).toBeGreaterThan(0);
    // UTC formatting string is valid
    const utcString = parsed.toUTCString();
    expect(utcString).toContain("GMT");
  });

  it("correctly calculates duration seconds from day offsets", () => {
    const days = 14;
    const durationSeconds = days * 86400;
    expect(durationSeconds).toBe(1209600);
  });
});

describe("5. Address & Network Safety", () => {
  it("formats short addresses safely", () => {
    expect(shortAddress("0xD94f893C237551ca887991f0725aa96fc746B86F")).toBe("0xD94f…B86F");
    expect(shortAddress("")).toBe("");
    expect(shortAddress("0x123")).toBe("0x123");
  });

  it("formats GEN display balances with proper precision", () => {
    expect(formatGenDisplay(BigInt(10 ** 18))).toBe("1");
    expect(formatGenDisplay(BigInt(0))).toBe("0");
    expect(formatGenDisplay(BigInt(25) * BigInt(10 ** 17))).toBe("2.5");
  });
});

describe("6. Terminal Polling State Machine", () => {
  it("identifies terminal states correctly", () => {
    const isTerminal = (status: string) => {
      return status === "FINALIZED" || status === "FAILED" || status === "REVERTED" || status === "CANCELED";
    };

    expect(isTerminal("FINALIZED")).toBe(true);
    expect(isTerminal("FAILED")).toBe(true);
    expect(isTerminal("REVERTED")).toBe(true);
    expect(isTerminal("CANCELED")).toBe(true);
    expect(isTerminal("PENDING")).toBe(false);
    expect(isTerminal("ACCEPTED")).toBe(false); // ACCEPTED is intermediate, not terminal!
    expect(isTerminal("SUBMITTED")).toBe(false);
  });
});
