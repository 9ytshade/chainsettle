"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./wallet-connect";

export function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: "/", label: "Agreements" },
    { href: "/court", label: "Court Docket", badge: true },
    { href: "/agreements/create", label: "New Escrow" },
    { href: "/protocol", label: "Protocol" },
  ];

  return (
    <header className="border-b border-[var(--color-graphite)] bg-[var(--background)]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-[1340px] mx-auto px-5 sm:px-8 lg:px-10 py-4 sm:py-4.5 flex items-center justify-between gap-4">
        {/* Left: Prominent Logo & Brand */}
        <div className="flex items-center flex-1 justify-start min-w-0">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--color-carbon)] border border-[var(--color-graphite)] group-hover:border-[var(--color-smoke)] shadow-sm flex items-center justify-center transition-all flex-shrink-0">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--color-paper)]"
              >
                <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                <path d="M7 21h10" />
                <path d="M12 3v18" />
                <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg sm:text-xl tracking-tight text-[var(--color-paper)] leading-tight">
                ChainSettle
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ash)] leading-tight mt-0.5">
                Autonomous Escrow & Court · v1.2.0
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Perfectly Centered Desktop Nav Menu */}
        <nav className="hidden md:flex items-center justify-center gap-2 flex-shrink-0 text-[13px]">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-[8px] transition-colors flex items-center gap-1.5 font-medium ${
                  isActive
                    ? "text-[var(--color-paper)] bg-[var(--color-obsidian)] border border-[var(--color-graphite)] shadow-sm"
                    : "text-[var(--color-fog)] hover:text-[var(--color-paper)] hover:bg-[var(--color-carbon)]"
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-coral-red)] animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Network, Wallet & Mobile Hamburger */}
        <div className="flex items-center justify-end flex-1 gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-carbon)] border border-[var(--color-graphite)] text-[11px] font-mono text-[var(--color-fog)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-pulse-green)]" />
            <span>Studionet 61999</span>
          </div>

          <WalletConnect />

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-[8px] border border-[var(--color-graphite)] bg-[var(--color-carbon)] text-[var(--color-mist)] hover:bg-[var(--color-obsidian)] transition-colors cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--color-graphite)] bg-[var(--color-carbon)] px-5 py-4 space-y-3">
          <nav className="flex flex-col space-y-1">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-[8px] text-sm font-medium transition-colors flex items-center justify-between ${
                    isActive
                      ? "text-[var(--color-paper)] bg-[var(--color-obsidian)] border border-[var(--color-graphite)]"
                      : "text-[var(--color-fog)] hover:text-[var(--color-paper)] hover:bg-[var(--color-obsidian)]"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-coral-red)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[var(--color-graphite)] flex items-center justify-between text-xs font-mono text-[var(--color-fog)]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-pulse-green)]" />
              GenLayer Studionet (61999)
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
