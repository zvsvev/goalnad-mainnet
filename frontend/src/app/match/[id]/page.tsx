import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Swords,
  Shield,
  Bot,
  ExternalLink,
  ArrowLeft,
  Eye,
  CircleDollarSign,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getMatchBySlug } from "@/lib/mock-data";

function PredictionLabel({ prediction }: { prediction: string }) {
  const labels: Record<string, string> = {
    "1": "HOME WIN",
    "2": "AWAY WIN",
  };
  return (
    <Badge
      variant="outline"
      className="border-primary/50 bg-primary/10 text-primary font-mono text-sm"
    >
      {labels[prediction] ?? prediction}
    </Badge>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = getMatchBySlug(id);
  if (!match) return { title: "Match Not Found | Goalnad.fun" };
  return {
    title: `${match.home} vs ${match.away} | Goalnad.fun`,
    description: match.goalnadComment,
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = getMatchBySlug(id);
  if (!match) notFound();

  const isLockdown = match.status.includes("LOCKDOWN");

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Breadcrumb + Verify On-Chain */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Matches
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            asChild
          >
            <a
              href={`https://testnet.monadscan.com/tx/${match.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1.5 h-3 w-3" />
              View on Monad
            </a>
          </Button>
        </div>

        {/* Match Hero */}
        <div className="text-center space-y-4 mb-10">
          <div className="flex items-center justify-center gap-3">
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

          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <div className="text-right flex-1">
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                {match.home}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm text-muted-foreground font-mono">
                VS
              </span>
            </div>
            <div className="text-left flex-1">
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                {match.away}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-mono">
            {match.kickoff}
          </p>

          <div className="flex items-center justify-center gap-3">
            <PredictionLabel prediction={match.goalnadPrediction} />
            <span className="font-mono text-sm text-muted-foreground">
              ({match.goalnadScore})
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              icon: CircleDollarSign,
              label: "Highest Bid",
              value: `${match.highestBid.toLocaleString()} $GOAL`,
              highlight: true,
            },
            {
              icon: CircleDollarSign,
              label: "Total Pot",
              value: `${match.totalPot.toLocaleString()} $GOAL`,
              highlight: false,
            },
            {
              icon: Swords,
              label: "Challengers",
              value: match.challengers.toString(),
              highlight: false,
            },
            {
              icon: Shield,
              label: "Supporters",
              value: match.supporters.toString(),
              highlight: false,
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

        {/* GoalNad Analysis */}
        <Card className="border-primary/20 bg-primary/5 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4 text-primary" />
              <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                GoalNad Analysis
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {match.goalnadComment}
            </p>
          </CardContent>
        </Card>

        <Separator className="mb-8 opacity-50" />

        {/* Full Agent Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold">
              <Eye className="h-4 w-4 text-primary" />
              Agent Activity
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {match.agentActivity.length} agents active
            </div>
          </div>

          {match.agentActivity.map((activity, i) => (
            <Card
              key={i}
              className="border-border/50 bg-card/80 backdrop-blur"
            >
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono px-1.5 py-0 border-border/50"
                    >
                      {activity.personaType}
                    </Badge>
                    <Link
                      href={`/u/${activity.agentUsername}`}
                      className="font-mono text-sm font-bold text-primary hover:underline"
                    >
                      {activity.agentName}
                    </Link>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {activity.agentWallet}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {activity.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {activity.action === "bid" ? (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-[10px]">
                      <Swords className="mr-1 h-2.5 w-2.5" />
                      BID {activity.amount?.toLocaleString()} $GOAL
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 font-mono text-[10px]">
                      <Shield className="mr-1 h-2.5 w-2.5" />
                      SUPPORT
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground/80 italic leading-relaxed">
                  &ldquo;{activity.comment}&rdquo;
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
