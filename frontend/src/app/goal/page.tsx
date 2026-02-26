"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Copy,
  Check,
  Flame,
  ArrowRight,
  Coins,
  PieChart,
  Gift,
  Zap,
  Lock,
  Trophy,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MotionWrapper } from "@/components/ui/motion-wrapper";

// Placeholder — update once $GOAL is deployed on Solana
const GOAL_MINT = "TBD — deploying soon";
const PROGRAM_ID = "GoaLSc5GJk4KMEhBqBvAtRtSyHCGGkGxXkHtc7KWFRz";

const FAQ_ITEMS = [
  {
    q: "What is $GOAL?",
    a: "$GOAL is the native token of GoalScore.fun on Solana. Holding 1,000,000+ $GOAL unlocks the AI Oracle's full match analysis and predictions.",
  },
  {
    q: "How do I get $GOAL?",
    a: "Once the token launches, you'll be able to buy $GOAL on Raydium or Jupiter. The mint address will be posted here and on our X (@GoalScoreFun).",
  },
  {
    q: "What does holding $GOAL unlock?",
    a: "Holding 1,000,000+ $GOAL unlocks the Oracle's full prediction analysis, score forecasts, conviction scores, and on-chain reasoning for every match.",
  },
  {
    q: "Do I need $GOAL to bet?",
    a: "No — anyone can bet SOL on match outcomes. $GOAL is only required to access the Oracle's analysis (the AI predictions remain gated behind a token threshold).",
  },
  {
    q: "What happens to fees?",
    a: "1% is taken at bet time and 1% at claim time. Both go toward buyback & burn of $GOAL, reducing supply over time as the platform grows.",
  },
  {
    q: "What is the betting model?",
    a: "GoalScore uses a proportional payout model. SOL from all bettors goes into a pot. Winners split it proportionally to their stake. Draw = full refund.",
  },
];

export default function GoalTokenPage() {
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(PROGRAM_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <MotionWrapper delay={0}>
              <div className="mb-8 inline-flex items-center justify-center">
                <div className="relative">
                  <img
                    src="/logo.png"
                    alt="$GOAL Token"
                    className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-none mix-blend-multiply"
                  />
                </div>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.1}>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                <span className="text-primary">$GOAL</span>
              </h1>
              <p className="mt-3 text-lg text-muted-foreground sm:text-xl">
                The native token of{" "}
                <span className="font-bold text-foreground">
                  GoalScore<span className="text-primary">.fun</span>
                </span>{" "}
                on Solana
              </p>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Hold $GOAL to unlock the AI Oracle's full predictions. Bet SOL,
                beat the Oracle, win the pot.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Badge
                  variant="outline"
                  className="border-border rounded-none bg-white font-mono text-xs text-primary px-4 py-1.5"
                >
                  🚀 Launching Soon on Solana
                </Badge>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* Oracle Gate — Holder Benefits */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <MotionWrapper delay={0.05}>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center justify-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Oracle Access — Holder Benefits
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                Hold 1,000,000+ $GOAL to unlock the full AI Oracle analysis for
                every match.
              </p>
            </div>
          </MotionWrapper>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Trophy,
                title: "AI Prediction",
                desc: "Home / Draw / Away outcome predicted by the Oracle AI before every kickoff.",
                locked: false,
              },
              {
                icon: Zap,
                title: "Score Forecast",
                desc: "Exact predicted scoreline — e.g. Arsenal 2–1 Chelsea — from the Oracle.",
                locked: true,
              },
              {
                icon: PieChart,
                title: "Conviction Score",
                desc: "How confident is the Oracle? 0–100 conviction rating per match.",
                locked: true,
              },
              {
                icon: Gift,
                title: "Full Analysis",
                desc: "Deep-dive reasoning: form, H2H, injuries, tactical edge — all unlocked.",
                locked: true,
              },
              {
                icon: Flame,
                title: "On-chain TX",
                desc: "Direct link to the Oracle's prediction transaction on Solscan.",
                locked: true,
              },
              {
                icon: ArrowRight,
                title: "Early Alpha",
                desc: "Holders get first access to new leagues, features, and beta tools.",
                locked: true,
              },
            ].map((item, i) => (
              <MotionWrapper key={i} delay={0.1 + i * 0.05}>
                <Card
                  className={`border-border rounded-none shadow-none bg-white h-full relative overflow-hidden ${item.locked ? "opacity-80" : ""
                    }`}
                >
                  {item.locked && (
                    <div className="absolute top-3 right-3">
                      <Lock className="h-3 w-3 text-muted-foreground/60" />
                    </div>
                  )}
                  <CardContent className="pt-6">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-none bg-white border border-border">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                    {item.locked && (
                      <p className="mt-2 font-mono text-[10px] text-primary/60 uppercase tracking-wider">
                        Requires 1M $GOAL
                      </p>
                    )}
                  </CardContent>
                </Card>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* Fee & Burn Model */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <MotionWrapper delay={0.05}>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center justify-center gap-2">
                <Flame className="h-5 w-5 text-orange-400" />
                Fee & Burn Model
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every bet and claim burns $GOAL — reducing supply as the arena
                grows
              </p>
            </div>
          </MotionWrapper>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Bet Fee",
                value: "1%",
                desc: "1% of your SOL bet goes to $GOAL buyback & burn at bet time.",
                color: "text-orange-400",
              },
              {
                label: "Claim Fee",
                value: "1%",
                desc: "1% of your SOL winnings burned when you claim your prize.",
                color: "text-red-400",
              },
              {
                label: "Draw",
                value: "0%",
                desc: "On a draw result, all bets are fully refunded. No fees charged.",
                color: "text-primary",
              },
            ].map((item, i) => (
              <MotionWrapper key={i} delay={0.1 + i * 0.05}>
                <Card className="border-border rounded-none shadow-none bg-white text-center">
                  <CardContent className="pt-8 pb-6">
                    <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">
                      {item.label}
                    </p>
                    <p
                      className={`text-4xl font-bold font-mono mb-3 ${item.color}`}
                    >
                      {item.value}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* Program Address */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <MotionWrapper delay={0.05}>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center justify-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Smart Contract
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                GoalScore Arena — deployed on Solana Devnet
              </p>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.1}>
            <Card className="border-border rounded-none shadow-none bg-white mx-auto max-w-2xl">
              <CardContent className="pt-6 pb-6">
                <div className="mb-2">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    Program ID (GoalScoreArena)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-none bg-white border border-border px-4 py-3 font-mono text-xs sm:text-sm text-primary select-all">
                    {PROGRAM_ID}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-none border border-border bg-white p-3 hover:bg-black hover:text-white transition-colors"
                    title="Copy program ID"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="mt-3">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    $GOAL Mint
                  </p>
                  <p className="font-mono text-xs text-muted-foreground/70 italic">
                    {GOAL_MINT}
                  </p>
                </div>
                <div className="mt-4 flex gap-3">
                  <a
                    href={`https://solscan.io/account/${PROGRAM_ID}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Solscan
                  </a>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </section>

      {/* Tokenomics */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <MotionWrapper delay={0.05}>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center justify-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Tokenomics
              </h2>
            </div>
          </MotionWrapper>
          <MotionWrapper delay={0.1}>
            <Card className="border-border rounded-none shadow-none bg-white mx-auto max-w-xl">
              <CardContent className="pt-8 pb-8">
                <p className="text-center text-2xl sm:text-3xl font-bold text-muted-foreground/50">
                  COMING SOON 👀
                </p>
                <p className="text-center text-sm text-muted-foreground mt-3">
                  Fair launch details will be announced on{" "}
                  <a
                    href="https://x.com/GoalScoreFun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @GoalScoreFun
                  </a>
                </p>
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <MotionWrapper delay={0.05}>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center justify-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                FAQ
              </h2>
            </div>
          </MotionWrapper>

          <div className="mx-auto max-w-2xl space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <MotionWrapper key={i} delay={0.05 + i * 0.02}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left"
                >
                  <Card
                    className={`border-border rounded-none shadow-none bg-white transition-colors ${openFaq === i
                      ? "border-primary"
                      : "hover:border-black"
                      }`}
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-sm">{item.q}</h3>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""
                            }`}
                        />
                      </div>
                      {openFaq === i && (
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
                          {item.a}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </button>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl mb-3">
              Ready to Beat the Oracle?
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              You don't need $GOAL to start betting — connect your Solana wallet
              and predict match outcomes now.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="font-mono bg-primary text-white hover:bg-black rounded-none shadow-none transition-colors border-none"
                asChild
              >
                <Link href="/">
                  Start Betting Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="font-mono rounded-none border-border bg-white hover:bg-black hover:text-white transition-all" asChild>
                <a
                  href="https://x.com/GoalScoreFun"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Follow for Token Launch
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
