"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, ArrowLeft } from "lucide-react";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/api";

function shortAddr(addr: string) {
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function LeaderboardPage() {
    const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchLeaderboard();
                setPlayers(data);
            } catch (e) {
                console.error("Failed to load leaderboard:", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

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
                        Top players ranked by win rate
                    </p>
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
                    <div className="space-y-2">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                            <div className="col-span-1">#</div>
                            <div className="col-span-4">Player</div>
                            <div className="col-span-2 text-right">W/L</div>
                            <div className="col-span-2 text-right">Win %</div>
                            <div className="col-span-3 text-right">Wagered</div>
                        </div>

                        {players.map((player, i) => (
                            <Card key={player.wallet} className="border-border rounded-none shadow-none bg-background hover:border-primary/30 transition-colors">
                                <CardContent className="py-3 px-3">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-1 font-mono text-xs text-muted-foreground">
                                            {i + 1}
                                        </div>
                                        <div className="col-span-4">
                                            <Link
                                                href={`/u/${player.wallet}`}
                                                className="font-mono text-xs hover:text-primary transition-colors"
                                            >
                                                {shortAddr(player.wallet)}
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
                                                className={`text-[9px] font-mono rounded-none ${player.win_rate >= 60
                                                        ? "border-green-400/30 text-green-400"
                                                        : player.win_rate >= 40
                                                            ? "border-yellow-400/30 text-yellow-400"
                                                            : "border-red-400/30 text-red-400"
                                                    }`}
                                            >
                                                {player.win_rate.toFixed(0)}%
                                            </Badge>
                                        </div>
                                        <div className="col-span-3 text-right font-mono text-xs text-muted-foreground">
                                            {(player.total_wagered / 1e9).toFixed(2)} SOL
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
