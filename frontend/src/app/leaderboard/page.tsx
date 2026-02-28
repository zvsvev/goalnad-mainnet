"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, ArrowLeft, ArrowUpDown } from "lucide-react";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/api";

function avatarUrl(entry: LeaderboardEntry): string {
    if (entry.avatar_url) return entry.avatar_url;
    const seed = entry.avatar_seed || entry.wallet;
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
}

function displayName(entry: LeaderboardEntry): string {
    if (entry.username) return `@${entry.username}`;
    if (entry.name) return entry.name;
    return entry.wallet.slice(0, 6) + "…" + entry.wallet.slice(-4);
}

function profileLink(entry: LeaderboardEntry): string {
    if (entry.username) return `/u/@${entry.username}`;
    return `/u/${entry.wallet}`;
}

type Period = "all" | "month" | "week";
type Sort = "wins" | "wagered" | "winrate";

export default function LeaderboardPage() {
    const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>("all");
    const [sort, setSort] = useState<Sort>("wins");

    useEffect(() => {
        setLoading(true);
        fetchLeaderboard({ period, sort })
            .then(setPlayers)
            .catch(() => setPlayers([]))
            .finally(() => setLoading(false));
    }, [period, sort]);

    const periods: { value: Period; label: string }[] = [
        { value: "all", label: "All Time" },
        { value: "month", label: "Monthly" },
        { value: "week", label: "Weekly" },
    ];

    const sorts: { value: Sort; label: string }[] = [
        { value: "wins", label: "Wins" },
        { value: "winrate", label: "Win %" },
        { value: "wagered", label: "Wagered" },
    ];

    return (
        <div className="min-h-screen">
            <Navbar />

            <div className="mx-auto max-w-3xl px-4 py-6 sm:py-12">
                <div className="mb-6 sm:mb-8">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Matches
                    </Link>
                    <div className="flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold font-mono">Leaderboard</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-9">
                        Top players ranked by performance
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    {/* Period tabs */}
                    <div className="flex items-center gap-1">
                        {periods.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1.5 rounded-none font-mono text-xs transition-all border border-border ${period === p.value
                                        ? "bg-foreground text-background"
                                        : "bg-background text-muted-foreground hover:bg-foreground hover:text-background"
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-1 ml-auto">
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        {sorts.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => setSort(s.value)}
                                className={`px-2.5 py-1 rounded-none font-mono text-[10px] transition-all border border-border ${sort === s.value
                                        ? "bg-primary text-background border-primary"
                                        : "bg-background text-muted-foreground hover:border-primary/50"
                                    }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : players.length === 0 ? (
                    <Card className="border-border rounded-none shadow-none bg-background">
                        <CardContent className="py-16 text-center">
                            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="font-mono text-sm text-muted-foreground">
                                No players ranked yet — be the first to beat the Oracle
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-1.5">
                        {/* Header */}
                        <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                            <div className="col-span-1">#</div>
                            <div className="col-span-4">Player</div>
                            <div className="col-span-2 text-right">W/L</div>
                            <div className="col-span-2 text-right">Win %</div>
                            <div className="col-span-3 text-right">Wagered</div>
                        </div>

                        {players.map((player, i) => (
                            <Card
                                key={player.wallet}
                                className={`border-border rounded-none shadow-none transition-colors hover:border-primary/30 ${i === 0 ? "bg-primary/5 border-primary/20" : "bg-background"
                                    }`}
                            >
                                <CardContent className="py-3 px-3">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-1 font-mono text-xs text-muted-foreground font-bold">
                                            {i + 1}
                                        </div>
                                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                                            <img
                                                src={avatarUrl(player)}
                                                alt=""
                                                className="h-7 w-7 rounded-none border border-border shrink-0 object-cover"
                                            />
                                            <Link
                                                href={profileLink(player)}
                                                className="font-mono text-xs hover:text-primary transition-colors truncate"
                                            >
                                                {displayName(player)}
                                            </Link>
                                        </div>
                                        <div className="col-span-2 text-right font-mono text-xs">
                                            <span className="text-green-400">{player.wins}</span>
                                            <span className="text-muted-foreground">/</span>
                                            <span className="text-red-400">{player.losses}</span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] font-mono rounded-none ${player.winRate >= 60
                                                        ? "border-green-400/30 text-green-400"
                                                        : player.winRate >= 40
                                                            ? "border-yellow-400/30 text-yellow-400"
                                                            : "border-red-400/30 text-red-400"
                                                    }`}
                                            >
                                                {player.winRate}%
                                            </Badge>
                                        </div>
                                        <div className="col-span-3 text-right font-mono text-xs text-muted-foreground">
                                            {(player.totalBidAmount / 1e9).toFixed(2)} SOL
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
