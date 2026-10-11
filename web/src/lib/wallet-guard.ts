"use client";

import { CHAINSETTLE_NETWORK } from "./genlayer";

export function isUserRejection(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const err = error as { code?: number; rpcCode?: number; message?: string };
    if (err.code === 4001 || err.rpcCode === 4001) return true;
    if (typeof err.message === "string" && /user rejected|rejected by user|denied transaction/i.test(err.message)) {
      return true;
    }
  }
  return false;
}

export function formatWalletErrorMessage(error: unknown, fallback = "Transaction failed"): string {
  if (isUserRejection(error)) {
    return "Transaction request was cancelled in your wallet.";
  }
  if (error instanceof Error) {
    if (/wrong network|unsupported chain/i.test(error.message)) {
      return "Wallet is connected to the wrong network. Please switch to GenLayer Studionet (Chain 61999).";
    }
    return error.message;
  }
  return fallback;
}

export async function ensureStudionetNetwork(expectedAddress?: string): Promise<{ address: `0x${string}`; chainId: number }> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No Web3 wallet detected. Please install or unlock MetaMask.");
  }

  // 1. Verify account connection
  let accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
  if (!Array.isArray(accounts) || accounts.length === 0) {
    accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  }

  if (!Array.isArray(accounts) || accounts.length === 0 || !accounts[0]) {
    throw new Error("Wallet connection required. Please connect your wallet.");
  }

  const activeAddress = accounts[0].toLowerCase().trim() as `0x${string}`;
  if (expectedAddress && activeAddress !== expectedAddress.toLowerCase().trim()) {
    throw new Error(`Active wallet account (${activeAddress}) does not match expected account (${expectedAddress.toLowerCase()}).`);
  }

  // 2. Strictly enforce Chain ID 61999 (0xf22f)
  const targetChainHex = `0x${CHAINSETTLE_NETWORK.id.toString(16)}`;
  let chainIdRaw = await window.ethereum.request({ method: "eth_chainId" });
  let currentChainId = Number(chainIdRaw);

  if (currentChainId !== CHAINSETTLE_NETWORK.id) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainHex }],
      });
    } catch (switchErr: unknown) {
      const errObj = switchErr as { code?: number };
      if (errObj.code === 4902 || isUserRejection(switchErr)) {
        if (isUserRejection(switchErr)) {
          throw new Error("Network switch was declined. Studionet (Chain 61999) is required for transactions.");
        }
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: targetChainHex,
              chainName: "GenLayer Studionet",
              nativeCurrency: {
                name: "GEN",
                symbol: "GEN",
                decimals: 18,
              },
              rpcUrls: ["https://studio.genlayer.com/api"],
              blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
            },
          ],
        });
      } else {
        throw switchErr;
      }
    }

    chainIdRaw = await window.ethereum.request({ method: "eth_chainId" });
    currentChainId = Number(chainIdRaw);
    if (currentChainId !== CHAINSETTLE_NETWORK.id) {
      throw new Error(`Wallet network must be GenLayer Studionet (Chain ${CHAINSETTLE_NETWORK.id}). Currently on ${currentChainId}.`);
    }
  }

  return { address: activeAddress, chainId: currentChainId };
}
