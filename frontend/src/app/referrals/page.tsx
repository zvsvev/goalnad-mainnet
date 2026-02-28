"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users, Copy, Check, Trophy, Link2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { fetchReferral, type ReferralInfo } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Referrer {
    rank: number;
    wallet: string;
    username: string | null;
    avatar_seed: string;
    avatar_url: string | null;
    referred_count: number;
}

export default function ReferralsPage() {
    const { authenticated } = usePrivy();
    const { wallets } = useWallets();
    const wallet = wallets[0]?.address || null;

    const [referrers, setReferrers] = useState<Referrer[]>([]);
    const [myReferral, setMyReferral] = useState<ReferralInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [lbRes, refRes] = await Promise.all([
                    fetch(`${API_URL}/api/users/referrals/leaderboard`, { cache: "no-store" })
                        .then((r) => r.json())
                        .catch(() => ({ referrers: [] })),
                    wallet ? fetchReferral(wallet).catch(() => null) : Promise.resolve(null),
                ]);
                setReferrers(lbRes.referrers || []);
                setMyReferral(refRes);
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [wallet]);

    function copyLink() {
        if (myReferral?.referral_link) {
            navigator.clipboard.writeText(myReferral.referral_link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    function avatarUrl(r: Referrer): string {
        return r.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${r.avatar_seed}`;
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <div className="mx-auto max-w-3xl px-4 py-6 sm:py-12">
                <div className="mb-6 sm:mb-8">
                    <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </Link>
                    <div className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold font-mono">Referral Program</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-9">
                        Invite friends and climb the referral leaderboard
                    </p>
                </div>

                {/* Your Referral Link */}
                {authenticated && myReferral?.referral_link && (
                    <Card className="border-primary/30 rounded-none shadow-none bg-background mb-8">
                        <CardContent className="pt-5 pb-5">
                            <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                                <Link2 className="h-4 w-4 text-primary" />
                                Your Referral Link
                            </h3>
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    value={myReferral.referral_link}
                                    className="flex-1 rounded-none border border-border bg-secondary/20 px-3 py-2 font-mono text-xs"
                                />
                                <Button
                                    onClick={copyLink}
                                    size="sm"
                                    className="rounded-none font-mono text-xs bg-primary text-background hover:bg-foreground hover:text-background border-none"
                                >
                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                                <div className="text-center">
                                    <div className="font-mono text-lg font-bold text-primary">{myReferral.referred_count}</div>
                                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Referred</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-mono text-sm font-bold text-foreground">{myReferral.referral_code}</div>
                                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Code</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Referral Leaderboard */}
                <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
                    Top Referrers
                </h2>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : referrers.length === 0 ? (
                    <Card className="border-border rounded-none shadow-none bg-background">
                        <CardContent className="py-12 text-center">
                            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="font-mono text-sm text-muted-foreground">
                                No referrals yet — be the first to invite friends!
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-1">
                        {referrers.map((r) => (
                            <Link key={r.wallet} href={r.username ? `/u/@${r.username}` : `/u/${r.wallet}`}>
                                <Card className="border-border rounded-none shadow-none bg-background hover:border-primary/30 transition-colors cursor-pointer">
                                    <CardContent className="py-3 px-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-mono text-sm font-bold w-6 text-center ${r.rank === 1 ? "text-primary" : "text-muted-foreground"}`}>
                                                {r.rank === 1 ? <Trophy className="h-4 w-4 text-primary mx-auto" /> : `#${r.rank}`}
                                            </span>
                                            <Image
                                                src={avatarUrl(r)}
                                                width={28}
                                                height={28}
                                                alt=""
                                                className="h-7 w-7 rounded-none border border-border shrink-0 object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-mono text-xs font-bold truncate block">
                                                    {r.username ? `@${r.username}` : `${r.wallet.slice(0, 6)}…${r.wallet.slice(-4)}`}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-sm font-bold text-primary">{r.referred_count}</span>
                                                <span className="font-mono text-[10px] text-muted-foreground ml-1">referrals</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
