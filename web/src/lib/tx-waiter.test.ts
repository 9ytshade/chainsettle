import { describe, it, expect, vi } from "vitest";
import { waitForTransactionReceipt } from "./tx-waiter";

describe("waitForTransactionReceipt", () => {
  it("resolves finalized status when statusName is FINALIZED", async () => {
    const mockClient = {
      getTransaction: vi
        .fn()
        .mockResolvedValueOnce({ statusName: "PENDING" })
        .mockResolvedValueOnce({ statusName: "FINALIZED", blockNumber: 1234 }),
    };

    const res = await waitForTransactionReceipt(mockClient, "0xabc", {
      intervalMs: 10,
      timeoutMs: 100,
    });

    expect(res.status).toBe("finalized");
    if (res.status === "finalized") {
      expect(res.hash).toBe("0xabc");
      expect(res.receipt?.statusName).toBe("FINALIZED");
    }
  });

  it("resolves failed status when transaction status is REVERTED or FAILED", async () => {
    const mockClient = {
      getTransaction: vi
        .fn()
        .mockResolvedValueOnce({ statusName: "PENDING" })
        .mockResolvedValueOnce({ statusName: "FAILED" }),
    };

    const res = await waitForTransactionReceipt(mockClient, "0xdef", {
      intervalMs: 10,
      timeoutMs: 100,
    });

    expect(res.status).toBe("failed");
    if (res.status === "failed") {
      expect(res.hash).toBe("0xdef");
      expect(res.error).toContain("FAILED");
    }
  });

  it("resolves timeout status without ever falsely marking finalized when polling window expires", async () => {
    const mockClient = {
      getTransaction: vi.fn().mockResolvedValue({ statusName: "PENDING" }),
    };

    const res = await waitForTransactionReceipt(mockClient, "0x123", {
      intervalMs: 10,
      timeoutMs: 40,
    });

    expect(res.status).toBe("timeout");
    if (res.status === "timeout") {
      expect(res.hash).toBe("0x123");
      expect(res.lastSeenStatus).toBe("PENDING");
    }
  });

  it("survives transient RPC exceptions and completes when transaction finalizes", async () => {
    const mockClient = {
      getTransaction: vi
        .fn()
        .mockRejectedValueOnce(new Error("RPC 503 Service Unavailable"))
        .mockResolvedValueOnce({ statusName: "FINALIZED" }),
    };

    const res = await waitForTransactionReceipt(mockClient, "0x456", {
      intervalMs: 10,
      timeoutMs: 100,
    });

    expect(res.status).toBe("finalized");
  });

  it("never treats ACCEPTED as finalized and keeps waiting until FINALIZED", async () => {
    const mockClient = {
      getTransaction: vi
        .fn()
        .mockResolvedValueOnce({ statusName: "ACCEPTED" })
        .mockResolvedValueOnce({ statusName: "ACCEPTED" })
        .mockResolvedValueOnce({ statusName: "FINALIZED" }),
    };

    const res = await waitForTransactionReceipt(mockClient, "0x789", {
      intervalMs: 10,
      timeoutMs: 100,
    });

    expect(res.status).toBe("finalized");
    expect(mockClient.getTransaction).toHaveBeenCalledTimes(3);
  });

  it("fails when FINALIZED transaction had an on-chain execution revert", async () => {
    const mockClient = {
      getTransaction: vi.fn().mockResolvedValueOnce({
        statusName: "FINALIZED",
        txExecutionResult: 2,
        txExecutionResultName: "FINISHED_WITH_ERROR",
      }),
    };

    const res = await waitForTransactionReceipt(mockClient, "0xbad", {
      intervalMs: 10,
      timeoutMs: 100,
    });

    expect(res.status).toBe("failed");
    if (res.status === "failed") {
      expect(res.error).toContain("failed/reverted");
    }
  });

  it("fails when FINALIZED transaction had a leader receipt error", async () => {
    const mockClient = {
      getTransaction: vi.fn().mockResolvedValueOnce({
        statusName: "FINALIZED",
        consensus_data: {
          leader_receipt: [
            {
              result: { status: "error", payload: "Agreement deadline has passed" },
            },
          ],
        },
      }),
    };

    const res = await waitForTransactionReceipt(mockClient, "0xerr", {
      intervalMs: 10,
      timeoutMs: 100,
    });

    expect(res.status).toBe("failed");
    if (res.status === "failed") {
      expect(res.error).toBe("Agreement deadline has passed");
    }
  });
});
