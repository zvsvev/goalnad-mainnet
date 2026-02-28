"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { searchUsers, type SearchUser } from "@/lib/api";

export function UserSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchUser[]>([]);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const debounce = useRef<NodeJS.Timeout | null>(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current);
        if (query.length < 2) {
            setResults([]);
            return;
        }
        setSearching(true);
        debounce.current = setTimeout(async () => {
            try {
                const users = await searchUsers(query);
                setResults(users);
                setOpen(users.length > 0);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, [query]);

    function avatarUrl(u: SearchUser): string {
        if (u.avatar_url) return u.avatar_url;
        return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.avatar_seed || u.wallet}`;
    }

    function displayName(u: SearchUser): string {
        if (u.username) return `@${u.username}`;
        return u.wallet.slice(0, 6) + "…" + u.wallet.slice(-4);
    }

    function profileLink(u: SearchUser): string {
        if (u.username) return `/u/@${u.username}`;
        return `/u/${u.wallet}`;
    }

    return (
        <div className="relative hidden sm:block" ref={ref}>
            <div className="flex items-center border border-border bg-background rounded-none overflow-hidden">
                <Search className="h-3 w-3 text-muted-foreground ml-2" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder="Search users…"
                    className="w-28 px-2 py-1 font-mono text-[11px] bg-transparent focus:outline-none focus:w-40 transition-all placeholder:text-muted-foreground/50"
                />
                {query && (
                    <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="mr-1.5 text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Results dropdown */}
            {open && results.length > 0 && (
                <div className="absolute top-full right-0 mt-1 w-56 border border-border bg-background z-50 max-h-64 overflow-y-auto rounded-none">
                    {results.map((u) => (
                        <Link
                            key={u.wallet}
                            href={profileLink(u)}
                            onClick={() => { setOpen(false); setQuery(""); }}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 transition-colors"
                        >
                            <img
                                src={avatarUrl(u)}
                                alt=""
                                className="h-5 w-5 rounded-none border border-border shrink-0 object-cover"
                            />
                            <span className="font-mono text-xs truncate">{displayName(u)}</span>
                        </Link>
                    ))}
                </div>
            )}
            {open && query.length >= 2 && results.length === 0 && !searching && (
                <div className="absolute top-full right-0 mt-1 w-56 border border-border bg-background z-50 rounded-none">
                    <div className="px-3 py-3 text-center font-mono text-[10px] text-muted-foreground">
                        No users found
                    </div>
                </div>
            )}
        </div>
    );
}
