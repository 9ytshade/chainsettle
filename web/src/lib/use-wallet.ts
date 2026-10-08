"use client";

import { useEffect, useState, useCallback } from "react";
import { shortAddress } from "./genlayer";

export function useWallet() {
  const [account, setAccount] = useState<string>("");
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
      const accs = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
      const first =
        Array.isArray(accs) && typeof accs[0] === "string"
          ? accs[0].toLowerCase().trim()
          : "";
      setAccount(first);
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

    window.ethereum.on("accountsChanged", onAccountsChanged);
    return () => {
      window.clearTimeout(timer);
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
    };
  }, [refreshAccount]);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install or unlock MetaMask to connect to GenLayer Studionet.");
      return "";
    }
    setIsConnecting(true);
    try {
      const accs = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const first =
        Array.isArray(accs) && typeof accs[0] === "string"
          ? accs[0].toLowerCase().trim()
          : "";
      window.sessionStorage.removeItem("chainsettle-wallet-disconnected");
      setAccount(first);
      return first;
    } catch {
      return "";
    } finally {
      setIsConnecting(false);
    }
  }, []);

  return {
    account,
    isConnected: Boolean(account),
    isConnecting,
    connect,
    refreshAccount,
    shortAddress,
  };
}
