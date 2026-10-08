"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHAINSETTLE_NETWORK,
  createChainSettleClient,
  shortAddress,
} from "@/lib/genlayer";
import { formatGenDisplay, formatWeiToGen } from "@/lib/safety";

type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "wrong-network"
  | "unavailable"
  | "error";

type WalletState = {
  address?: string;
  balance?: string;
  rawWei?: string;
  message?: string;
  state: ConnectionState;
};

const initialWalletState: WalletState = { state: "idle" };

function isUserRejection(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const walletError = error as { code?: number; rpcCode?: number };
  return walletError.code === 4001 || walletError.rpcCode === 4001;
}

async function readWallet(address: string): Promise<WalletState> {
  if (!window.ethereum) return { state: "unavailable" };

  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (Number(chainId) !== CHAINSETTLE_NETWORK.id) {
    return { address, state: "wrong-network" };
  }

  const balance = await window.ethereum.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  });

  const rawWei = typeof balance === "string" ? balance : undefined;
  return {
    address,
    rawWei,
    balance: rawWei ? formatGenDisplay(BigInt(rawWei)) : undefined,
    state: "connected",
  };
}

import { CopyIcon, CheckIcon } from "@/components/icons";

export function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [locallyDisconnected, setLocallyDisconnected] = useState(() =>
    typeof window !== "undefined" &&
    window.sessionStorage.getItem("chainsettle-wallet-disconnected") === "true"
  );
  const menuRef = useRef<HTMLDivElement>(null);

  async function refreshWallet() {
    try {
      if (!window.ethereum) {
        setWallet({ state: "unavailable" });
        return;
      }
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const address =
        Array.isArray(accounts) && typeof accounts[0] === "string"
          ? accounts[0]
          : undefined;
      setWallet(address ? await readWallet(address) : initialWalletState);
    } catch {
      setWallet({
        state: "error",
        message: "Wallet details unavailable. Try connecting again.",
      });
    }
  }

  function refreshPage() {
    setReloading(true);
    window.setTimeout(() => window.location.reload(), 300);
  }

  useEffect(() => {
    const restoreWallet = window.setTimeout(() => {
      if (!locallyDisconnected) void refreshWallet();
    }, 0);
    if (!window.ethereum) return;

    const onAccountsChanged = (accounts: unknown) => {
      const accountList = Array.isArray(accounts) ? accounts : [];
      if (accountList.length === 0) {
        window.sessionStorage.setItem("chainsettle-wallet-disconnected", "true");
        setLocallyDisconnected(true);
        setWallet(initialWalletState);
        refreshPage();
      } else {
        window.sessionStorage.removeItem("chainsettle-wallet-disconnected");
        setLocallyDisconnected(false);
        refreshPage();
      }
    };

    const onChainChanged = () => {
      if (!locallyDisconnected) refreshPage();
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.clearTimeout(restoreWallet);
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener("chainChanged", onChainChanged);
    };
  }, [locallyDisconnected]);

  // Click outside to close dropdown menu
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function connect() {
    if (!window.ethereum) {
      setWallet({ state: "unavailable" });
      return false;
    }

    setWallet({ state: "connecting" });
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address =
        Array.isArray(accounts) && typeof accounts[0] === "string"
          ? accounts[0]
          : undefined;
      if (!address) throw new Error("No account was selected in your wallet.");

      const client = createChainSettleClient(address as `0x${string}`);
      await client.connect(CHAINSETTLE_NETWORK.slug);

      window.sessionStorage.removeItem("chainsettle-wallet-disconnected");
      setLocallyDisconnected(false);
      setWallet(await readWallet(address));
      return true;
    } catch (error) {
      if (isUserRejection(error)) {
        setWallet(initialWalletState);
        return false;
      }
      const message =
        error instanceof Error ? error.message : "Wallet connection was not completed.";
      setWallet({ state: "error", message });
      return false;
    }
  }

  async function revokeWalletPermission() {
    if (!window.ethereum) return;
    try {
      // EIP-2255: MetaMask maps this permission revocation to a dapp disconnect
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      if (!isUserRejection(error)) return;
    }
  }

  async function disconnect() {
    setMenuOpen(false);
    setReloading(true);
    await revokeWalletPermission();
    window.sessionStorage.setItem("chainsettle-wallet-disconnected", "true");
    setLocallyDisconnected(true);
    setWallet(initialWalletState);
    refreshPage();
  }

  async function changeAccount() {
    if (!window.ethereum) return;
    setMenuOpen(false);
    setWallet({ state: "connecting" });
    await revokeWalletPermission();
    if (await connect()) {
      refreshPage();
    }
  }

  async function switchNetwork() {
    if (!window.ethereum) return;
    const targetChainHex = `0x${CHAINSETTLE_NETWORK.id.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainHex }],
      });
      refreshPage();
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: targetChainHex,
              chainName: "GenLayer Studionet",
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
              rpcUrls: ["https://studio.genlayer.com/api"],
              blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
            },
          ],
        });
        refreshPage();
      }
    }
  }

  if (wallet.state === "wrong-network") {
    return (
      <button
        onClick={switchNetwork}
        className="px-3.5 py-1.5 rounded-full bg-[#eb5757]/15 border border-[#eb5757]/30 text-[#eb5757] font-mono text-[12px] hover:bg-[#eb5757]/25 transition font-medium cursor-pointer"
      >
        Switch to Studionet
      </button>
    );
  }

  if (wallet.state === "connected" && wallet.address) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Manage connected wallet"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[var(--color-carbon)] border border-[var(--color-graphite)] hover:border-[var(--color-smoke)] text-[var(--color-mist)] font-mono text-[12px] transition shadow-sm cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-pulse-green)]" />
          <span className="font-medium text-[var(--color-paper)]">
            {shortAddress(wallet.address)}
          </span>
          {wallet.balance && (
            <span className="hidden sm:inline border-l border-[var(--color-graphite)] pl-2 text-[var(--color-fog)]">
              {wallet.balance} GEN
            </span>
          )}
          <span className="text-[10px] text-[var(--color-ash)] ml-0.5">▼</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[var(--color-graphite)] bg-[var(--color-carbon)] p-3 shadow-2xl z-50 text-xs backdrop-blur-md">
            {/* Header info */}
            <div className="pb-2.5 mb-2 border-b border-[var(--color-graphite)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)]">
                  Connected Account
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--color-pulse-green)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-pulse-green)]" />
                  Studionet
                </span>
              </div>
              <p className="font-mono text-[11px] text-[var(--color-paper)] break-all select-all bg-[var(--color-obsidian)] p-2 rounded-[6px] border border-[var(--color-graphite)]">
                {wallet.address}
              </p>
              {wallet.rawWei && (
                <div className="text-[11px] font-mono text-[var(--color-fog)] pt-0.5">
                  Balance:{" "}
                  <span className="text-[var(--color-paper)] font-medium">
                    {formatWeiToGen(wallet.rawWei)} GEN
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-1 font-mono text-[12px]">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(wallet.address!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="w-full text-left px-3 py-2 rounded-[6px] hover:bg-[var(--color-obsidian)] text-[var(--color-mist)] hover:text-[var(--color-paper)] transition flex items-center justify-between cursor-pointer"
              >
                <span>{copied ? "Copied to Clipboard!" : "Copy Address"}</span>
                {copied ? (
                  <CheckIcon className="w-3.5 h-3.5 text-[#27a644]" />
                ) : (
                  <CopyIcon className="w-3.5 h-3.5 text-[var(--color-ash)]" />
                )}
              </button>

              <button
                onClick={() => void changeAccount()}
                className="w-full text-left px-3 py-2 rounded-[6px] hover:bg-[var(--color-obsidian)] text-[var(--color-mist)] hover:text-[var(--color-paper)] transition flex items-center justify-between cursor-pointer"
              >
                <span>Switch / Change Account</span>
                <span className="text-[11px] text-[var(--color-ash)]">⇄</span>
              </button>

              <div className="my-1 border-t border-[var(--color-graphite)]" />

              <button
                onClick={() => void disconnect()}
                className="w-full text-left px-3 py-2 rounded-[6px] hover:bg-[#eb5757]/15 text-[#eb5757] transition flex items-center justify-between font-medium cursor-pointer"
              >
                <span>Disconnect Wallet</span>
                <span className="text-[11px]">⏻</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const label = reloading
    ? "Refreshing…"
    : wallet.state === "connecting"
    ? "Connecting…"
    : "Connect Wallet";

  return (
    <div className="relative">
      <button
        onClick={connect}
        disabled={wallet.state === "connecting" || reloading}
        className="btn-white-pill disabled:cursor-wait disabled:opacity-60 cursor-pointer"
      >
        {label}
      </button>
      {(wallet.state === "unavailable" || wallet.state === "error") && (
        <p className="absolute right-0 mt-1.5 w-60 p-2 rounded-lg bg-[var(--color-carbon)] border border-[#eb5757]/40 text-[#eb5757] text-[11px] font-mono shadow-xl z-50">
          {wallet.state === "unavailable"
            ? "Install or unlock MetaMask to connect to GenLayer."
            : wallet.message}
        </p>
      )}
    </div>
  );
}
