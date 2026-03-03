"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Lock, Code2, Database, MessageSquare, Target } from "lucide-react";
import { useGoalBalance } from "@/hooks/useGoalBalance";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { MotionWrapper } from "@/components/ui/motion-wrapper";

const GOAL_API_DOCS_THRESHOLD = 2000000;

const ENDPOINTS = [
    {
        method: "GET",
        path: "/api/matches/active",
        title: "Get Active Matches",
        desc: "Fetch all matches that are currently open for betting.",
        response: `{\n  "matches": [\n    {\n      "id": 1,\n      "home_team": "Arsenal",\n      "away_team": "Chelsea",\n      "kickoff": "2024-05-15T19:00:00Z"\n    }\n  ]\n}`
    },
    {
        method: "GET",
        path: "/api/matches/:id/h2h",
        title: "Get Match Head-to-Head",
        desc: "Fetch historical H2H records and recent encounters.",
        response: `{\n  "available": true,\n  "numberOfMatches": 10,\n  "homeTeam": { "wins": 4, "draws": 2, "losses": 4 },\n  "recentMatches": [...]\n}`
    },
    {
        method: "GET",
        path: "/api/matches/oracle/stats",
        title: "AI Accuracy Stats",
        desc: "Get the global win rate and total predictions of the AI bot.",
        response: `{\n  "total_predictions": 156,\n  "resolved": 140,\n  "correct": 98,\n  "win_rate": 70\n}`
    },
    {
        method: "GET",
        path: "/api/leaderboard",
        title: "Global Leaderboard",
        desc: "Fetch the top bettors ranked by win rate, wagered amount, or profit.",
        response: `{\n  "leaderboard": [\n    {\n      "wallet": "7x9...",\n      "username": "whale",\n      "wins": 45,\n      "win_rate": 82.5\n    }\n  ]\n}`
    }
];

export default function ApiDocsPage() {
    const { ready, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const wallet = wallets[0]?.address || null;
    const { balance, loading } = useGoalBalance();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isHolder = balance >= GOAL_API_DOCS_THRESHOLD;
    const needsWallet = !authenticated || !wallet;

    if (!mounted) return null;

    return (
        <div className="min-h-screen">
            <Navbar />

            <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
                <div className="mb-8">
                    <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </Link>
                    <div className="flex items-center gap-3">
                        <BookOpen className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold font-mono">API Documentation</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-9">
                        Build on top of GoalScore using our public read-only API endpoints.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                ) : needsWallet ? (
                    <Card className="border-border rounded-none shadow-none bg-background text-center py-16">
                        <CardContent>
                            <Lock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h2 className="text-lg font-bold font-mono mb-2">Wallet Connection Required</h2>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                Please connect your wallet to verify your $GOAL balance. Holding {GOAL_API_DOCS_THRESHOLD.toLocaleString()} $GOAL is required to view the API documentation.
                            </p>
                        </CardContent>
                    </Card>
                ) : !isHolder ? (
                    <Card className="border-border rounded-none shadow-none bg-background text-center py-16 px-4">
                        <CardContent>
                            <div className="mx-auto flex h-16 w-16 items-center justify-center bg-red-500/10 mb-6">
                                <Lock className="h-8 w-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold font-mono mb-2 text-foreground">Access Denied</h2>
                            <p className="text-sm text-muted-foreground mx-auto max-w-md leading-relaxed mb-6">
                                The API Documentation is an exclusive resource for our strongest supporters. You currently hold <span className="font-bold text-foreground font-mono">{balance.toLocaleString()}</span> $GOAL.
                            </p>
                            <div className="inline-block p-4 border border-red-500/30 bg-red-500/5">
                                <p className="font-mono text-sm text-red-400 font-bold uppercase tracking-wider">
                                    Requirement: {GOAL_API_DOCS_THRESHOLD.toLocaleString()} $GOAL
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <MotionWrapper delay={0.1}>
                        <div className="space-y-6">
                            <div className="border border-primary/30 bg-primary/5 p-4 mb-8">
                                <h3 className="font-bold font-mono text-sm text-primary mb-2 flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    Base URL
                                </h3>
                                <code className="text-xs font-mono text-foreground select-all">
                                    https://goalscore.fun
                                </code>
                            </div>

                            {ENDPOINTS.map((ep, i) => (
                                <Card key={i} className="border-border rounded-none shadow-none bg-background overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
                                            <span className="bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold font-mono uppercase rounded-sm">
                                                {ep.method}
                                            </span>
                                            <code className="text-sm font-mono font-bold">{ep.path}</code>
                                        </div>
                                        <div className="p-4 sm:p-6">
                                            <h3 className="font-bold text-base mb-1">{ep.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-4">{ep.desc}</p>

                                            <div className="bg-secondary/30 border border-border/50 rounded-none p-4">
                                                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Response Example</p>
                                                <pre className="text-xs font-mono text-foreground overflow-x-auto">
                                                    {ep.response}
                                                </pre>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </MotionWrapper>
                )}
            </div>

            <Footer />
        </div>
    );
}
