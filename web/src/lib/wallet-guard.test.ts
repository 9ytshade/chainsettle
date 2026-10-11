import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isUserRejection, formatWalletErrorMessage, ensureStudionetNetwork } from "./wallet-guard";

describe("wallet-guard", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  describe("isUserRejection", () => {
    it("detects code 4001 user rejection", () => {
      expect(isUserRejection({ code: 4001 })).toBe(true);
      expect(isUserRejection({ rpcCode: 4001 })).toBe(true);
    });

    it("detects text indicating rejection", () => {
      expect(isUserRejection(new Error("User rejected the request"))).toBe(true);
      expect(isUserRejection({ message: "Transaction denied transaction" })).toBe(true);
    });

    it("returns false for non-rejection errors", () => {
      expect(isUserRejection(new Error("RPC timeout"))).toBe(false);
      expect(isUserRejection(null)).toBe(false);
    });
  });

  describe("formatWalletErrorMessage", () => {
    it("formats user rejection nicely", () => {
      expect(formatWalletErrorMessage({ code: 4001 })).toBe(
        "Transaction request was cancelled in your wallet."
      );
    });

    it("formats wrong network error", () => {
      expect(formatWalletErrorMessage(new Error("wrong network detected"))).toBe(
        "Wallet is connected to the wrong network. Please switch to GenLayer Studionet (Chain 61999)."
      );
    });

    it("uses error message or fallback", () => {
      expect(formatWalletErrorMessage(new Error("Something failed"))).toBe("Something failed");
      expect(formatWalletErrorMessage(null, "Default error")).toBe("Default error");
    });
  });

  describe("ensureStudionetNetwork", () => {
    it("throws if no window.ethereum is present", async () => {
      // @ts-expect-error Mocking window without ethereum
      globalThis.window = {};
      await expect(ensureStudionetNetwork()).rejects.toThrow("No Web3 wallet detected");
    });

    it("succeeds when already on chain 61999", async () => {
      const mockEth = {
        request: vi.fn().mockImplementation(async ({ method }) => {
          if (method === "eth_accounts") return ["0x1111111111111111111111111111111111111111"];
          if (method === "eth_chainId") return "0xf22f"; // 61999
          return null;
        }),
      };
      // @ts-expect-error Mocking window.ethereum
      globalThis.window = { ethereum: mockEth };

      const res = await ensureStudionetNetwork("0x1111111111111111111111111111111111111111");
      expect(res.chainId).toBe(61999);
      expect(res.address).toBe("0x1111111111111111111111111111111111111111");
    });

    it("triggers wallet_switchEthereumChain when on wrong network", async () => {
      let chain = "0x1"; // Mainnet initially
      const mockEth = {
        request: vi.fn().mockImplementation(async ({ method }) => {
          if (method === "eth_accounts") return ["0x1111111111111111111111111111111111111111"];
          if (method === "eth_chainId") return chain;
          if (method === "wallet_switchEthereumChain") {
            chain = "0xf22f";
            return null;
          }
          return null;
        }),
      };
      // @ts-expect-error Mocking window.ethereum
      globalThis.window = { ethereum: mockEth };

      const res = await ensureStudionetNetwork();
      expect(res.chainId).toBe(61999);
      expect(mockEth.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xf22f" }],
      });
    });
  });
});
