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
});
