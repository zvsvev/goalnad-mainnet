"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApiMatch } from "@/lib/api";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    NS: { label: "Upcoming", variant: "secondary" },
    LIVE: { label: "LIVE", variant: "destructive" },
    FT: { label: "FT", variant: "default" },
    PST: { label: "Postponed", variant: "secondary" },
    CANC: { label: "Cancelled", variant: "secondary" },
};

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
    });
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
        <Image
            src={src}
            alt={alt}
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            unoptimized
        />
    );
}

export function FixtureCard({ match }: { match: ApiMatch }) {
    const statusInfo = STATUS_LABELS[match.status] || { label: match.status, variant: "secondary" as const };
    const isFinished = match.status === "FT";
    const isLive = match.status === "LIVE";

    return (
        <Card className="border-border/50 bg-card/80 backdrop-blur transition-all hover:border-primary/20">
            <CardContent className="py-3 px-4">
                {/* Top: league + status */}
                <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="font-mono text-[9px] tracking-widest uppercase">
                        {match.league_id}
                    </Badge>
                    <div className="flex items-center gap-2">
                        {match.round && (
                            <span className="text-[10px] text-muted-foreground font-mono">{match.round}</span>
                        )}
                        <Badge
                            variant={statusInfo.variant}
                            className={isLive ? "animate-pulse font-mono text-[9px]" : "font-mono text-[9px]"}
                        >
                            {statusInfo.label}
                        </Badge>
                    </div>
                </div>

                {/* Match row */}
                <div className="flex items-center gap-3">
                    {/* Home */}
                    <div className="flex flex-1 items-center gap-2 justify-end">
                        <span className="text-sm font-semibold tracking-tight text-right truncate">
                            {match.home_team}
                        </span>
                        <TeamCrest src={match.home_logo} alt={match.home_team} />
                    </div>

                    {/* Score / Time */}
                    <div className="flex-shrink-0 min-w-[56px] text-center">
                        {isFinished || isLive ? (
                            <span className="font-mono text-lg font-bold">
                                {match.home_score ?? 0}
                                <span className="text-muted-foreground mx-1">-</span>
                                {match.away_score ?? 0}
                            </span>
                        ) : (
                            <span className="font-mono text-xs text-muted-foreground">
                                {new Date(match.match_date).toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "UTC",
                                })}
                            </span>
                        )}
                    </div>

                    {/* Away */}
                    <div className="flex flex-1 items-center gap-2">
                        <TeamCrest src={match.away_logo} alt={match.away_team} />
                        <span className="text-sm font-semibold tracking-tight truncate">
                            {match.away_team}
                        </span>
                    </div>
                </div>

                {/* Date */}
                {!isFinished && !isLive && (
                    <p className="text-center text-[10px] text-muted-foreground font-mono mt-2">
                        {formatDate(match.match_date)}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
