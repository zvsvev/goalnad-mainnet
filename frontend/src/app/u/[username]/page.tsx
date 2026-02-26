"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  ArrowLeft,
  Target,
  Loader2,
  ExternalLink,
  Coins,
  TrendingUp,
  Clock,
  Wallet,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  fetchUserProfile,
  outcomeName,
  outcomeColor,
  type ApiUserProfile,
} from "@/lib/api";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function betStatusLabel(bet: ApiUserProfile["recent_bets"][0]): {
  label: string;
  cls: string;
} {
  if (!bet.resolved) return { label: "OPEN", cls: "text-primary border-primary/30" };
  if (bet.claimed) return { label: "CLAIMED", cls: "text-green-400 border-green-400/30" };
  if (bet.refunded) return { label: "REFUNDED", cls: "text-yellow-400 border-yellow-400/30" };
  if (bet.result === null) return { label: "PENDING", cls: "text-muted-foreground border-border/50" };
  if (bet.outcome === bet.result) return { label: "WON", cls: "text-green-400 border-green-400/30" };
  return { label: "LOST", cls: "text-red-400 border-red-400/30" };
}

// ─── Profile Header ────────────────────────────────────────────────────

function ProfileHeader({ wallet }: { wallet: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-3">
        {/* Avatar */}
        <div className="h-14 w-14 rounded-none bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
          <span className="font-mono text-lg text-primary font-bold">
            {wallet.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold font-mono truncate">
            {shortAddr(wallet)}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <a
              href={`https://solscan.io/account/${wallet}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors font-mono truncate"
            >
              {wallet}
              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
            </a>
            <button
              onClick={handleCopy}
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
              title="Copy address"
            >
              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Grid ──────────────────────────────────────────────────────

function StatsGrid({ stats }: { stats: ApiUserProfile["stats"] | null }) {
  const s = stats ?? { win_rate: 0, wins: 0, losses: 0, total_bets: 0, total_wagered: 0, total_claimed: 0 };
  const solWagered = (s.total_wagered / 1e9).toFixed(3);
  const solClaimed = (s.total_claimed / 1e9).toFixed(3);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {[
        {
          icon: Target,
          label: "Win Rate",
          value: `${s.win_rate}%`,
          cls: s.win_rate >= 60 ? "text-green-400" : s.win_rate >= 40 ? "text-yellow-400" : "text-muted-foreground",
        },
        {
          icon: Trophy,
          label: "W / L",
          value: `${s.wins}W – ${s.losses}L`,
          cls: "text-foreground",
        },
        {
          icon: Coins,
          label: "SOL Wagered",
          value: `${solWagered} SOL`,
          cls: "text-primary",
        },
        {
          icon: TrendingUp,
          label: "SOL Claimed",
          value: `${solClaimed} SOL`,
          cls: "text-green-400",
        },
      ].map((stat) => (
        <Card key={stat.label} className="border-border rounded-none shadow-none bg-background">
          <CardContent className="pt-4 pb-4 text-center space-y-1">
            <stat.icon className="h-4 w-4 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              {stat.label}
            </p>
            <p className={`font-mono text-sm font-bold ${stat.cls}`}>
              {stat.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────

function EmptyBettingState() {
  return (
    <Card className="border-border rounded-none shadow-none bg-background">
      <CardContent className="py-12 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Wallet className="h-7 w-7 text-primary/60" />
        </div>
        <div>
          <h3 className="font-bold text-lg mb-1">No bets yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            This player hasn't placed any bets yet. Once they start predicting match outcomes, their betting history will appear here.
          </p>
        </div>
        <Button
          className="font-mono bg-primary text-background hover:bg-foreground hover:text-background rounded-none transition-colors border-none"
          asChild
        >
          <Link href="/">
            Browse Matches
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function UserProfilePage() {
  const params = useParams();
  const wallet = params.username as string;

  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchUserProfile(wallet);
        if (!data) setNotFound(true);
        else setProfile(data);
      } catch (e) {
        console.error("Failed to load profile:", e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [wallet]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  // Profile exists with bet data
  const hasProfile = !notFound && profile;
  const stats = hasProfile ? profile.stats : null;
  const recentBets = hasProfile ? profile.recent_bets : [];

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Matches
          </Link>
        </div>

        {/* Profile Header — always shown */}
        <ProfileHeader wallet={wallet} />

        {/* Stats Grid — shown with zeros even if no bets */}
        <StatsGrid stats={stats} />

        <Separator className="mb-8 opacity-50" />

        {/* Betting History */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Betting History
            <span className="text-sm font-normal text-muted-foreground font-mono">
              ({stats?.total_bets ?? 0} bets)
            </span>
          </h3>

          {recentBets.length === 0 ? (
            <EmptyBettingState />
          ) : (
            recentBets.map((bet, i) => {
              const status = betStatusLabel(bet);
              const betColor = outcomeColor(bet.outcome);
              const resultColor = outcomeColor(bet.result);
              const solAmount = (bet.amount / 1e9).toFixed(4);

              return (
                <Card key={i} className="border-border rounded-none shadow-none bg-background">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="border-border rounded-none bg-background font-mono text-[9px] tracking-widest uppercase text-muted-foreground"
                          >
                            {bet.league_id}
                          </Badge>
                          <Link
                            href={`/match/${bet.api_match_id}`}
                            className="text-sm font-bold hover:text-primary transition-colors truncate"
                          >
                            {bet.home_team} vs {bet.away_team}
                          </Link>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap">
                          <span>
                            Bet:{" "}
                            <span className={`font-bold ${betColor}`}>
                              {outcomeName(bet.outcome)}
                            </span>
                          </span>
                          <span className="text-primary font-bold">{solAmount} SOL</span>
                          {bet.resolved === 1 && bet.result !== null && (
                            <span>
                              Result:{" "}
                              <span className={`font-bold ${resultColor}`}>
                                {outcomeName(bet.result)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[9px] rounded-none ${status.cls}`}
                        >
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
