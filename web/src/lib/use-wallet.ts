"use client";

import { useEffect, useState, useCallback } from "react";
import { shortAddress } from "./genlayer";

export function useWallet() {
  const [account, setAccount] = useState<string>("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshAccount = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return "";
    try {
      const isLocallyDisconnected =
        window.sessionStorage.getItem("chainsettle-wallet-disconnected") === "true";
      if (isLocallyDisconnected) {
        setAccount("");
        return "";
      }

      const [accs, currentChainId] = await Promise.all([
        window.ethereum.request({ method: "eth_accounts" }) as Promise<string[]>,
        window.ethereum.request({ method: "eth_chainId" }) as Promise<string>,
      ]);

      const first =
        Array.isArray(accs) && typeof accs[0] === "string"
          ? accs[0].toLowerCase().trim()
          : "";
      setAccount(first);
      setChainId(Number(currentChainId));
      return first;
    } catch {
      setAccount("");
      return "";
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAccount();
    }, 0);
    if (typeof window === "undefined" || !window.ethereum) return;

    const onAccountsChanged = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? accounts : [];
      if (list.length === 0) {
        setAccount("");
      } else {
        window.sessionStorage.removeItem("chainsettle-wallet-disconnected");
        setAccount(String(list[0]).toLowerCase().trim());
      }
    };

    const onChainChanged = (newChainId: unknown) => {
      setChainId(Number(newChainId));
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    return () => {
      window.clearTimeout(timer);
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener("chainChanged", onChainChanged);
    };
  }, [refreshAccount]);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install or unlock MetaMask to connect to GenLayer Studionet.");
      return "";
    }
    setIsConnecting(true);
    try {
      const [accs, currentChainId] = await Promise.all([
        window.ethereum.request({ method: "eth_requestAccounts" }) as Promise<string[]>,
        window.ethereum.request({ method: "eth_chainId" }) as Promise<string>,
      ]);
      const first =
        Array.isArray(accs) && typeof accs[0] === "string"
          ? accs[0].toLowerCase().trim()
          : "";
      window.sessionStorage.removeItem("chainsettle-wallet-disconnected");
      setAccount(first);
      setChainId(Number(currentChainId));
      return first;
    } catch {
      return "";
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    window.sessionStorage.setItem("chainsettle-wallet-disconnected", "true");
    setAccount("");
  }, []);

  return {
    account,
    chainId,
    isCorrectNetwork: chainId === 61999,
    isConnected: Boolean(account),
    isConnecting,
    connect,
    disconnect,
    refreshAccount,
    shortAddress,
  };
}
