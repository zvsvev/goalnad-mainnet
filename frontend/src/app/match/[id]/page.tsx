"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useGoalBalance, GOAL_HOLDER_THRESHOLD } from "@/hooks/useGoalBalance";
import {
  Bot,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Clock,
  Trophy,
  Coins,
  Users,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  fetchMatch,
  fetchMatchBets,
  outcomeName,
  outcomeColor,
  formatSol,
  type ApiMatch,
  type ApiBet,
} from "@/lib/api";

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
  return `${Math.floor(hrs / 24)}d ago`;
}

function getBetCountdown(matchDate: string): string | null {
  const kickoff = new Date(matchDate).getTime();
  const diff = kickoff - Date.now();
  if (diff <= 0 || diff > 24 * 60 * 60 * 1000) return null;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function MatchPage() {
  const params = useParams();
  const id = params.id as string;
  const { authenticated } = usePrivy();
  const { isHolder, loading: goalLoading } = useGoalBalance();

  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [bets, setBets] = useState<ApiBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const numId = parseInt(id, 10);
        if (isNaN(numId)) { setError("Invalid match ID"); setLoading(false); return; }
        const [matchData, betsData] = await Promise.all([
          fetchMatch(numId),
          fetchMatchBets(numId),
        ]);
        if (!matchData) { setError("Match not found"); }
        else { setMatch(matchData); setBets(betsData); }
      } catch (e) {
        console.error("Failed to load match:", e);
        setError("Failed to load match data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen"><Navbar />
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div><Footer /></div>
  );

  if (error || !match) return (
    <div className="min-h-screen"><Navbar />
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{error || "Match not found"}</p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline text-sm">← Back to Matches</Link>
      </div><Footer /></div>
  );

  const hasPrediction = match.oracle_prediction !== null && match.oracle_prediction !== undefined;
  const isResolved = match.resolved === 1;
  const pot = match.total_pot ?? 0;
  const homeTotal = match.total_home ?? 0;
  const drawTotal = match.total_draw ?? 0;
  const awayTotal = match.total_away ?? 0;
  const homePercent = pot > 0 ? Math.round((homeTotal / pot) * 100) : 33;
  const drawPercent = pot > 0 ? Math.round((drawTotal / pot) * 100) : 34;
  const awayPercent = pot > 0 ? Math.round((awayTotal / pot) * 100) : 33;

  const betCountdown = getBetCountdown(match.match_date);

  // Group bets by outcome
  const betsByOutcome = [0, 1, 2].map((o) => ({
    outcome: o,
    bets: bets.filter((b) => b.outcome === o),
    total: bets.filter((b) => b.outcome === o).reduce((s, b) => s + b.amount, 0),
  }));

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Matches
          </Link>
          {match.oracle_tx_hash && (
            <Button variant="outline" size="sm" className="font-mono text-xs" asChild>
              <a href={`https://solscan.io/tx/${match.oracle_tx_hash}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3 w-3" />
                View on Solscan
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
              {isResolved ? "Resolved" : match.status === "NS" ? "Upcoming" : match.status}
            </Badge>
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <div className="text-right flex-1 flex flex-col items-end gap-2">
              <TeamCrest src={match.home_logo} alt={match.home_team} />
              <p className="text-xl font-bold tracking-tight sm:text-3xl">{match.home_team}</p>
            </div>
            <div className="flex flex-col items-center">
              {match.status === "FT" || match.status === "LIVE" ? (
                <span className="font-mono text-3xl font-bold">
                  {match.home_score ?? 0} – {match.away_score ?? 0}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground font-mono">VS</span>
              )}
            </div>
            <div className="text-left flex-1 flex flex-col items-start gap-2">
              <TeamCrest src={match.away_logo} alt={match.away_team} />
              <p className="text-xl font-bold tracking-tight sm:text-3xl">{match.away_team}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-mono">{formatDate(match.match_date)}</p>

          {/* Betting closes countdown */}
          {match.status === "NS" && betCountdown && (
            <div className="inline-flex items-center gap-2 rounded-none bg-background border border-amber-500 py-2 px-5">
              <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
              <span className="font-mono text-sm font-semibold text-amber-500">
                Betting closes in {betCountdown}
              </span>
            </div>
          )}

          {/* Oracle prediction */}
          {hasPrediction && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-none border border-border bg-background px-4 py-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm">
                  Oracle picks{" "}
                  <span className={`font-bold ${outcomeColor(match.oracle_prediction)}`}>
                    {outcomeName(match.oracle_prediction)}
                  </span>
                  {match.oracle_score && ` · ${match.oracle_score}`}
                  {match.oracle_conviction !== null && (
                    <span className="text-muted-foreground"> ({match.oracle_conviction}% conviction)</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Resolution result */}
        {isResolved && match.result !== null && (
          <Card className={`mb-8 rounded-none border-2 shadow-none ${match.oracle_prediction === match.result ? "border-green-500 bg-background" : match.result === 1 ? "border-yellow-500 bg-background" : "border-red-500 bg-background"}`}>
            <CardContent className="pt-6 text-center space-y-2">
              <Badge className={`font-mono text-sm px-4 py-1 rounded-none ${match.oracle_prediction === match.result ? "bg-green-500 text-background" : match.result === 1 ? "bg-yellow-500 text-background" : "bg-red-500 text-background"}`}>
                {match.result === 1
                  ? "🤝 DRAW — Full Refund"
                  : match.oracle_prediction === match.result
                    ? "✅ Oracle Correct"
                    : "❌ Oracle Wrong"}
              </Badge>
              <p className="text-sm text-muted-foreground font-mono">
                Result: <span className={`font-bold ${outcomeColor(match.result)}`}>{outcomeName(match.result)}</span>
                {" · "}{match.home_score} – {match.away_score}
              </p>
              {match.resolve_tx_hash && (
                <a href={`https://solscan.io/tx/${match.resolve_tx_hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono text-primary/60 hover:text-primary transition-colors">
                  <ExternalLink className="h-2.5 w-2.5" />
                  Resolution tx
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pot / distribution stats */}
        {pot > 0 && (
          <div className="mb-8 rounded-none border border-border bg-background p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-bold text-primary">{formatSol(pot)} total pot</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{bets.length} bets placed</span>
            </div>
            {/* Outcome bars */}
            <div className="space-y-2">
              {[
                { label: "Home", pct: homePercent, total: homeTotal, cls: "bg-blue-400" },
                { label: "Draw", pct: drawPercent, total: drawTotal, cls: "bg-yellow-400" },
                { label: "Away", pct: awayPercent, total: awayTotal, cls: "bg-red-400" },
              ].map(({ label, pct, total, cls }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] w-10 text-muted-foreground">{label}</span>
                  <div className="flex-1 h-2 rounded-none bg-secondary/30 overflow-hidden">
                    <div className={`h-full rounded-none ${cls} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[10px] w-20 text-right text-muted-foreground">
                    {pct}% · {formatSol(total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Oracle Analysis (gated by $GOAL balance) */}
        {match.oracle_analysis && (
          <Card className={`rounded-none border-border shadow-none bg-background mb-8 ${!isHolder ? "relative overflow-hidden" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                  Oracle Analysis
                </span>
                {!isHolder && <Lock className="h-3 w-3 text-muted-foreground ml-auto" />}
              </div>
              {isHolder ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{match.oracle_analysis}</p>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground leading-relaxed blur-sm select-none">{match.oracle_analysis}</p>
                  <p className="mt-3 text-xs font-mono text-primary text-center">
                    Hold {GOAL_HOLDER_THRESHOLD.toLocaleString()} $GOAL to read full Oracle analysis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Place bet CTA */}
        {!isResolved && match.status === "NS" && (
          <Card className="border-border rounded-none shadow-none bg-background mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-bold">Place Your Bet</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Pick Home, Draw, or Away and bet SOL. Winners share the pot proportionally.
                  </p>
                </div>
                <Button
                  className="font-mono bg-primary text-background hover:bg-foreground hover:text-background rounded-none transition-colors border-none"
                  asChild
                >
                  <Link href={`/bet/${match.api_match_id}`}>
                    <Coins className="mr-2 h-4 w-4" />
                    Bet Now
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="mb-8 opacity-50" />

        {/* Bets list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-primary" />
              Bets Placed
            </h3>
            <span className="font-mono text-xs text-muted-foreground">{bets.length} total</span>
          </div>

          {bets.length === 0 ? (
            <Card className="border-border rounded-none shadow-none bg-background">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground font-mono">
                  No bets yet — be the first to bet on this match
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Group by outcome */}
              {betsByOutcome.filter((g) => g.bets.length > 0).map(({ outcome, bets: obets, total }) => (
                <div key={outcome} className="space-y-1">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`font-mono text-xs font-bold ${outcomeColor(outcome)}`}>
                      {outcomeName(outcome)}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {obets.length} bets · {formatSol(total)}
                    </span>
                    {isResolved && match.result === outcome && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-green-400/30 text-green-400">WINNER</Badge>
                    )}
                  </div>
                  {obets.map((bet, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-none border border-border bg-background px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Link href={`/u/${bet.user_wallet}`} className="font-mono text-xs text-primary hover:underline">
                          {bet.user_wallet.slice(0, 6)}…{bet.user_wallet.slice(-4)}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {formatSol(bet.amount)}
                        </span>
                        {bet.claimed && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-green-400/30 text-green-400">
                            <Trophy className="h-2.5 w-2.5 mr-0.5" />claimed
                          </Badge>
                        )}
                        {bet.refunded && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-yellow-400/30 text-yellow-400">
                            refunded
                          </Badge>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                          {timeAgo(bet.created_at)}
                        </span>
                        {bet.tx_hash && (
                          <a href={`https://solscan.io/tx/${bet.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-primary/40 hover:text-primary transition-colors">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
