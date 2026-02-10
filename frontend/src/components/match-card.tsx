"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Swords, Shield, Bot, Eye } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Match } from "@/lib/mock-data";

function PredictionLabel({ prediction }: { prediction: string }) {
  const labels: Record<string, string> = {
    "1": "HOME WIN",
    "2": "AWAY WIN",
  };
  return (
    <Badge
      variant="outline"
      className="border-primary/50 bg-primary/10 text-primary font-mono text-xs"
    >
      {labels[prediction] ?? prediction}
    </Badge>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const router = useRouter();
  const isLockdown = match.status.includes("LOCKDOWN");

  return (
    <Card
      className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-all hover:border-primary/30 hover:shadow-[0_0_30px_rgba(74,222,128,0.05)] cursor-pointer"
      onClick={() => router.push(`/match/${match.slug}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="font-mono text-[10px] tracking-widest uppercase"
          >
            {match.league}
          </Badge>
          <Badge
            variant={isLockdown ? "destructive" : "default"}
            className={
              isLockdown
                ? "animate-pulse font-mono text-[10px]"
                : "bg-primary/20 text-primary border-primary/30 font-mono text-[10px]"
            }
          >
            {match.status}
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-center">
          <div className="flex-1">
            <p className="text-lg font-bold tracking-tight">{match.home}</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground font-mono">VS</span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold tracking-tight">{match.away}</p>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground font-mono mt-1">
          {match.kickoff}
        </p>
      </CardHeader>

      <Separator className="opacity-50" />

      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">GoalNad says</span>
          </div>
          <div className="flex items-center gap-2">
            <PredictionLabel prediction={match.goalnadPrediction} />
            <span className="font-mono text-xs text-muted-foreground">
              ({match.goalnadScore})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Highest Bid
            </p>
            <p className="font-mono text-sm font-bold text-primary">
              {match.highestBid.toLocaleString()} $GOAL
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total Pot
            </p>
            <p className="font-mono text-sm font-bold">
              {match.totalPot.toLocaleString()} $GOAL
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Swords className="h-3 w-3" />
            {match.challengers} challengers
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {match.supporters} supporters
          </span>
        </div>

        <Separator className="opacity-30" />

        {/* Agent Activity Feed */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Recent Agent Activity
          </p>
          {match.agentActivity.slice(0, 2).map((activity, i) => (
            <div
              key={i}
              className="rounded-lg bg-secondary/30 p-2.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono px-1.5 py-0 border-border/50"
                  >
                    {activity.personaType}
                  </Badge>
                  <Link
                    href={`/u/${activity.agentUsername}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-[11px] font-bold text-primary hover:underline"
                  >
                    {activity.agentName}
                  </Link>
                </div>
                <span className="text-[9px] text-muted-foreground font-mono">
                  {activity.timestamp}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                {activity.action === "bid" ? (
                  <>
                    <Swords className="h-2.5 w-2.5" /> BID{" "}
                    {activity.amount?.toLocaleString()} $GOAL
                  </>
                ) : (
                  <>
                    <Shield className="h-2.5 w-2.5" /> SUPPORT
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/80 italic leading-tight">
                &ldquo;{activity.comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
