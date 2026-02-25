"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, User, ChevronDown, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";

function shortAddr(addr: string) {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

export function Navbar() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const solanaWallet = wallets[0];
  const displayAddr = solanaWallet?.address ? shortAddr(solanaWallet.address) : null;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img src="/apple-touch-icon.png" alt="GoalScore Logo" className="h-8 w-8 rounded-none" />
          <span className="text-lg font-bold tracking-tight">
            GoalScore<span className="text-primary">.fun</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground font-mono">
          <Link href="/#live-matches" className="hover:text-primary transition-colors">
            Matches
          </Link>
          <Link href="/leaderboard" className="hover:text-primary transition-colors">
            Leaderboard
          </Link>
          <Link href="/goal" className="hover:text-primary transition-colors text-primary/70">
            $GOAL
          </Link>
        </div>

        {/* Wallet Auth & Theme */}
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-8 w-8 items-center justify-center border border-border bg-background text-primary hover:bg-foreground hover:text-background transition-all rounded-none"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {!ready ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-secondary/50" />
          ) : authenticated && displayAddr ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 border border-border bg-background px-3 py-1.5 font-mono text-xs text-primary hover:bg-foreground hover:text-background transition-all rounded-none"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                {displayAddr}
                <ChevronDown className="h-3 w-3" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 border border-border bg-background z-50 overflow-hidden rounded-none">
                  <Link
                    href={`/u/${solanaWallet.address}`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="h-3.5 w-3.5 text-primary" />
                    My Profile
                  </Link>
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-secondary/50 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={login}
              className="font-mono text-xs bg-primary text-white hover:bg-black rounded-none transition-colors border-none"
            >
              <Wallet className="mr-1.5 h-3 w-3" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
