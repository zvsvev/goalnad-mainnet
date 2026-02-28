"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useGoalBalance, GOAL_HOLDER_THRESHOLD } from "@/hooks/useGoalBalance";
import {
  Trophy,
  Timer,
  Coins,
  TrendingUp,
  Bot,
  ChevronDown,
  Zap,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MotionWrapper } from "@/components/ui/motion-wrapper";
import { TypingEffect } from "@/components/ui/typing-effect";
import {
  fetchMatches,
  fetchLeaderboard,
  outcomeName,
  outcomeColor,
  formatSol,
  type ApiMatch,
  type LeaderboardEntry,
} from "@/lib/api";

const HOW_IT_WORKS = [
  {
    icon: Bot,
    title: "Oracle Predicts",
    description:
      "Every day the GoalScore AI Oracle picks an outcome — Home, Draw, or Away — for today's matches and publishes it on-chain.",
  },
  {
    icon: Coins,
    title: "You Bet SOL",
    description:
      "Place your SOL on any of the three outcomes. Each side builds its own pool. Betting closes at kickoff.",
  },
  {
    icon: Timer,
    title: "Match Plays Out",
    description:
      "The match happens. The Oracle resolves the result on-chain — trustless, transparent, immutable.",
  },
  {
    icon: Trophy,
    title: "Winners Share the Pot",
    description:
      "All SOL wagered on the correct outcome splits proportionally to bet size. Draw? Everyone gets a full refund.",
  },
];

function MatchCard({ match }: { match: ApiMatch }) {
  const hasOracle = match.oracle_prediction !== null;
  const isResolved = match.resolved === 1;
  const pot = match.total_pot ?? 0;

  const homeTotal = match.total_home ?? 0;
  const drawTotal = match.total_draw ?? 0;
  const awayTotal = match.total_away ?? 0;

  const homePercent = pot > 0 ? Math.round((homeTotal / pot) * 100) : 33;
  const drawPercent = pot > 0 ? Math.round((drawTotal / pot) * 100) : 34;
  const awayPercent = pot > 0 ? Math.round((awayTotal / pot) * 100) : 33;

  const oraclePredName = outcomeName(match.oracle_prediction);
  const oraclePredColor = outcomeColor(match.oracle_prediction);

  return (
    <Link href={`/match/${match.api_match_id}`}>
      <div className="group rounded-none border border-border bg-background p-4 hover:border-primary hover:bg-foreground/5 transition-all cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              {match.league_id}
            </span>
            {isResolved ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border rounded-none text-muted-foreground">
                FT
              </Badge>
            ) : hasOracle ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary rounded-none text-primary">
                OPEN
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border rounded-none text-muted-foreground/50">
                PENDING
              </Badge>
            )}
          </div>
          {pot > 0 && (
            <span className="font-mono text-xs text-primary font-bold">
              {formatSol(pot)} pot
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {match.home_logo && (
              <img src={match.home_logo} alt="" className="h-6 w-6 object-contain shrink-0" />
            )}
            <span className="text-sm font-semibold truncate">{match.home_team}</span>
          </div>
          <div className="shrink-0 text-center">
            {isResolved && match.home_score !== null ? (
              <span className="font-mono text-sm font-bold text-foreground">
                {match.home_score} – {match.away_score}
              </span>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">vs</span>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end min-w-0">
            <span className="text-sm font-semibold truncate text-right">{match.away_team}</span>
            {match.away_logo && (
              <img src={match.away_logo} alt="" className="h-6 w-6 object-contain shrink-0" />
            )}
          </div>
        </div>

        {/* Oracle prediction */}
        {hasOracle && (
          <div className="flex items-center gap-1.5 mb-3">
            <Bot className="h-3 w-3 text-primary shrink-0" />
            <span className="font-mono text-[10px] text-muted-foreground">Oracle:</span>
            <span className={`font-mono text-[10px] font-bold ${oraclePredColor}`}>
              {oraclePredName}
            </span>
            {match.oracle_score && (
              <span className="font-mono text-[10px] text-muted-foreground">
                · {match.oracle_score}
              </span>
            )}
          </div>
        )}

        {/* Outcome distribution bar */}
        {pot > 0 && (
          <div className="space-y-1">
            <div className="flex h-1.5 rounded-none overflow-hidden gap-0.5">
              <div className="bg-blue-400 rounded-none" style={{ width: `${homePercent}%` }} />
              <div className="bg-yellow-400 rounded-none" style={{ width: `${drawPercent}%` }} />
              <div className="bg-red-400 rounded-none" style={{ width: `${awayPercent}%` }} />
            </div>
            <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
              <span className="text-blue-400">{homePercent}% H</span>
              <span className="text-yellow-400">{drawPercent}% D</span>
              <span className="text-red-400">{awayPercent}% A</span>
            </div>
          </div>
        )}

        {/* Result badge */}
        {isResolved && match.result !== null && (
          <div className="mt-2 flex items-center gap-1.5">
            <Trophy className="h-3 w-3 text-primary shrink-0" />
            <span className="font-mono text-[10px] text-primary">
              Result: {outcomeName(match.result)}
            </span>
            {match.oracle_prediction === match.result ? (
              <span className="font-mono text-[9px] text-green-400">✓ Oracle correct</span>
            ) : (
              <span className="font-mono text-[9px] text-red-400">✗ Oracle wrong</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function OracleGate({ children }: { children: React.ReactNode }) {
  const { isHolder } = useGoalBalance();
  if (!isHolder) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-60 grayscale">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 border border-border rounded-none">
          <Lock className="h-8 w-8 text-primary" />
          <p className="font-mono text-sm text-center text-foreground">
            Hold <span className="text-primary font-bold">{GOAL_HOLDER_THRESHOLD.toLocaleString()} $GOAL</span> to see Oracle predictions
          </p>
          <p className="font-mono text-[10px] text-muted-foreground text-center max-w-48">
            Connect your wallet and hold $GOAL to unlock Oracle insights
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function Home() {
  const [upcoming, setUpcoming] = useState<ApiMatch[]>([]);
  const [results, setResults] = useState<ApiMatch[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [arenaVisibleCount, setArenaVisibleCount] = useState(6);
  const [resultsVisibleCount, setResultsVisibleCount] = useState(6);

  const { login } = usePrivy();

  const loadData = useCallback(async (isInitial = false) => {
    try {
      const [upRes, ftRes, lbRes] = await Promise.all([
        fetchMatches({ status: "NS", limit: 50 }),
        fetchMatches({ status: "FT", predicted: "true", limit: 50 }),
        fetchLeaderboard().catch(() => [] as LeaderboardEntry[]),
      ]);
      setUpcoming(upRes);
      setResults(ftRes.reverse().slice(0, 30));
      setLeaderboard(lbRes);
    } catch (e) {
      console.error("Failed to load matches:", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const predictedMatches = upcoming.filter(
    (m) => m.oracle_prediction !== null && m.oracle_prediction !== undefined
  );

  let displayedResults = results.filter((m) => m.resolved === 1);
  if (leagueFilter !== "all") {
    displayedResults = displayedResults.filter((m) => m.league_id === leagueFilter);
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-background">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-none border border-border bg-background px-4 py-1.5">
              <div className="h-2 w-2 rounded-none bg-primary animate-pulse" />
              <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                Bet SOL · Beat the Oracle · On-chain
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              <span className="inline-block text-primary">
                Beat the AI Oracle
              </span>
              <br />
              <span>Win the SOL pot.</span>
            </h1>
            <TypingEffect
              text={`The GoalScore Oracle predicts every football match.
Bet SOL on Home, Draw, or Away.
If your side wins — you share the pot proportionally.
No house edge. 1% fee. Pure on-chain.`}
              className="mt-5 text-base text-muted-foreground sm:text-lg max-w-xl mx-auto whitespace-pre-line"
            />
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="font-mono bg-primary text-background hover:bg-foreground hover:text-background rounded-none transition-colors border-none"
                asChild
              >
                <a href="#live-matches">
                  <Zap className="mr-2 h-4 w-4" />
                  See Live Matches
                </a>
              </Button>
              <Button size="lg" variant="outline" className="font-mono rounded-none border-border bg-background hover:bg-foreground hover:text-background transition-all" asChild>
                <Link href="/goal">
                  <Coins className="mr-2 h-4 w-4" />
                  Get $GOAL Access
                </Link>
              </Button>
            </div>

            {/* Stats bar */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {[
                { label: "Chain", value: "Solana" },
                { label: "Bet Currency", value: "SOL" },
                { label: "Fee", value: "1%" },
                { label: "Outcomes", value: "H / D / A" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-mono text-lg font-bold text-primary">{s.value}</div>
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Arena ── */}
      <section id="live-matches" className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                Live Betting Markets
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Oracle predictions are live — bet SOL before kickoff
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-primary">Live</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : predictedMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono py-8 text-center">
              No markets open yet — Oracle is scanning today&apos;s matches
            </p>
          ) : (
            <>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {predictedMatches.slice(0, arenaVisibleCount).map((m, i) => (
                  <MotionWrapper key={m.api_match_id} delay={i * 0.05} viewportAmount={0.1}>
                    <MatchCard match={m} />
                  </MotionWrapper>
                ))}
              </div>
              {predictedMatches.length > arenaVisibleCount && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setArenaVisibleCount((p) => p + 4)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-none font-mono text-xs text-primary bg-background border border-border hover:bg-foreground hover:text-background transition-all"
                  >
                    <ChevronDown className="h-3.5 w-3.5" /> Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Oracle Insights (gated) ── */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Oracle Analysis
              <Lock className="h-4 w-4 text-muted-foreground" />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deep AI analysis — unlocked for{" "}
              <span className="text-primary font-mono">{GOAL_HOLDER_THRESHOLD.toLocaleString()}+ $GOAL</span> holders
            </p>
          </div>

          <OracleGate>
            {predictedMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground font-mono py-6 text-center">No analysis available yet</p>
            ) : (
              <div className="space-y-3">
                {predictedMatches.slice(0, 3).map((m) => (
                  <div key={m.api_match_id} className="rounded-none border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold">{m.home_team} vs {m.away_team}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary rounded-none text-primary">
                        {outcomeName(m.oracle_prediction)} · {m.oracle_conviction ?? 0}% conviction
                      </Badge>
                    </div>
                    {m.oracle_analysis && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {m.oracle_analysis}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </OracleGate>
        </div>
      </section>

      {/* ── Results ── */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Results
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Resolved markets with Oracle track record
            </p>
          </div>

          {/* League filter */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {[
              { code: "all", label: "All Leagues" },
              { code: "PL", label: "Premier League" },
              { code: "SA", label: "Serie A" },
              { code: "PD", label: "La Liga" },
              { code: "BL1", label: "Bundesliga" },
            ].map((l) => (
              <button
                key={l.code}
                onClick={() => { setLeagueFilter(l.code); setResultsVisibleCount(6); }}
                className={`px-3 py-1.5 rounded-none font-mono text-xs transition-all border border-border ${leagueFilter === l.code
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:bg-foreground hover:text-background"
                  }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : displayedResults.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-semibold text-muted-foreground mb-2">No Results Yet</p>
              <p className="text-sm text-muted-foreground font-mono max-w-md mx-auto">
                Once matches finish, resolved markets will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                {displayedResults.slice(0, resultsVisibleCount).map((m, i) => (
                  <MotionWrapper key={m.api_match_id} delay={i * 0.05} viewportAmount={0.1}>
                    <MatchCard match={m} />
                  </MotionWrapper>
                ))}
              </div>
              {displayedResults.length > resultsVisibleCount && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setResultsVisibleCount((p) => p + 4)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-none font-mono text-xs text-primary bg-background border border-border hover:bg-foreground hover:text-background transition-all"
                  >
                    <ChevronDown className="h-3 w-3" /> View More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Leaderboard ── */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Players
            </h2>
            <Link href="/leaderboard" className="font-mono text-xs text-primary hover:underline">
              View Full Leaderboard →
            </Link>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono py-6 text-center">
              No players ranked yet — be the first to beat the Oracle
            </p>
          ) : (
            <div className="rounded-none border border-border bg-background overflow-hidden">
              <div className="grid grid-cols-[32px_1fr_72px_72px_100px] items-center px-4 py-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider border-b border-border">
                <span>#</span>
                <span>Player</span>
                <span className="text-center">W/L</span>
                <span className="text-center">Win%</span>
                <span className="text-center">Wagered</span>
              </div>
              {leaderboard.slice(0, 10).map((player, i) => (
                <MotionWrapper key={player.wallet} delay={i * 0.04} viewportAmount={0.1}>
                  <Link href={player.username ? `/u/@${player.username}` : `/u/${player.wallet}`}>
                    <div className={`grid grid-cols-[32px_1fr_72px_72px_100px] items-center px-4 py-3 border-b border-border last:border-0 hover:bg-foreground/5 transition-colors ${i === 0 ? "bg-primary/5" : "bg-background"}`}>
                      <span className="font-mono text-sm font-bold text-muted-foreground">{i + 1}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={player.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.avatar_seed || player.wallet}`}
                          alt=""
                          className="h-6 w-6 rounded-none border border-border shrink-0 object-cover"
                        />
                        <span className="font-mono text-sm font-bold text-primary truncate">
                          {player.username ? `@${player.username}` : `${player.wallet.slice(0, 6)}…${player.wallet.slice(-4)}`}
                        </span>
                      </div>
                      <span className="text-center font-mono text-xs">
                        <span className="text-green-400">{player.wins}W</span>
                        {" – "}
                        <span className="text-red-400">{player.losses}L</span>
                      </span>
                      <span className={`text-center font-mono text-xs font-bold ${(player.winRate ?? 0) >= 60 ? "text-green-400" : (player.winRate ?? 0) >= 40 ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {player.winRate ?? 0}%
                      </span>
                      <span className="text-center font-mono text-xs text-muted-foreground">
                        {((player.totalBidAmount ?? 0) / 1e9).toFixed(2)} SOL
                      </span>
                    </div>
                  </Link>
                </MotionWrapper>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How It Works</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl mx-auto">
              No house always wins. No opaque bookmaker odds. Just you, the AI Oracle, and pure on-chain football betting on Solana.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map((step, i) => (
              <Card key={step.title} className="border-border rounded-none shadow-none bg-background">
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-none border border-primary/20 bg-primary/5 text-primary">
                      <step.icon className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── $GOAL CTA ── */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center justify-center">
              <img
                src="/apple-touch-icon.png"
                alt="$GOAL Token"
                className="h-24 w-24 rounded-none border border-border"
              />
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">$GOAL Token</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              The utility token of GoalScore.fun. Hold {GOAL_HOLDER_THRESHOLD.toLocaleString()} $GOAL to unlock Oracle predictions and analysis.
              Deployed on Solana via pump.fun.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-none border border-border bg-background px-4 py-2">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-xs text-primary">{GOAL_HOLDER_THRESHOLD.toLocaleString()} $GOAL = Oracle Access</span>
            </div>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="font-mono bg-primary text-background hover:bg-foreground hover:text-background rounded-none transition-colors border-none"
                asChild
              >
                <Link href="/goal">
                  <Coins className="mr-2 h-4 w-4" />
                  $GOAL Token Details
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
