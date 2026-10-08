import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "ChainSettle - Autonomous Dispute Court & Micro-Arbitration",
  description:
    "Midnight precision dispute court for freelance escrow powered by GenLayer Intelligent Contracts and validator consensus.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('dark');document.documentElement.removeAttribute('data-theme');try{localStorage.removeItem('chainsettle-theme');}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between selection:bg-[#e4f222] selection:text-[#08090a]">
        <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 flex-1">
            {children}
          </main>
        </div>
        <footer className="border-t border-[var(--color-graphite)] py-7 px-4 bg-[var(--color-carbon)] text-xs text-[var(--color-fog)] transition-colors">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
            <div className="flex items-center gap-2 text-[var(--color-mist)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-pulse-green)]" />
              <span className="font-medium text-[var(--color-paper)]">ChainSettle v1.2.0</span>
              <span className="text-[var(--color-ash)]">/</span>
              <span>GenLayer Studionet (61999)</span>
            </div>
            <div className="flex items-center gap-3 text-[var(--color-ash)]">
              <span>Autonomous Magistrate Jury · Basis Points Settlement</span>
            </div>
            <div className="font-semibold text-[var(--color-paper)] tracking-wider">
              © 2026 CHAINSETTLE · BUILT BY <span className="text-[#e4f222] underline underline-offset-2">9YTSHADE</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
