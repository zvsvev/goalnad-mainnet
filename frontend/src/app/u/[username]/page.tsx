"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import {
  Trophy,
  ArrowLeft,
  Target,
  Loader2,
  ExternalLink,
  Coins,
  TrendingUp,
  Clock,
  Wallet,
  ArrowRight,
  Copy,
  Check,
  Share2,
  Link2,
  Users,
  Pencil,
  Shuffle,
  Twitter,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { showToast } from "@/components/ui/toast";
import {
  fetchUserProfile,
  claimUsername,
  updateAvatar,
  fetchPnl,
  fetchReferral,
  outcomeName,
  outcomeColor,
  formatSol,
  type ApiUserProfile,
  type PnlEntry,
  type ReferralInfo,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────

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

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function betStatusLabel(bet: ApiUserProfile["recent_bets"][0]) {
  if (!bet.resolved) return { label: "OPEN", cls: "text-primary border-primary/30" };
  if (bet.claimed) return { label: "CLAIMED", cls: "text-green-400 border-green-400/30" };
  if (bet.refunded) return { label: "REFUNDED", cls: "text-yellow-400 border-yellow-400/30" };
  if (bet.result === null) return { label: "PENDING", cls: "text-muted-foreground border-border/50" };
  if (bet.outcome === bet.result) return { label: "WON", cls: "text-green-400 border-green-400/30" };
  return { label: "LOST", cls: "text-red-400 border-red-400/30" };
}

function diceBearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

// ─── P&L Sparkline ──────────────────────────────────────────────────

function PnlChart({ pnl }: { pnl: PnlEntry[] }) {
  if (pnl.length < 2) {
    return (
      <Card className="border-border rounded-none shadow-none bg-background">
        <CardContent className="py-8 text-center">
          <TrendingUp className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground font-mono">
            P&L chart will appear after 2+ resolved bets
          </p>
        </CardContent>
      </Card>
    );
  }

  const values = pnl.map((p) => p.pnl / 1e9); // convert to SOL
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const w = 400;
  const h = 80;
  const pad = 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  // Zero line y
  const zeroY = h - pad - ((0 - min) / range) * (h - pad * 2);
  const lastVal = values[values.length - 1];
  const isPositive = lastVal >= 0;

  return (
    <Card className="border-border rounded-none shadow-none bg-background">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Profit & Loss
          </span>
          <span className={`font-mono text-sm font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{lastVal.toFixed(4)} SOL
          </span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
          {/* Zero line */}
          <line
            x1={pad}
            y1={zeroY}
            x2={w - pad}
            y2={zeroY}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
            strokeDasharray="4"
          />
          {/* P&L line */}
          <polyline
            fill="none"
            stroke={isPositive ? "#4ade80" : "#f87171"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {/* Dot at the end */}
          <circle
            cx={parseFloat(points.split(" ").pop()!.split(",")[0])}
            cy={parseFloat(points.split(" ").pop()!.split(",")[1])}
            r="3"
            fill={isPositive ? "#4ade80" : "#f87171"}
          />
        </svg>
      </CardContent>
    </Card>
  );
}

// ─── Avatar Picker ──────────────────────────────────────────────────

function AvatarPicker({
  currentSeed,
  wallet,
  onUpdate,
}: {
  currentSeed: string;
  wallet: string;
  onUpdate: (seed: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [seeds, setSeeds] = useState<string[]>([]);

  const generateSeeds = () => {
    const newSeeds = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 10)
    );
    setSeeds(newSeeds);
  };

  const handlePick = async (seed: string) => {
    const result = await updateAvatar(wallet, seed);
    if (result.success) {
      onUpdate(seed);
      setPicking(false);
      showToast({ type: "success", message: "Avatar updated!" });
    }
  };

  if (!picking) {
    return (
      <button
        onClick={() => {
          generateSeeds();
          setPicking(true);
        }}
        className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
      >
        <Pencil className="h-2.5 w-2.5" />
        Change avatar
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 border border-border rounded-none bg-background">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          Pick an avatar
        </span>
        <button
          onClick={generateSeeds}
          className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
        >
          <Shuffle className="h-2.5 w-2.5" />
          Randomize
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {seeds.map((seed) => (
          <button
            key={seed}
            onClick={() => handlePick(seed)}
            className={`border-2 p-1 transition-colors rounded-none hover:border-primary ${currentSeed === seed ? "border-primary" : "border-border"
              }`}
          >
            <img
              src={diceBearUrl(seed)}
              alt="avatar option"
              className="w-full aspect-square"
            />
          </button>
        ))}
      </div>
      <button
        onClick={() => setPicking(false)}
        className="mt-2 text-[10px] font-mono text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Username Claim ─────────────────────────────────────────────────

function UsernameClaim({
  wallet,
  onClaim,
}: {
  wallet: string;
  onClaim: (username: string) => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    setError(null);
    setLoading(true);
    const result = await claimUsername(wallet, input.toLowerCase().trim());
    setLoading(false);
    if (result.success) {
      onClaim(input.toLowerCase().trim());
      showToast({ type: "success", message: `Username @${input.toLowerCase().trim()} claimed!` });
    } else {
      setError(result.error || "Failed to claim");
    }
  };

  return (
    <div className="p-3 border border-border rounded-none bg-background">
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
        Claim username (one-time)
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-2 text-muted-foreground text-sm">@</span>
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value.replace(/[^a-z0-9_]/gi, "")); setError(null); }}
            placeholder="username"
            maxLength={20}
            className="w-full pl-7 pr-3 py-1.5 rounded-none border border-border bg-background font-mono text-sm focus:outline-none focus:border-primary lowercase"
          />
        </div>
        <Button
          onClick={handleClaim}
          disabled={input.length < 3 || loading}
          className="font-mono text-xs bg-primary text-background hover:bg-foreground hover:text-background rounded-none border-none"
          size="sm"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
        </Button>
      </div>
      {error && <p className="text-red-400 text-[10px] font-mono mt-1">{error}</p>}
      <p className="text-[10px] text-muted-foreground mt-1">
        3-20 chars, lowercase letters, numbers, underscores
      </p>
    </div>
  );
}

// ─── Share Card ─────────────────────────────────────────────────────

function ShareCard({ profile }: { profile: ApiUserProfile }) {
  const { stats, wallet, username } = profile;
  const displayName = username ? `@${username}` : shortAddr(wallet);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://goalscore.fun";
  const profileUrl = username
    ? `${origin}/u/@${username}`
    : `${origin}/u/${wallet}`;

  const tweetText = encodeURIComponent(
    `I'm ${stats.win_rate}% accurate on GoalScore.fun 🎯\n\n` +
    `${stats.wins}W – ${stats.losses}L · ${(stats.total_wagered / 1e9).toFixed(2)} SOL wagered\n\n` +
    `Bet on football matches on Solana ⚽\n${profileUrl}`
  );

  return (
    <Button
      variant="outline"
      size="sm"
      className="font-mono text-xs rounded-none border-border"
      asChild
    >
      <a
        href={`https://twitter.com/intent/tweet?text=${tweetText}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Share2 className="mr-1.5 h-3 w-3" />
        Share on X
      </a>
    </Button>
  );
}

// ─── Referral Section ───────────────────────────────────────────────

function ReferralSection({ referral }: { referral: ReferralInfo }) {
  const [copied, setCopied] = useState(false);

  if (!referral.referral_code) return null;

  const handleCopy = async () => {
    if (referral.referral_link) {
      await navigator.clipboard.writeText(referral.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-border rounded-none shadow-none bg-background">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            Referral Link
          </span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-none border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground select-all">
            {referral.referral_link}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-none border border-border bg-background p-2 hover:bg-primary hover:text-background transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            Code: <strong className="text-primary">{referral.referral_code}</strong>
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            <Users className="h-2.5 w-2.5 inline mr-0.5" />
            {referral.referred_count} referred
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const paramValue = params.username as string;
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const currentWallet = wallets[0]?.address ?? null;

  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [pnl, setPnl] = useState<PnlEntry[]>([]);
  const [referral, setReferral] = useState<ReferralInfo>({ referral_code: null, referred_count: 0, referral_link: null });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchUserProfile(paramValue);
      setProfile(data);
      if (data) {
        const [pnlData, refData] = await Promise.all([
          fetchPnl(data.wallet),
          fetchReferral(data.wallet),
        ]);
        setPnl(pnlData);
        setReferral(refData);
      }
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setLoading(false);
    }
  }, [paramValue]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Determine if current user is viewing their own profile
  const isOwner = currentWallet && profile?.wallet
    ? currentWallet.toLowerCase() === profile.wallet.toLowerCase()
    : false;

  const wallet = profile?.wallet ?? paramValue.replace(/^@/, "");
  const displayName = profile?.username ? `@${profile.username}` : shortAddr(wallet);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  // Resolve to a valid wallet even if profile API returned null
  const stats = profile?.stats ?? {
    total_bets: 0, wins: 0, losses: 0, draws: 0, win_rate: 0,
    total_wagered: 0, total_claimed: 0,
  };
  const recentBets = profile?.recent_bets ?? [];
  const avatarSeed = profile?.avatar_seed ?? wallet;

  // Privy social connections (only if viewing own profile)
  const privyEmail = isOwner ? privyUser?.email?.address ?? null : null;
  const privyTwitter = isOwner ? (privyUser as any)?.twitter?.username ?? null : null;
  const privyGoogle = isOwner ? privyUser?.google?.email ?? null : null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Matches
          </Link>
          {profile && <ShareCard profile={profile} />}
        </div>

        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            {/* DiceBear Avatar */}
            <div className="shrink-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-none border-2 border-primary/30 bg-primary/5 overflow-hidden">
                <img
                  src={diceBearUrl(avatarSeed)}
                  alt="avatar"
                  className="w-full h-full"
                />
              </div>
              {isOwner && (
                <AvatarPicker
                  currentSeed={avatarSeed}
                  wallet={wallet}
                  onUpdate={(seed) => {
                    if (profile) setProfile({ ...profile, avatar_seed: seed });
                  }}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-mono">
                  {displayName}
                </h1>
                {profile?.username && (
                  <Badge variant="outline" className="text-[9px] font-mono rounded-none border-primary/30 text-primary">
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <a
                  href={`https://solscan.io/account/${wallet}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors truncate"
                >
                  {wallet}
                  <ExternalLink className="h-2.5 w-2.5 inline ml-0.5" />
                </a>
                <button onClick={handleCopyAddress} className="shrink-0 text-muted-foreground hover:text-primary">
                  {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              {profile?.created_at && (
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  Joined {timeAgo(profile.created_at)}
                </p>
              )}

              {/* Social connections (own profile only) */}
              {isOwner && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {privyTwitter && (
                    <Badge variant="outline" className="text-[9px] font-mono rounded-none gap-1">
                      <Twitter className="h-2.5 w-2.5" />
                      @{privyTwitter}
                    </Badge>
                  )}
                  {privyEmail && (
                    <Badge variant="outline" className="text-[9px] font-mono rounded-none gap-1">
                      <Mail className="h-2.5 w-2.5" />
                      {privyEmail}
                    </Badge>
                  )}
                  {privyGoogle && !privyEmail && (
                    <Badge variant="outline" className="text-[9px] font-mono rounded-none gap-1">
                      <Mail className="h-2.5 w-2.5" />
                      {privyGoogle}
                    </Badge>
                  )}
                </div>
              )}

              {/* Username claim (own profile, no username yet) */}
              {isOwner && !profile?.username && (
                <div className="mt-3">
                  <UsernameClaim
                    wallet={wallet}
                    onClaim={(u) => {
                      if (profile) setProfile({ ...profile, username: u });
                      router.replace(`/u/@${u}`);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              icon: Target,
              label: "Win Rate",
              value: `${stats.win_rate}%`,
              cls: stats.win_rate >= 60 ? "text-green-400" : stats.win_rate >= 40 ? "text-yellow-400" : "text-muted-foreground",
            },
            {
              icon: Trophy,
              label: "W / L",
              value: `${stats.wins}W – ${stats.losses}L`,
              cls: "text-foreground",
            },
            {
              icon: Coins,
              label: "SOL Wagered",
              value: formatSol(stats.total_wagered),
              cls: "text-primary",
            },
            {
              icon: TrendingUp,
              label: "SOL Claimed",
              value: formatSol(stats.total_claimed),
              cls: "text-green-400",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-border rounded-none shadow-none bg-background">
              <CardContent className="pt-4 pb-4 text-center space-y-1">
                <stat.icon className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                  {stat.label}
                </p>
                <p className={`font-mono text-sm font-bold ${stat.cls}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* P&L Chart */}
        <div className="mb-8">
          <PnlChart pnl={pnl} />
        </div>

        {/* Referral (own profile only) */}
        {isOwner && (
          <div className="mb-8">
            <ReferralSection referral={referral} />
          </div>
        )}

        <Separator className="mb-8 opacity-50" />

        {/* Betting History */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Betting History
            <span className="text-sm font-normal text-muted-foreground font-mono">
              ({stats.total_bets} bets)
            </span>
          </h3>

          {recentBets.length === 0 ? (
            <Card className="border-border rounded-none shadow-none bg-background">
              <CardContent className="py-12 text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-primary/60" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">No bets yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {isOwner
                      ? "You haven't placed any bets yet. Browse matches and start predicting!"
                      : "This player hasn't placed any bets yet."}
                  </p>
                </div>
                <Button
                  className="font-mono bg-primary text-background hover:bg-foreground hover:text-background rounded-none transition-colors border-none"
                  asChild
                >
                  <Link href="/">
                    Browse Matches
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            recentBets.map((bet, i) => {
              const status = betStatusLabel(bet);
              const betColor = outcomeColor(bet.outcome);
              const resultColor = outcomeColor(bet.result);

              return (
                <Card key={i} className="border-border rounded-none shadow-none bg-background">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="border-border rounded-none bg-background font-mono text-[9px] tracking-widest uppercase text-muted-foreground"
                          >
                            {bet.league_id}
                          </Badge>
                          <Link
                            href={`/match/${bet.api_match_id}`}
                            className="text-sm font-bold hover:text-primary transition-colors truncate"
                          >
                            {bet.home_team} vs {bet.away_team}
                          </Link>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap">
                          <span>
                            Bet:{" "}
                            <span className={`font-bold ${betColor}`}>
                              {outcomeName(bet.outcome)}
                            </span>
                          </span>
                          <span className="text-primary font-bold">{formatSol(bet.amount)}</span>
                          {bet.resolved === 1 && bet.result !== null && (
                            <span>
                              Result:{" "}
                              <span className={`font-bold ${resultColor}`}>
                                {outcomeName(bet.result)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`font-mono text-[9px] rounded-none shrink-0 ${status.cls}`}
                      >
                        {status.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
