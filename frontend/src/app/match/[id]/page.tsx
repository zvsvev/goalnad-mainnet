"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { usePrivy } from "@privy-io/react-auth";
import { useGoalBalance, GOAL_HOLDER_THRESHOLD } from "@/hooks/useGoalBalance";
import { usePlaceBet, useClaimRefund } from "@/hooks/useBetting";
import { useWebSocket } from "@/hooks/useWebSocket";
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
  Wallet,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
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
  fetchComments,
  fetchH2HStats,
  postComment,
  outcomeName,
  outcomeColor,
  formatSol,
  type ApiMatch,
  type ApiBet,
  type MatchComment,
  type H2HStats,
  OUTCOME_HOME,
  OUTCOME_DRAW,
  OUTCOME_AWAY,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Countdown Timer Component ────────────────────────────────────────────────

function CountdownTimer({ matchDate }: { matchDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function update() {
      const kickoff = new Date(matchDate).getTime();
      const diff = kickoff - Date.now();
      if (diff <= 0) {
        setTimeLeft("STARTED");
        setVisible(true);
        return;
      }
      if (diff > 24 * 60 * 60 * 1000) {
        setVisible(false);
        return;
      }
      setVisible(true);
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [matchDate]);

  if (!visible) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-none bg-background border border-amber-500 py-2 px-5">
      <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
      <span className="font-mono text-sm font-semibold text-amber-500">
        {timeLeft === "STARTED" ? "Match has started" : `Betting closes in ${timeLeft}`}
      </span>
    </div>
  );
}

// ─── Betting Panel ────────────────────────────────────────────────────────────

function BettingPanel({
  match,
  authenticated,
  login,
  onBetPlaced,
}: {
  match: ApiMatch;
  authenticated: boolean;
  login: () => void;
  onBetPlaced: () => void;
}) {
  const { placeBet, loading } = usePlaceBet();
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [confirming, setConfirming] = useState(false);

  const solAmount = parseFloat(amount) || 0;
  const fee = solAmount * 0.01;
  const net = solAmount - fee;
  const isValid = solAmount >= 0.01 && selectedOutcome !== null;

  // Projected payout calculation
  const pot = match.total_pot ?? 0;
  const outcomePool = selectedOutcome === OUTCOME_HOME ? (match.total_home ?? 0)
    : selectedOutcome === OUTCOME_DRAW ? (match.total_draw ?? 0)
      : selectedOutcome === OUTCOME_AWAY ? (match.total_away ?? 0) : 0;

  // After your bet: new total pot and new outcome pool
  const newPot = pot + (solAmount * 1e9);
  const newOutcomePool = outcomePool + (solAmount * 1e9);
  const projectedPayout = newOutcomePool > 0
    ? ((solAmount * 1e9) / newOutcomePool) * (newPot * 0.99)
    : 0;
  const multiplier = solAmount > 0 ? projectedPayout / (solAmount * 1e9) : 0;

  const handleBet = async () => {
    if (!isValid || selectedOutcome === null) return;
    try {
      await placeBet(match.api_match_id, selectedOutcome, solAmount);
      onBetPlaced();
      setSelectedOutcome(null);
      setAmount("0.1");
      setConfirming(false);
    } catch {
      // Error already handled by toast
    }
  };

  if (!authenticated) {
    return (
      <Card className="border-border rounded-none shadow-none bg-background mb-8">
        <CardContent className="pt-6 pb-6 text-center space-y-3">
          <Wallet className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="font-bold">Connect Wallet to Bet</h3>
          <p className="text-sm text-muted-foreground">
            Connect your Solana wallet to place bets on this match.
          </p>
          <Button
            onClick={login}
            className="font-mono bg-primary text-background hover:bg-foreground hover:text-background rounded-none transition-colors border-none"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Confirmation view
  if (confirming && isValid) {
    return (
      <Card className="border-2 border-primary rounded-none shadow-none bg-background mb-8">
        <CardContent className="pt-6 pb-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Confirm Your Bet
          </h3>

          <div className="space-y-3 mb-5">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-muted-foreground">Outcome</span>
              <span className={`font-mono text-sm font-bold ${outcomeColor(selectedOutcome)}`}>
                {outcomeName(selectedOutcome)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-muted-foreground">Bet Amount</span>
              <span className="font-mono text-sm font-bold">{solAmount} SOL</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-muted-foreground">Fee (1%)</span>
              <span className="font-mono text-xs text-muted-foreground">{fee.toFixed(4)} SOL</span>
            </div>

            <Separator className="opacity-50" />

            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-muted-foreground">Current Pool</span>
              <span className="font-mono text-xs">{formatSol(pot)} total</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-muted-foreground">Projected Payout</span>
              <span className="font-mono text-sm font-bold text-green-400">
                ~{(projectedPayout / 1e9).toFixed(4)} SOL
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-muted-foreground">Est. Multiplier</span>
              <span className="font-mono text-sm font-bold text-primary">
                {multiplier.toFixed(2)}x
              </span>
            </div>

            <p className="font-mono text-[10px] text-muted-foreground/60 text-center mt-2">
              ⚠ Payout changes as more bets are placed. Final payout depends on total pool at match start.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              className="flex-1 font-mono rounded-none border-border"
            >
              ← Back
            </Button>
            <Button
              onClick={handleBet}
              disabled={loading}
              className="flex-1 font-mono bg-primary text-background hover:bg-foreground hover:text-background rounded-none transition-colors border-none"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  Confirm Bet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border rounded-none shadow-none bg-background mb-8">
      <CardContent className="pt-6 pb-6">
        <h3 className="font-bold mb-1 flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          Place Your Bet
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pick an outcome and bet SOL. Winners share the pot proportionally.
        </p>

        {/* Outcome selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { outcome: OUTCOME_HOME, label: "Home", team: match.home_team, cls: "border-blue-400 bg-blue-400/10 text-blue-400" },
            { outcome: OUTCOME_DRAW, label: "Draw", team: "Draw", cls: "border-yellow-400 bg-yellow-400/10 text-yellow-400" },
            { outcome: OUTCOME_AWAY, label: "Away", team: match.away_team, cls: "border-red-400 bg-red-400/10 text-red-400" },
          ].map(({ outcome, label, team, cls }) => (
            <button
              key={outcome}
              onClick={() => setSelectedOutcome(outcome)}
              className={`rounded-none border-2 p-3 text-center transition-all min-h-[60px]
                ${selectedOutcome === outcome
                  ? cls
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30"
                }`}
            >
              <span className="block font-mono text-xs uppercase tracking-wider">{label}</span>
              <span className="block text-[10px] mt-0.5 truncate max-w-full">{team}</span>
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className="mb-4">
          <label className="block font-mono text-xs text-muted-foreground mb-1.5">
            Amount (SOL)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-none border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
              placeholder="0.01"
            />
          </div>
          {/* Quick amounts */}
          <div className="flex gap-1.5 mt-2">
            {[0.05, 0.1, 0.5, 1].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v.toString())}
                className={`flex-1 rounded-none border px-2 py-1 font-mono text-xs transition-colors
                  ${amount === v.toString()
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
              >
                {v} SOL
              </button>
            ))}
          </div>
        </div>

        {/* Inline projected payout preview */}
        {isValid && (
          <div className="mb-4 rounded-none border border-border/50 bg-secondary/20 px-3 py-2 space-y-1">
            <div className="flex justify-between font-mono text-xs text-muted-foreground">
              <span>Fee (1%)</span>
              <span>{fee.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between font-mono text-xs text-foreground font-bold">
              <span>Projected Payout</span>
              <span className="text-green-400">~{(projectedPayout / 1e9).toFixed(4)} SOL ({multiplier.toFixed(2)}x)</span>
            </div>
          </div>
        )}

        {/* Place bet button — goes to confirmation */}
        <Button
          onClick={() => setConfirming(true)}
          disabled={!isValid}
          className="w-full font-mono bg-primary text-background hover:bg-foreground hover:text-background rounded-none transition-colors border-none disabled:opacity-50"
        >
          <Coins className="mr-2 h-4 w-4" />
          {isValid
            ? `Bet ${solAmount} SOL on ${outcomeName(selectedOutcome)}`
            : selectedOutcome === null
              ? "Select an outcome"
              : "Enter amount (min 0.01 SOL)"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Claim / Refund Panel ─────────────────────────────────────────────────────

function ClaimRefundPanel({
  match,
  userBet,
  onAction,
}: {
  match: ApiMatch;
  userBet: ApiBet | null;
  onAction: () => void;
}) {
  const { claim, refund, loading } = useClaimRefund();

  if (!userBet) return null;
  if (userBet.claimed || userBet.refunded) return null;

  const isResolved = match.resolved === 1;
  const isDraw = match.result === OUTCOME_DRAW;
  const isCancelled = match.status === "CANC" || match.status === "PST";
  const isWinner = isResolved && match.result === userBet.outcome && !isDraw;
  const canClaim = isWinner;
  const canRefund = isDraw || isCancelled;

  if (!canClaim && !canRefund) return null;

  return (
    <Card className={`mb-8 rounded-none border-2 shadow-none bg-background ${canClaim ? "border-green-500" : "border-yellow-500"}`}>
      <CardContent className="pt-6 pb-6 text-center space-y-3">
        {canClaim ? (
          <>
            <CheckCircle className="h-8 w-8 mx-auto text-green-400" />
            <h3 className="font-bold text-green-400">You Won! 🎉</h3>
            <p className="text-sm text-muted-foreground">
              You bet {formatSol(userBet.amount)} on {outcomeName(userBet.outcome)} and won.
              Claim your share of the {formatSol(match.total_pot ?? 0)} pot.
            </p>
            <Button
              onClick={async () => { await claim(match.api_match_id); onAction(); }}
              disabled={loading}
              className="font-mono bg-green-500 text-background hover:bg-green-600 rounded-none transition-colors border-none"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
              Claim Winnings
            </Button>
          </>
        ) : (
          <>
            <RefreshCw className="h-8 w-8 mx-auto text-yellow-400" />
            <h3 className="font-bold text-yellow-400">
              {isCancelled ? "Match Cancelled" : "Match Ended in Draw"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Your {formatSol(userBet.amount)} bet will be refunded in full (no fee).
            </p>
            <Button
              onClick={async () => { await refund(match.api_match_id); onAction(); }}
              disabled={loading}
              className="font-mono bg-yellow-500 text-background hover:bg-yellow-600 rounded-none transition-colors border-none"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Claim Refund
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const params = useParams();
  const id = params.id as string;
  const { authenticated, login } = usePrivy();
  const { isHolder, loading: goalLoading, walletAddress } = useGoalBalance();

  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [bets, setBets] = useState<ApiBet[]>([]);
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [h2h, setH2H] = useState<H2HStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const numId = parseInt(id, 10);
  const { subscribe } = useWebSocket(isNaN(numId) ? undefined : numId);

  const loadData = useCallback(async () => {
    try {
      if (isNaN(numId)) { setError("Invalid match ID"); setLoading(false); return; }
      const [matchData, betsData, commentsData, h2hData] = await Promise.all([
        fetchMatch(numId),
        fetchMatchBets(numId),
        fetchComments(numId),
        fetchH2HStats(numId),
      ]);
      if (!matchData) { setError("Match not found"); }
      else { setMatch(matchData); setBets(betsData); setComments(commentsData); setH2H(h2hData); }
    } catch (e) {
      console.error("Failed to load match:", e);
      setError("Failed to load match data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Live reload on WebSocket events
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "bet_placed" || event.type === "match_resolved" || event.type === "match_updated") {
        loadData();
      }
    });
  }, [subscribe, loadData]);

  // Find current user's bet
  const userBet = walletAddress
    ? bets.find((b) => b.user_wallet.toLowerCase() === walletAddress.toLowerCase()) ?? null
    : null;

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

  const isBettingOpen = !isResolved && match.status === "NS" && new Date(match.match_date).getTime() > Date.now();

  // Group bets by outcome
  const betsByOutcome = [0, 1, 2].map((o) => ({
    outcome: o,
    bets: bets.filter((b) => b.outcome === o),
    total: bets.filter((b) => b.outcome === o).reduce((s, b) => s + b.amount, 0),
  }));

  return (
    <>
      <head>
        <title>{`${match.home_team} vs ${match.away_team} | GoalScore.fun`}</title>
        <meta name="description" content={`Bet SOL on ${match.home_team} vs ${match.away_team}. ${match.league_name}. Live on Solana.`} />
        <meta property="og:title" content={`${match.home_team} vs ${match.away_team} | GoalScore.fun`} />
        <meta property="og:description" content={`Bet SOL on ${match.home_team} vs ${match.away_team}. Live prediction market on Solana.`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${match.home_team} vs ${match.away_team} | GoalScore.fun`} />
        <meta name="twitter:description" content={`Bet SOL on ${match.home_team} vs ${match.away_team}. Live prediction market on Solana.`} />
      </head>

      <div className="min-h-screen">
        <Navbar />

        <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
          {/* Breadcrumb */}
          <div className="mb-6 sm:mb-8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Matches
            </Link>
            {match.oracle_tx_hash && (
              <Button variant="outline" size="sm" className="font-mono text-xs" asChild>
                <a href={`https://solscan.io/tx/${match.oracle_tx_hash}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3 w-3" />
                  View on Solscan
                </a>
              </Button>
            )}
          </div>

          {/* Match Hero */}
          <div className="text-center space-y-4 mb-8 sm:mb-10">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge variant="secondary" className="font-mono text-[10px] tracking-widest uppercase">
                {match.league_id}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {isResolved ? "Resolved" : match.status === "NS" ? "Upcoming" : match.status}
              </Badge>
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-10">
              <div className="text-right flex-1 flex flex-col items-end gap-2 min-w-0">
                <TeamCrest src={match.home_logo} alt={match.home_team} />
                <p className="text-lg font-bold tracking-tight sm:text-3xl truncate max-w-full">{match.home_team}</p>
              </div>
              <div className="flex flex-col items-center shrink-0">
                {match.status === "FT" || match.status === "LIVE" ? (
                  <span className="font-mono text-3xl font-bold">
                    {match.home_score ?? 0} – {match.away_score ?? 0}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground font-mono">VS</span>
                )}
              </div>
              <div className="text-left flex-1 flex flex-col items-start gap-2 min-w-0">
                <TeamCrest src={match.away_logo} alt={match.away_team} />
                <p className="text-lg font-bold tracking-tight sm:text-3xl truncate max-w-full">{match.away_team}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground font-mono">{formatDate(match.match_date)}</p>

            {/* Live countdown timer */}
            {match.status === "NS" && <CountdownTimer matchDate={match.match_date} />}

            {/* Oracle prediction badge */}
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
                  <a href={`https://solscan.io/tx/${match.resolve_tx_hash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono text-primary/60 hover:text-primary transition-colors">
                    <ExternalLink className="h-2.5 w-2.5" />
                    Resolution tx
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Claim / Refund for current user */}
          {isResolved && (
            <ClaimRefundPanel match={match} userBet={userBet} onAction={loadData} />
          )}

          {/* Pot / distribution stats */}
          {pot > 0 && (
            <div className="mb-8 rounded-none border border-border bg-background p-4 sm:p-5">
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
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{match.oracle_analysis}</div>
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

          {/* Head-to-Head Stats */}
          {h2h?.available && (
            <Card className="border-border rounded-none shadow-none bg-background mb-8">
              <CardContent className="pt-5 pb-5">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  Head-to-Head ({h2h.numberOfMatches} matches)
                </h3>

                {/* H2H Record */}
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div>
                    <div className="font-mono text-lg font-bold text-blue-400">{h2h.homeTeam?.wins ?? 0}</div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">{match.home_team?.split(' ').pop()} Wins</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-yellow-400">{h2h.homeTeam?.draws ?? 0}</div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Draws</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-red-400">{h2h.awayTeam?.wins ?? 0}</div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">{match.away_team?.split(' ').pop()} Wins</div>
                  </div>
                </div>

                {/* Recent matches */}
                {h2h.recentMatches && h2h.recentMatches.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recent Encounters</p>
                    <div className="space-y-1">
                      {h2h.recentMatches.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 font-mono text-xs border border-border/50 px-2 py-1">
                          <span className="text-muted-foreground text-[10px] w-14 shrink-0">
                            {new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                          <span className="truncate flex-1 text-right">{m.home}</span>
                          <span className="font-bold text-foreground">
                            {m.homeScore ?? "?"} - {m.awayScore ?? "?"}
                          </span>
                          <span className="truncate flex-1">{m.away}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Inline Betting Panel */}
          {isBettingOpen && (
            <BettingPanel
              match={match}
              authenticated={authenticated}
              login={login}
              onBetPlaced={loadData}
            />
          )}

          {/* Show if betting closed but not yet resolved */}
          {!isBettingOpen && !isResolved && match.status === "NS" && (
            <Card className="border-border rounded-none shadow-none bg-background mb-8">
              <CardContent className="pt-6 pb-6 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-mono">Betting is closed for this match</p>
              </CardContent>
            </Card>
          )}

          {/* Your Bet summary */}
          {userBet && (
            <Card className="border-primary/30 rounded-none shadow-none bg-background mb-8">
              <CardContent className="pt-5 pb-5">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-primary" />
                  Your Bet
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className={`font-mono text-sm font-bold ${outcomeColor(userBet.outcome)}`}>
                      {outcomeName(userBet.outcome)}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Prediction</div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-foreground">
                      {formatSol(userBet.amount)}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Amount</div>
                  </div>
                  <div>
                    <div className={`font-mono text-sm font-bold ${userBet.claimed ? "text-green-400" :
                      userBet.refunded ? "text-yellow-400" :
                        isResolved && match.result === userBet.outcome ? "text-green-400" :
                          isResolved ? "text-red-400" :
                            "text-muted-foreground"
                      }`}>
                      {userBet.claimed ? "Claimed ✓" :
                        userBet.refunded ? "Refunded ✓" :
                          isResolved && match.result === userBet.outcome ? "Won! 🎉" :
                            isResolved ? "Lost" :
                              "Pending"}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Status</div>
                  </div>
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
                      <div key={i} className="flex items-center justify-between gap-2 rounded-none border border-border bg-background px-3 sm:px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link href={`/u/${bet.user_wallet}`} className="font-mono text-xs text-primary hover:underline truncate">
                            {bet.user_wallet.slice(0, 6)}…{bet.user_wallet.slice(-4)}
                          </Link>
                          {walletAddress && bet.user_wallet.toLowerCase() === walletAddress.toLowerCase() && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary shrink-0">YOU</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                            <a href={`https://solscan.io/tx/${bet.tx_hash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-primary/40 hover:text-primary transition-colors">
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

          {/* ── Match Chat ── */}
          <Separator className="mb-8 opacity-50" />
          <div className="space-y-4 mb-8">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-primary" />
              Match Chat
              <span className="font-mono text-xs text-muted-foreground font-normal ml-auto">{comments.length}</span>
            </h3>

            {/* Comment input */}
            {authenticated && walletAddress ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment…"
                  className="flex-1 rounded-none border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                  maxLength={500}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      const msg = input.value.trim();
                      if (msg && walletAddress) {
                        input.disabled = true;
                        await postComment(match.api_match_id, walletAddress, msg);
                        input.value = "";
                        input.disabled = false;
                        loadData();
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">
                Connect your wallet to chat
              </p>
            )}

            {/* Comments list */}
            {comments.length === 0 ? (
              <div className="border border-border rounded-none py-6 text-center">
                <p className="font-mono text-xs text-muted-foreground">No comments yet — be the first!</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 border border-border bg-background p-2">
                    <Image
                      src={c.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${c.avatar_seed}`}
                      width={20}
                      height={20}
                      alt=""
                      className="h-5 w-5 rounded-none border border-border shrink-0 mt-0.5 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={c.username ? `/u/@${c.username}` : `/u/${c.wallet}`}
                          className="font-mono text-[10px] font-bold text-primary hover:underline truncate"
                        >
                          {c.username ? `@${c.username}` : `${c.wallet.slice(0, 6)}…${c.wallet.slice(-4)}`}
                        </Link>
                        <span className="font-mono text-[9px] text-muted-foreground shrink-0">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-foreground/90 break-words">{c.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
