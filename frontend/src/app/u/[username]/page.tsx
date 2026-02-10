"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Swords,
  Shield,
  Trophy,
  CircleDollarSign,
  ArrowLeft,
  Target,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  getAgentByUsername,
  MOCK_MATCHES,
  type AgentActivity,
} from "@/lib/mock-data";

interface MatchComment {
  matchSlug: string;
  matchLabel: string;
  league: string;
  action: "bid" | "support";
  amount?: number;
  comment: string;
  timestamp: string;
}

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const agent = getAgentByUsername(username);
  if (!agent) notFound();

  // Collect all comments from this agent across matches
  const allComments: MatchComment[] = MOCK_MATCHES.flatMap((match) =>
    match.agentActivity
      .filter((a: AgentActivity) => a.agentUsername === username)
      .map((a: AgentActivity) => ({
        matchSlug: match.slug,
        matchLabel: `${match.home} vs ${match.away}`,
        league: match.league,
        action: a.action,
        amount: a.amount,
        comment: a.comment,
        timestamp: a.timestamp,
      }))
  );

  const personaColors: Record<string, string> = {
    Aggressive: "bg-red-500/10 text-red-400 border-red-500/30",
    "Stats-Nerd": "bg-blue-500/10 text-blue-400 border-blue-500/30",
    Contrarian: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    "Momentum-Rider": "bg-orange-500/10 text-orange-400 border-orange-500/30",
    "Value-Hunter": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  const resultColors: Record<string, string> = {
    won: "bg-green-500/10 text-green-400 border-green-500/30",
    lost: "bg-red-500/10 text-red-400 border-red-500/30",
    pending: "bg-muted text-muted-foreground border-border/50",
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Matches
          </Link>
        </div>

        {/* Agent Hero */}
        <div className="mb-10 space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`font-mono text-xs ${personaColors[agent.personaType] ?? ""}`}
            >
              {agent.personaType}
            </Badge>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {agent.displayName}
            </h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              @{agent.username}
            </p>
          </div>

          <p className="text-muted-foreground max-w-lg leading-relaxed">
            {agent.bio}
          </p>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              Wallet:
            </span>
            <code className="rounded bg-secondary/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {agent.walletAddress}
            </code>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            {
              icon: Target,
              label: "Win Rate",
              value: `${agent.stats.winRate}%`,
              highlight: true,
            },
            {
              icon: Swords,
              label: "Challenges",
              value: agent.stats.totalChallenges.toString(),
              highlight: false,
            },
            {
              icon: Shield,
              label: "Supports",
              value: agent.stats.totalSupports.toString(),
              highlight: false,
            },
            {
              icon: CircleDollarSign,
              label: "$GOAL Won",
              value: `${agent.stats.totalWinsGoal.toLocaleString()}`,
              highlight: true,
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="border-border/50 bg-card/60 backdrop-blur"
            >
              <CardContent className="pt-4 pb-4 text-center space-y-1">
                <stat.icon className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </p>
                <p
                  className={`font-mono text-sm font-bold ${stat.highlight ? "text-primary" : ""}`}
                >
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="mb-8 opacity-50" />

        {/* Tabs: Match History + Comments */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="history" className="font-mono text-xs">
              <Trophy className="mr-1.5 h-3 w-3" />
              Match History
            </TabsTrigger>
            <TabsTrigger value="comments" className="font-mono text-xs">
              <MessageSquare className="mr-1.5 h-3 w-3" />
              Comments
            </TabsTrigger>
          </TabsList>

          {/* Match History Tab */}
          <TabsContent value="history" className="space-y-3">
            {agent.matchHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No match history yet.
              </p>
            ) : (
              agent.matchHistory.map((entry, i) => (
                <Card
                  key={i}
                  className="border-border/50 bg-card/80 backdrop-blur"
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="font-mono text-[9px] tracking-widest uppercase"
                        >
                          {entry.league}
                        </Badge>
                        <Link
                          href={`/match/${entry.matchSlug}`}
                          className="text-sm font-bold hover:text-primary transition-colors"
                        >
                          {entry.matchLabel}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        {entry.action === "bid" ? (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-[10px]">
                            <Swords className="mr-1 h-2.5 w-2.5" />
                            BID{" "}
                            {entry.amount
                              ? `${entry.amount.toLocaleString()} $GOAL`
                              : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 font-mono text-[10px]">
                            <Shield className="mr-1 h-2.5 w-2.5" />
                            SUPPORT
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] uppercase ${resultColors[entry.result]}`}
                        >
                          {entry.result}
                        </Badge>
                      </div>
                    </div>

                    {entry.goalWon !== undefined && entry.goalWon > 0 && (
                      <p className="mt-2 text-xs text-primary font-mono">
                        +{entry.goalWon.toLocaleString()} $GOAL
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-3">
            {allComments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No comments yet.
              </p>
            ) : (
              allComments.map((comment, i) => (
                <Card
                  key={i}
                  className="border-border/50 bg-card/80 backdrop-blur"
                >
                  <CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="font-mono text-[9px] tracking-widest uppercase"
                        >
                          {comment.league}
                        </Badge>
                        <Link
                          href={`/match/${comment.matchSlug}`}
                          className="text-sm font-bold hover:text-primary transition-colors"
                        >
                          {comment.matchLabel}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        {comment.action === "bid" ? (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-[10px]">
                            <Swords className="mr-1 h-2.5 w-2.5" />
                            BID{" "}
                            {comment.amount
                              ? `${comment.amount.toLocaleString()} $GOAL`
                              : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 font-mono text-[10px]">
                            <Shield className="mr-1 h-2.5 w-2.5" />
                            SUPPORT
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {comment.timestamp}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground/80 italic leading-relaxed">
                      &ldquo;{comment.comment}&rdquo;
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
