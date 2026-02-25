"use client";

import Link from "next/link";
import Image from "next/image";
import { Bot, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApiMatch } from "@/lib/api";
import { outcomeName, outcomeColor, formatSol } from "@/lib/api";
import { parseApiDate } from "@/lib/utils";

function getBetCountdown(matchDate: string): string | null {
  const kickoff = parseApiDate(matchDate).getTime();
  const diff = kickoff - Date.now();
  if (diff <= 0 || diff > 24 * 60 * 60 * 1000) return null;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function TeamCrest({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image src={src} alt={alt} width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
  );
}

export function FixtureCard({ match }: { match: ApiMatch }) {
  const isFinished = match.status === "FT";
  const isLive = match.status === "LIVE";
  const isResolved = match.resolved === 1 && match.result !== null;
  const hasPrediction = match.oracle_prediction !== null && match.oracle_prediction !== undefined;
  const betCountdown = match.status === "NS" ? getBetCountdown(match.match_date) : null;
  const pot = match.total_pot ?? 0;

  // Is Oracle correct?
  const oracleCorrect = isResolved && match.result !== null && match.result === match.oracle_prediction;
  // Is draw (outcome 1)
  const isDraw = isResolved && match.result === 1;

  return (
    <Link href={`/match/${match.api_match_id}`} className="block">
      <Card className={`border-border/50 bg-card/80 backdrop-blur transition-all hover:border-primary/30 hover:scale-[1.01] cursor-pointer ${hasPrediction ? "ring-1 ring-primary/20" : ""}`}>
        <CardContent className="py-3 px-4">
          {/* Top: league + status */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="secondary" className="font-mono text-[9px] tracking-widest uppercase">
              {match.league_id}
            </Badge>
            <div className="flex items-center gap-2">
              {pot > 0 && (
                <span className="font-mono text-[10px] text-primary font-bold">{formatSol(pot)}</span>
              )}
              <Badge
                variant={isLive ? "destructive" : "secondary"}
                className={`font-mono text-[9px] ${isLive ? "animate-pulse" : ""}`}
              >
                {isResolved ? "FT" : match.status === "NS" ? "Open" : match.status}
              </Badge>
            </div>
          </div>

          {/* Match row */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex flex-1 items-center gap-2 justify-end min-w-0">
              <span className="text-sm font-semibold tracking-tight text-right truncate">{match.home_team}</span>
              <TeamCrest src={match.home_logo} alt={match.home_team} />
            </div>
            <div className="flex-shrink-0 min-w-[56px] text-center">
              {isFinished || isLive ? (
                <span className="font-mono text-lg font-bold">
                  {match.home_score ?? 0}
                  <span className="text-muted-foreground mx-1">–</span>
                  {match.away_score ?? 0}
                </span>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">
                  {parseApiDate(match.match_date).toLocaleTimeString("en-GB", {
                    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
                  })}
                </span>
              )}
            </div>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <TeamCrest src={match.away_logo} alt={match.away_team} />
              <span className="text-sm font-semibold tracking-tight truncate">{match.away_team}</span>
            </div>
          </div>

          {/* Bet closing countdown */}
          {betCountdown && (
            <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 py-1.5 px-3">
              <Clock className="h-3 w-3 text-amber-400 animate-pulse" />
              <span className="text-[10px] font-mono font-semibold text-amber-400">
                Betting closes in {betCountdown}
              </span>
            </div>
          )}

          {/* Oracle Prediction */}
          {hasPrediction && (
            <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider">
                    Oracle says
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`border-primary/50 bg-primary/10 font-mono text-[10px] px-1.5 ${outcomeColor(match.oracle_prediction)}`}>
                    {outcomeName(match.oracle_prediction)}
                  </Badge>
                  {match.oracle_score && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ({match.oracle_score})
                    </span>
                  )}
                </div>
              </div>
              {match.oracle_conviction !== null && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${match.oracle_conviction}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {match.oracle_conviction}% conviction
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Resolved result banner */}
          {isResolved && match.result !== null && (
            <div className={`mt-2 flex items-center justify-between rounded-lg p-2 ${
              isDraw ? "bg-yellow-500/10 border border-yellow-500/20"
                : oracleCorrect ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDraw ? "text-yellow-400" : oracleCorrect ? "text-emerald-400" : "text-red-400"
              }`}>
                {isDraw ? "🤝 Draw" : oracleCorrect ? "✅ Oracle Right" : "❌ Oracle Wrong"}
                {" · "}
                <span className={outcomeColor(match.result)}>{outcomeName(match.result)}</span>
              </span>
              {match.resolve_tx_hash && (
                <a
                  href={`https://solscan.io/tx/${match.resolve_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[9px] font-mono text-primary/50 hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  TX
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
