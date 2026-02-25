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
} from "lucide-react";
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

  if (notFound || !profile) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-muted-foreground font-mono">Player not found</p>
          <p className="mt-2 text-xs text-muted-foreground/60 font-mono">
            {shortAddr(wallet)} has not placed any bets yet
          </p>
          <Link href="/" className="mt-6 inline-block text-primary hover:underline text-sm font-mono">
            ← Back to Matches
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { stats, recent_bets } = profile;
  const solWagered = (stats.total_wagered / 1e9).toFixed(3);
  const solClaimed = (stats.total_claimed / 1e9).toFixed(3);

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Matches
          </Link>
        </div>

        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-none bg-background border border-border flex items-center justify-center">
              <span className="font-mono text-sm text-primary font-bold">
                {wallet.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono">
                {shortAddr(wallet)}
              </h1>
              <a
                href={`https://solscan.io/account/${wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors font-mono"
              >
                {wallet}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Joined {timeAgo(profile.created_at)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              icon: Target,
              label: "Win Rate",
              value: `${stats.win_rate}%`,
              cls: stats.win_rate >= 60 ? "text-green-400" : stats.win_rate >= 40 ? "text-yellow-400" : "text-muted-foreground",
            },
            {
              icon: Trophy,
              label: "W / L",
              value: `${stats.wins}W – ${stats.losses}L`,
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

        <Separator className="mb-8 opacity-50" />

        {/* Betting History */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Betting History
            <span className="text-sm font-normal text-muted-foreground font-mono">
              ({stats.total_bets} bets)
            </span>
          </h3>

          {recent_bets.length === 0 ? (
            <Card className="border-border rounded-none shadow-none bg-background">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground font-mono">No bets placed yet</p>
              </CardContent>
            </Card>
          ) : (
            recent_bets.map((bet, i) => {
              const status = betStatusLabel(bet);
              const betColor = outcomeColor(bet.outcome);
              const resultColor = outcomeColor(bet.result);
              const solAmount = (bet.amount / 1e9).toFixed(4);

              return (
                <Card key={i} className="border-border rounded-none shadow-none bg-background">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-border rounded-none bg-background font-mono text-[9px] tracking-widest uppercase text-muted-foreground"
                          >
                            {bet.league_id}
                          </Badge>
                          <Link
                            href={`/match/${bet.api_match_id}`}
                            className="text-sm font-bold hover:text-primary transition-colors"
                          >
                            {bet.home_team} vs {bet.away_team}
                          </Link>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
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
