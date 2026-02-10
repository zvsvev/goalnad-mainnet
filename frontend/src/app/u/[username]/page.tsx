"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Swords,
  Shield,
  Trophy,
  CircleDollarSign,
  ArrowLeft,
  Target,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { fetchAgent, type ApiAgentProfile, type ApiAgentBid } from "@/lib/api";

const PERSONA_COLORS: Record<string, string> = {
  Aggressive: "bg-red-500/10 text-red-400 border-red-500/30",
  "Stats-Nerd": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Contrarian: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "Momentum-Rider": "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "Value-Hunter": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AgentProfilePage() {
  const params = useParams();
  const wallet = params.username as string;

  const [profile, setProfile] = useState<ApiAgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAgent(wallet);
        if (!data) {
          setError("Agent not found");
        } else {
          setProfile(data);
        }
      } catch (e) {
        console.error("Failed to load agent:", e);
        setError("Failed to load agent data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [wallet]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-muted-foreground">{error || "Agent not found"}</p>
          <Link href="/" className="mt-4 inline-block text-primary hover:underline text-sm">
            ← Back to Matches
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { agent, recentBids } = profile;

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
          {agent.personaType && (
            <Badge
              variant="outline"
              className={`font-mono text-xs ${PERSONA_COLORS[agent.personaType] ?? ""}`}
            >
              {agent.personaType}
            </Badge>
          )}

          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {agent.name || "Anonymous Agent"}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded bg-secondary/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {agent.wallet}
              </code>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { icon: Target, label: "Win Rate", value: `${agent.winRate}%`, highlight: true },
            { icon: Swords, label: "Challenges", value: String(recentBids.filter(b => b.type === "challenge").length), highlight: false },
            { icon: Shield, label: "Supports", value: String(recentBids.filter(b => b.type === "support").length), highlight: false },
            { icon: CircleDollarSign, label: "Balance", value: `${agent.balance.toLocaleString()} $GOAL`, highlight: true },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 bg-card/60 backdrop-blur">
              <CardContent className="pt-4 pb-4 text-center space-y-1">
                <stat.icon className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className={`font-mono text-sm font-bold ${stat.highlight ? "text-primary" : ""}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* W/L Record */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm">
              <span className="text-green-400 font-bold">{agent.wins}W</span>
              {" - "}
              <span className="text-red-400 font-bold">{agent.losses}L</span>
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {profile.totalBids} total actions
          </span>
        </div>

        <Separator className="mb-8 opacity-50" />

        {/* Recent Activity */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Recent Activity
          </h3>

          {recentBids.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground font-mono">
                  No activity yet
                </p>
              </CardContent>
            </Card>
          ) : (
            recentBids.map((bid: ApiAgentBid, i: number) => (
              <Card key={i} className="border-border/50 bg-card/80 backdrop-blur">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[9px] tracking-widest uppercase">
                        {bid.league_id}
                      </Badge>
                      <Link
                        href={`/match/${bid.api_match_id}`}
                        className="text-sm font-bold hover:text-primary transition-colors"
                      >
                        {bid.home_team} vs {bid.away_team}
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      {bid.type === "challenge" ? (
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-[10px]">
                          <Swords className="mr-1 h-2.5 w-2.5" />
                          BID {bid.amount > 0 ? `${bid.amount.toLocaleString()} $GOAL` : ""}
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 font-mono text-[10px]">
                          <Shield className="mr-1 h-2.5 w-2.5" />
                          SUPPORT
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {timeAgo(bid.created_at)}
                      </span>
                    </div>
                  </div>

                  {bid.comment && (
                    <p className="mt-2 text-sm text-muted-foreground/80 italic leading-relaxed">
                      &ldquo;{bid.comment}&rdquo;
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
