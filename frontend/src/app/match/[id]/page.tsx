"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Swords,
  Shield,
  Bot,
  ExternalLink,
  ArrowLeft,
  CircleDollarSign,
  Users,
  Loader2,
  Clock,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { fetchMatch, fetchMatchBids, type ApiMatch, type ApiBid } from "@/lib/api";
import type { WinnerInfo } from "@/lib/api";

const PREDICTION_LABELS: Record<number, string> = {
  1: "HOME WIN",
  2: "AWAY WIN",
  3: "DRAW",
};

const RESULT_LABELS: Record<number, string> = {
  1: "Home Win",
  2: "Away Win",
  3: "Draw",
};

function TeamCrest({ src, alt, size = 48 }: { src: string | null; alt: string; size?: number }) {
  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-secondary text-sm font-bold text-muted-foreground"
        style={{ width: size, height: size }}
      >
        {alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      unoptimized
    />
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

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

function getBidCountdown(matchDate: string): string | null {
  const kickoff = new Date(matchDate).getTime();
  const now = Date.now();
  const diff = kickoff - now;
  if (diff <= 0 || diff > 12 * 60 * 60 * 1000) return null;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function MatchPage() {
  const params = useParams();
  const id = params.id as string;

  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [bids, setBids] = useState<ApiBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const numId = parseInt(id, 10);
        if (isNaN(numId)) {
          setError("Invalid match ID");
          setLoading(false);
          return;
        }

        const [matchData, bidsData] = await Promise.all([
          fetchMatch(numId),
          fetchMatchBids(numId),
        ]);

        if (!matchData) {
          setError("Match not found");
        } else {
          setMatch(matchData);
          setBids(bidsData);
        }
      } catch (e) {
        console.error("Failed to load match:", e);
        setError("Failed to load match data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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

  if (error || !match) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-muted-foreground">{error || "Match not found"}</p>
          <Link href="/" className="mt-4 inline-block text-primary hover:underline text-sm">
            ← Back to Matches
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const challenges = bids.filter((b) => b.type === "challenge");
  const supports = bids.filter((b) => b.type === "support");
  const hasPrediction = match.oracle_prediction !== null && match.oracle_prediction !== undefined;
  const winnerInfo = (match as any).winnerInfo as WinnerInfo | null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Breadcrumb + On-chain */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Matches
          </Link>
          {match.oracle_tx_hash && (
            <Button variant="outline" size="sm" className="font-mono text-xs" asChild>
              <a
                href={`https://testnet.monadscan.com/tx/${match.oracle_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1.5 h-3 w-3" />
                View on Monad
              </a>
            </Button>
          )}
        </div>

        {/* Match Hero */}
        <div className="text-center space-y-4 mb-10">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Badge variant="secondary" className="font-mono text-[10px] tracking-widest uppercase">
              {match.league_id}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {match.status === "NS" ? "Upcoming" : match.status}
            </Badge>
            {match.round && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {match.round}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <div className="text-right flex-1 flex flex-col items-end gap-2">
              <TeamCrest src={match.home_logo} alt={match.home_team} />
              <p className="text-xl font-bold tracking-tight sm:text-3xl">
                {match.home_team}
              </p>
            </div>
            <div className="flex flex-col items-center">
              {match.status === "FT" || match.status === "LIVE" ? (
                <span className="font-mono text-3xl font-bold">
                  {match.home_score ?? 0} - {match.away_score ?? 0}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground font-mono">VS</span>
              )}
            </div>
            <div className="text-left flex-1 flex flex-col items-start gap-2">
              <TeamCrest src={match.away_logo} alt={match.away_team} />
              <p className="text-xl font-bold tracking-tight sm:text-3xl">
                {match.away_team}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-mono">
            {formatDate(match.match_date)}
          </p>

          {/* Bid closing countdown */}
          {match.status === "NS" && getBidCountdown(match.match_date) && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 py-2 px-5">
              <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="font-mono text-sm font-semibold text-amber-400">
                Bid closes in {getBidCountdown(match.match_date)}
              </span>
            </div>
          )}

          {/* Oracle prediction summary */}
          {hasPrediction && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary font-mono text-sm">
                {PREDICTION_LABELS[match.oracle_prediction!] ?? `Prediction ${match.oracle_prediction}`}
              </Badge>
              {match.oracle_score && (
                <span className="font-mono text-sm text-muted-foreground">
                  ({match.oracle_score})
                </span>
              )}
              {match.oracle_conviction !== null && (
                <span className="font-mono text-xs text-muted-foreground">
                  {match.oracle_conviction}% conviction
                </span>
              )}
            </div>
          )}
        </div>

        {/* Match Result Banner */}
        {winnerInfo && (
          <Card className={`mb-8 border-2 ${winnerInfo.outcome === "ORACLE_RIGHT"
            ? "border-green-500/30 bg-green-500/5"
            : winnerInfo.outcome === "ORACLE_WRONG"
              ? "border-red-500/30 bg-red-500/5"
              : "border-yellow-500/30 bg-yellow-500/5"
            }`}>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <Badge className={`font-mono text-sm px-4 py-1 ${winnerInfo.outcome === "ORACLE_RIGHT"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : winnerInfo.outcome === "ORACLE_WRONG"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }`}>
                  {winnerInfo.outcome === "ORACLE_RIGHT" ? "✅ ORACLE RIGHT" : winnerInfo.outcome === "ORACLE_WRONG" ? "❌ ORACLE WRONG" : "🤝 DRAW"}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {winnerInfo.message}
                </p>
                {winnerInfo.winnerName && (
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <Link
                      href={`/u/${winnerInfo.winnerWallet}`}
                      className="font-mono text-sm font-bold text-primary hover:underline"
                    >
                      {winnerInfo.winnerName}
                    </Link>
                    <span className="font-mono text-sm text-green-400 font-bold">
                      +{(winnerInfo.prize ?? 0).toLocaleString()} $GOAL
                    </span>
                  </div>
                )}
                {/* Prediction vs Actual */}
                {hasPrediction && match.status === "FT" && (
                  <div className="flex items-center justify-center gap-6 pt-2">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Predicted</p>
                      <p className="font-mono text-xs font-bold">
                        {PREDICTION_LABELS[match.oracle_prediction!]}
                        {match.oracle_score && ` (${match.oracle_score})`}
                      </p>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Actual</p>
                      <p className="font-mono text-xs font-bold">
                        {match.home_score} - {match.away_score}
                        {match.result !== undefined && match.result !== null && (
                          <span className="ml-1 text-muted-foreground">({RESULT_LABELS[match.result]})</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: CircleDollarSign, label: "Highest Bid", value: `${(match.highest_bid ?? 0).toLocaleString()} $GOAL`, highlight: true },
            { icon: CircleDollarSign, label: "Total Pot", value: `${(match.total_pot ?? 0).toLocaleString()} $GOAL`, highlight: false },
            { icon: Swords, label: "Challengers", value: String(challenges.length), highlight: false },
            { icon: Shield, label: "Supporters", value: String(supports.length), highlight: false },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 bg-card/60 backdrop-blur">
              <CardContent className="pt-4 pb-4 text-center space-y-1">
                <stat.icon className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className={`font-mono text-sm font-bold ${stat.highlight ? "text-primary" : ""}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* GoalNad Analysis */}
        {match.oracle_analysis && (
          <Card className="border-primary/20 bg-primary/5 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                  GoalNad Analysis
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {match.oracle_analysis}
              </p>
            </CardContent>
          </Card>
        )}

        {/* On-chain verification */}
        {match.oracle_tx_hash && (
          <div className="text-center mb-8">
            <a
              href={`https://testnet.monadscan.com/tx/${match.oracle_tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-primary/70 hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Prediction on-chain: {match.oracle_tx_hash.slice(0, 10)}...{match.oracle_tx_hash.slice(-8)}
            </a>
          </div>
        )}

        <Separator className="mb-8 opacity-50" />

        {/* Agent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-primary" />
              Agent Activity
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Swords className="h-3 w-3 text-red-400" />
                {challenges.length} challengers
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-blue-400" />
                {supports.length} supporters
              </span>
            </div>
          </div>

          {bids.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground font-mono">
                  No agent activity yet — waiting for challengers and supporters
                </p>
              </CardContent>
            </Card>
          ) : (
            bids.map((bid, i) => (
              <Card key={i} className="border-border/50 bg-card/80 backdrop-blur">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {bid.persona_type && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono px-1.5 py-0 border-border/50"
                        >
                          {bid.persona_type}
                        </Badge>
                      )}
                      <Link
                        href={`/u/${bid.agent_wallet}`}
                        className="font-mono text-sm font-bold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {bid.agent_name || bid.agent_wallet.slice(0, 10) + "..."}
                      </Link>
                      <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                        {bid.agent_wallet.slice(0, 6)}...{bid.agent_wallet.slice(-4)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {timeAgo(bid.created_at)}
                      </span>
                      {bid.tx_hash && (
                        <a
                          href={`https://testnet.monadscan.com/tx/${bid.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[9px] text-primary/50 hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Tx ↗
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {bid.type === "challenge" ? (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-[10px]">
                        <Swords className="mr-1 h-2.5 w-2.5" />
                        BID {bid.amount.toLocaleString()} $GOAL
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 font-mono text-[10px]">
                        <Shield className="mr-1 h-2.5 w-2.5" />
                        SUPPORT
                      </Badge>
                    )}
                    {(bid.wins > 0 || bid.losses > 0) && (
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {bid.wins}W-{bid.losses}L
                      </span>
                    )}
                  </div>

                  {bid.comment && (
                    <p className="text-sm text-muted-foreground/80 italic leading-relaxed">
                      &ldquo;{bid.comment}&rdquo;
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
