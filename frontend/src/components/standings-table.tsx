"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { fetchStandings, type StandingEntry } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const LEAGUES = [
    { code: "PL", name: "Premier League" },
    { code: "SA", name: "Serie A" },
];

export function StandingsTable() {
    const [active, setActive] = useState("PL");
    const [table, setTable] = useState<StandingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchStandings(active)
            .then((res) => {
                const total = res.standings?.find((s) => s.type === "TOTAL");
                setTable(total?.table || []);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [active]);

    return (
        <div>
            {/* Tab selector */}
            <div className="flex gap-2 mb-4">
                {LEAGUES.map((l) => (
                    <button
                        key={l.code}
                        onClick={() => setActive(l.code)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${active === l.code
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                            }`}
                    >
                        {l.name}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}

            {error && (
                <p className="text-sm text-red-400 font-mono py-4">Failed to load standings</p>
            )}

            {!loading && !error && (
                <div className="overflow-x-auto rounded-lg border border-border/50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/50 bg-secondary/30">
                                <th className="p-2 text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-8">#</th>
                                <th className="p-2 text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Team</th>
                                <th className="p-2 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-8">P</th>
                                <th className="p-2 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-8">W</th>
                                <th className="p-2 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-8">D</th>
                                <th className="p-2 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-8">L</th>
                                <th className="p-2 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider hidden sm:table-cell w-10">GD</th>
                                <th className="p-2 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-10 font-bold">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {table.map((row, i) => (
                                <tr
                                    key={row.team.id}
                                    className={`border-b border-border/30 transition-colors hover:bg-secondary/20 ${i < 4 ? "border-l-2 border-l-primary/50" : ""
                                        }`}
                                >
                                    <td className="p-2 font-mono text-xs text-muted-foreground">{row.position}</td>
                                    <td className="p-2">
                                        <div className="flex items-center gap-2">
                                            {row.team.crest ? (
                                                <Image
                                                    src={row.team.crest}
                                                    alt={row.team.shortName}
                                                    width={20}
                                                    height={20}
                                                    className="h-5 w-5 object-contain"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="h-5 w-5 rounded-full bg-secondary" />
                                            )}
                                            <span className="font-semibold text-xs truncate hidden sm:inline">
                                                {row.team.shortName}
                                            </span>
                                            <span className="font-semibold text-xs truncate sm:hidden">
                                                {row.team.tla}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center font-mono text-xs text-muted-foreground">{row.playedGames}</td>
                                    <td className="p-2 text-center font-mono text-xs">{row.won}</td>
                                    <td className="p-2 text-center font-mono text-xs text-muted-foreground">{row.draw}</td>
                                    <td className="p-2 text-center font-mono text-xs text-muted-foreground">{row.lost}</td>
                                    <td className="p-2 text-center font-mono text-xs text-muted-foreground hidden sm:table-cell">
                                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                                    </td>
                                    <td className="p-2 text-center font-mono text-xs font-bold text-primary">{row.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
