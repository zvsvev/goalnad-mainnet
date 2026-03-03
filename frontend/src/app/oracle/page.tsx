"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, ArrowLeft, Lock, CheckCircle, XCircle, Minus } from "lucide-react";
import { useGoalBalance, GOAL_HOLDER_THRESHOLD } from "@/hooks/useGoalBalance";
import {
    fetchOracleStats,
    fetchOraclePredictions,
    outcomeName,
    outcomeColor,
    type OracleStats,
    type OraclePredictionEntry,
} from "@/lib/api";

export default function OraclePage() {
    const [stats, setStats] = useState<OracleStats | null>(null);
    const [predictions, setPredictions] = useState<OraclePredictionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const { isHolder } = useGoalBalance();

    useEffect(() => {
        Promise.all([fetchOracleStats(), fetchOraclePredictions()])
            .then(([s, p]) => { setStats(s); setPredictions(p); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const resolved = predictions.filter((p) => p.resolved === 1);
    const pending = predictions.filter((p) => p.resolved !== 1);

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
                        <Bot className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold font-mono">AI Predictions</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-9">
                        AI Oracle track record — all predictions and results
                    </p>
                </div>

                {/* Gate check */}
                {!isHolder ? (
                    <Card className="border-border rounded-none shadow-none bg-background">
                        <CardContent className="py-16 text-center space-y-3">
                            <Lock className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                            <p className="font-mono text-sm text-muted-foreground">
                                Hold <span className="text-primary font-bold">{GOAL_HOLDER_THRESHOLD.toLocaleString()} $GOAL</span> to view Oracle prediction history
                            </p>
                            <Link href="/goal" className="inline-block font-mono text-xs text-primary hover:underline">
                                Learn more about $GOAL →
                            </Link>
                        </CardContent>
                    </Card>
                ) : loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {/* Stats summary */}
                        {stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                                {[
                                    { label: "Predictions", value: stats.totalPredictions },
                                    { label: "Resolved", value: stats.totalResolved },
                                    { label: "Correct", value: stats.correct },
                                    { label: "Accuracy", value: stats.accuracy ? `${stats.accuracy}%` : "N/A" },
                                ].map((s) => (
                                    <div key={s.label} className="border border-border rounded-none bg-background p-3 text-center">
                                        <div className="font-mono text-lg font-bold text-primary">{s.value}</div>
                                        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pending predictions */}
                        {pending.length > 0 && (
                            <div className="mb-8">
                                <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
                                    Upcoming ({pending.length})
                                </h2>
                                <div className="space-y-1.5">
                                    {pending.map((p) => (
                                        <PredictionRow key={p.api_match_id} prediction={p} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resolved predictions */}
                        <div>
                            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
                                Results ({resolved.length})
                            </h2>
                            {resolved.length === 0 ? (
                                <p className="font-mono text-sm text-muted-foreground text-center py-8">
                                    No resolved predictions yet
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    {resolved.map((p) => (
                                        <PredictionRow key={p.api_match_id} prediction={p} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <Footer />
        </div>
    );
}

function PredictionRow({ prediction: p }: { prediction: OraclePredictionEntry }) {
    const isResolved = p.resolved === 1;
    const oracleCorrect = isResolved && p.result === p.oracle_prediction;
    const isDraw = isResolved && p.result === 1; // OUTCOME_DRAW

    const matchDate = new Date(p.match_date);
    const dateStr = matchDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    return (
        <Link href={`/match/${p.api_match_id}`}>
            <Card className="border-border rounded-none shadow-none bg-background hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="py-3 px-3">
                    <div className="flex items-center gap-3">
                        {/* Result icon */}
                        <div className="shrink-0 w-6">
                            {isResolved ? (
                                oracleCorrect ? (
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : isDraw ? (
                                    <Minus className="h-4 w-4 text-yellow-400" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-400" />
                                )
                            ) : (
                                <Bot className="h-4 w-4 text-primary" />
                            )}
                        </div>

                        {/* Teams */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold truncate">
                                    {p.home_team} vs {p.away_team}
                                </span>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 border-border rounded-none shrink-0">
                                    {p.league_id}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {dateStr}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">·</span>
                                <span className={`font-mono text-[10px] font-bold ${outcomeColor(p.oracle_prediction)}`}>
                                    Oracle: {outcomeName(p.oracle_prediction)} {p.oracle_score && `(${p.oracle_score})`}
                                </span>
                                {p.oracle_conviction && (
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        {p.oracle_conviction}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Score / Status */}
                        <div className="shrink-0 text-right">
                            {isResolved && p.home_score !== null ? (
                                <div>
                                    <span className="font-mono text-sm font-bold">
                                        {p.home_score} - {p.away_score}
                                    </span>
                                    <div className={`font-mono text-[9px] ${oracleCorrect ? "text-green-400" : isDraw ? "text-yellow-400" : "text-red-400"}`}>
                                        {oracleCorrect ? "✓ Correct" : isDraw ? "— Draw" : "✗ Wrong"}
                                    </div>
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary rounded-none text-primary">
                                    PENDING
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
