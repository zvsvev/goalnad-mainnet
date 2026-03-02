"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatSol, outcomeName, outcomeColor, type Outcome } from "@/lib/api";
import { Activity } from "lucide-react";
import { API_URL } from "@/lib/api";

interface FeedItem {
    amount: number;
    type: "challenge" | "support";
    comment: string | null;
    created_at: string;
    agent_wallet: string;
    tx_hash: string | null;
    username: string | null;
    avatar_seed: string | null;
    avatar_url: string | null;
    api_match_id: number;
    home_team: string;
    away_team: string;
    league_id: string;
}

export function LiveFeed() {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchFeed = async () => {
            try {
                const res = await fetch(`${API_URL}/api/matches/feed/recent`, { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    if (mounted) setFeed(data.feed || []);
                }
            } catch (err) {
                console.error("Failed to fetch live feed:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchFeed();
        const interval = setInterval(fetchFeed, 15000); // Polling every 15s
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    if (loading && feed.length === 0) return null;
    if (!loading && feed.length === 0) return null;

    return (
        <div className="w-full border-y border-border bg-foreground/5 py-2 overflow-hidden relative flex items-center">
            <div className="absolute left-0 z-10 flex h-full items-center bg-background px-4 pr-6 border-r border-border shadow-[10px_0_15px_-3px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                        Live
                    </span>
                </div>
            </div>

            <div className="flex flex-1 overflow-x-auto no-scrollbar scroll-smooth pl-[100px] sm:pl-[120px]">
                <div className="flex items-center animate-scrolling-feed gap-8 whitespace-nowrap px-4 w-max">
                    {/* Render feed twice for seamless infinite scrolling loop if width is small, but for now just map */}
                    {feed.map((item, i) => (
                        <div key={`${item.tx_hash || item.created_at}-${i}`} className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground mr-1">
                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="h-4 w-4 rounded-none overflow-hidden bg-background">
                                <Image
                                    src={item.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${item.avatar_seed || item.agent_wallet}`}
                                    width={16}
                                    height={16}
                                    alt="avatar"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <Link href={`/u/${item.username || item.agent_wallet}`} className="font-mono text-xs font-bold hover:text-primary transition-colors">
                                {item.username ? `@${item.username}` : `${item.agent_wallet.slice(0, 4)}…${item.agent_wallet.slice(-4)}`}
                            </Link>
                            <span className="font-mono text-xs text-muted-foreground">
                                {item.type === 'challenge' ? 'wagered' : 'supported'}
                            </span>
                            {item.amount > 0 && (
                                <span className="font-mono text-xs font-bold text-primary">
                                    {formatSol(item.amount)}
                                </span>
                            )}
                            <span className="font-mono text-xs text-muted-foreground">on</span>
                            <Link href={`/match/${item.api_match_id}`} className="font-mono text-xs text-foreground hover:text-primary transition-colors">
                                {item.home_team} vs {item.away_team}
                            </Link>
                            <div className="w-[1px] h-3 bg-border mx-3" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Adding tailwind animation logic locally in a style tag for the scrolling effect */}
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-scrolling-feed {
                    /* If we duplicate the feed array we can make it infinite scrolling, but standard scrolling is also okay based on the array length.
                       For a true marquee, you'd duplicate the DOM nodes. 
                       Since data refreshes every 15s, a standard view is fine. */
                }
            `}</style>
        </div>
    );
}
