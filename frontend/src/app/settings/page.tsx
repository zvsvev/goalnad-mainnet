"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import {
    ArrowLeft,
    Loader2,
    Copy,
    Check,
    Pencil,
    Shuffle,
    Mail,
    Twitter,
    Wallet,
    User,
    Settings,
    ExternalLink,
    Link2,
    AlertCircle,
    Share2,
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
    updateEmail,
    uploadAvatar,
    fetchReferral,
    API_URL,
    type ApiUserProfile,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────

function shortAddr(addr: string) {
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function diceBearUrl(seed: string) {
    return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

function avatarDisplayUrl(avatarUrl: string | null | undefined, avatarSeed: string) {
    if (avatarUrl) return avatarUrl;
    return diceBearUrl(avatarSeed);
}

// ─── Section Wrapper ────────────────────────────────────────────────

function SettingsSection({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-border rounded-none shadow-none bg-background">
            <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
                        {title}
                    </h2>
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mb-4">{description}</p>
                )}
                <div className="mt-3">{children}</div>
            </CardContent>
        </Card>
    );
}

// ─── Avatar Section ─────────────────────────────────────────────────

function AvatarSection({
    currentSeed,
    avatarUrl,
    wallet,
    onUpdate,
}: {
    currentSeed: string;
    avatarUrl: string | null;
    wallet: string;
    onUpdate: (update: { avatar_seed?: string; avatar_url?: string | null }) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const displayUrl = avatarDisplayUrl(avatarUrl, currentSeed);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast({ type: "error", message: "Please upload an image file" });
            return;
        }
        if (file.size > 500_000) {
            showToast({ type: "error", message: "Image too large (max 500KB)" });
            return;
        }
        setUploading(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const result = await uploadAvatar(wallet, base64);
            if (result.success) {
                onUpdate({ avatar_url: base64 });
                showToast({ type: "success", message: "Avatar uploaded!" });
            } else {
                showToast({ type: "error", message: result.error || "Failed to upload" });
            }
        } catch (e) {
            console.error("Avatar upload error:", e);
            showToast({ type: "error", message: "Network error — check your connection" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <SettingsSection
            icon={User}
            title="Avatar"
            description="Upload a custom profile image (default: random pixel-art)"
        >
            <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-none border-2 border-primary/30 bg-primary/5 overflow-hidden shrink-0">
                    <img src={displayUrl} alt="current avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleFileUpload} className="hidden" />
                    <Button
                        variant="outline" size="sm"
                        className="font-mono text-xs rounded-none border-border w-full"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Pencil className="mr-1.5 h-3 w-3" />}
                        {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG, GIF, WebP — max 500KB</p>
                </div>
            </div>
        </SettingsSection>
    );
}

// ─── Username Section ───────────────────────────────────────────────

function UsernameSection({
    username,
    wallet,
    onClaim,
}: {
    username: string | null;
    wallet: string;
    onClaim: (username: string) => void;
}) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClaim = async () => {
        setError(null);
        setLoading(true);
        try {
            const result = await claimUsername(wallet, input.toLowerCase().trim());
            if (result.success) {
                onClaim(input.toLowerCase().trim());
                showToast({
                    type: "success",
                    message: `Username @${input.toLowerCase().trim()} claimed!`,
                });
            } else {
                setError(result.error || "Failed to claim");
            }
        } catch (e) {
            console.error("Username claim error:", e);
            setError("Network error — check your connection");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SettingsSection
            icon={User}
            title="Username"
            description={
                username
                    ? "Your username is set and cannot be changed"
                    : "Claim a unique username (one-time only)"
            }
        >
            {username ? (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary font-bold">
                        @{username}
                    </span>
                    <Badge
                        variant="outline"
                        className="text-[9px] font-mono rounded-none border-primary/30 text-primary"
                    >
                        Claimed
                    </Badge>
                </div>
            ) : (
                <div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-2.5 top-2 text-muted-foreground text-sm">
                                @
                            </span>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value.replace(/[^a-z0-9_]/gi, ""));
                                    setError(null);
                                }}
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
                            {loading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                "Claim"
                            )}
                        </Button>
                    </div>
                    {error && (
                        <p className="text-red-400 text-[10px] font-mono mt-1 flex items-center gap-1">
                            <AlertCircle className="h-2.5 w-2.5" />
                            {error}
                        </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                        3-20 chars, lowercase letters, numbers, underscores
                    </p>
                </div>
            )}
        </SettingsSection>
    );
}

// ─── Email Section ──────────────────────────────────────────────────

function EmailSection({
    profile,
    wallet,
    onUpdate,
}: {
    profile: ApiUserProfile;
    wallet: string;
    onUpdate: (email: string | null) => void;
}) {
    const { user: privyUser, linkEmail, unlinkEmail } = usePrivy();
    const privyEmail = privyUser?.email?.address ?? null;
    const dbEmail = profile.email;
    const displayEmail = privyEmail || dbEmail;

    const [input, setInput] = useState(dbEmail || "");
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSaveEmail = async () => {
        setError(null);
        setLoading(true);
        const cleanEmail = input.trim().toLowerCase();
        if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setError("Invalid email address");
            setLoading(false);
            return;
        }
        try {
            const result = await updateEmail(wallet, cleanEmail || null);
            if (result.success) {
                onUpdate(cleanEmail || null);
                setEditing(false);
                showToast({ type: "success", message: "Email updated!" });
            } else {
                setError(result.error || "Failed to update");
            }
        } catch (e) {
            console.error("Email update error:", e);
            setError("Network error — check your connection");
        } finally {
            setLoading(false);
        }
    };

    const handleLinkEmail = async () => {
        try {
            await linkEmail();
        } catch (e) {
            // User cancelled
        }
    };

    const handleUnlinkEmail = async () => {
        if (!privyEmail) return;
        try {
            // Find the linked account to unlink
            const emailAccount = privyUser?.linkedAccounts?.find(
                (a: any) => a.type === "email"
            );
            if (emailAccount) {
                await unlinkEmail(privyEmail);
                showToast({ type: "success", message: "Email unlinked!" });
            }
        } catch (e) {
            showToast({ type: "error", message: "Failed to unlink email" });
        }
    };

    return (
        <SettingsSection
            icon={Mail}
            title="Email"
            description="Connect your email for notifications and recovery"
        >
            <div className="space-y-3">
                {/* Privy-linked email */}
                {privyEmail && (
                    <div className="flex items-center justify-between gap-2 p-2.5 border border-border rounded-none bg-background">
                        <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-mono text-xs truncate">{privyEmail}</span>
                            <Badge
                                variant="outline"
                                className="text-[8px] font-mono rounded-none border-primary/30 text-primary shrink-0"
                            >
                                Privy
                            </Badge>
                        </div>
                        <button
                            onClick={handleUnlinkEmail}
                            className="text-[10px] font-mono text-destructive hover:underline shrink-0"
                        >
                            Unlink
                        </button>
                    </div>
                )}

                {!privyEmail && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs rounded-none border-border w-full"
                        onClick={handleLinkEmail}
                    >
                        <Link2 className="mr-1.5 h-3 w-3" />
                        Link Email via Privy
                    </Button>
                )}

                <Separator className="opacity-30" />

                {/* Custom email (stored in DB) */}
                <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                        Custom Email
                    </p>
                    {!editing ? (
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                                {dbEmail || "Not set"}
                            </span>
                            <button
                                onClick={() => {
                                    setInput(dbEmail || "");
                                    setEditing(true);
                                }}
                                className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
                            >
                                <Pencil className="h-2.5 w-2.5" />
                                {dbEmail ? "Edit" : "Add"}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        setError(null);
                                    }}
                                    placeholder="user@example.com"
                                    className="flex-1 px-3 py-1.5 rounded-none border border-border bg-background font-mono text-sm focus:outline-none focus:border-primary"
                                />
                                <Button
                                    onClick={handleSaveEmail}
                                    disabled={loading}
                                    className="font-mono text-xs bg-primary text-background hover:bg-foreground hover:text-background rounded-none border-none"
                                    size="sm"
                                >
                                    {loading ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-mono text-xs rounded-none border-border"
                                    onClick={() => {
                                        setEditing(false);
                                        setError(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                            {error && (
                                <p className="text-red-400 text-[10px] font-mono mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-2.5 w-2.5" />
                                    {error}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </SettingsSection>
    );
}

// ─── Social Connections Section ─────────────────────────────────────

function SocialSection() {
    const { user: privyUser, linkTwitter, unlinkTwitter, linkGoogle, unlinkGoogle } = usePrivy();
    const privyTwitter = (privyUser as any)?.twitter?.username ?? null;
    const privyGoogle = privyUser?.google?.email ?? null;

    const handleLinkTwitter = async () => {
        try {
            await linkTwitter();
        } catch (e) {
            // User cancelled
        }
    };

    const handleUnlinkTwitter = async () => {
        if (!privyTwitter) return;
        try {
            const twitterAccount = privyUser?.linkedAccounts?.find(
                (a: any) => a.type === "twitter_oauth"
            );
            if (twitterAccount) {
                await unlinkTwitter((twitterAccount as any).subject);
                showToast({ type: "success", message: "Twitter unlinked!" });
            }
        } catch (e) {
            showToast({ type: "error", message: "Failed to unlink Twitter" });
        }
    };

    const handleLinkGoogle = async () => {
        try {
            await linkGoogle();
        } catch (e) {
            // User cancelled
        }
    };

    const handleUnlinkGoogle = async () => {
        if (!privyGoogle) return;
        try {
            const googleAccount = privyUser?.linkedAccounts?.find(
                (a: any) => a.type === "google_oauth"
            );
            if (googleAccount) {
                await unlinkGoogle((googleAccount as any).subject);
                showToast({ type: "success", message: "Google unlinked!" });
            }
        } catch (e) {
            showToast({ type: "error", message: "Failed to unlink Google" });
        }
    };

    return (
        <SettingsSection
            icon={Link2}
            title="Social Connections"
            description="Link your social accounts for identity verification"
        >
            <div className="space-y-2">
                {/* Twitter */}
                <div className="flex items-center justify-between gap-2 p-2.5 border border-border rounded-none bg-background">
                    <div className="flex items-center gap-2 min-w-0">
                        <Twitter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {privyTwitter ? (
                            <>
                                <span className="font-mono text-xs">@{privyTwitter}</span>
                                <Badge
                                    variant="outline"
                                    className="text-[8px] font-mono rounded-none border-green-400/30 text-green-400 shrink-0"
                                >
                                    Connected
                                </Badge>
                            </>
                        ) : (
                            <span className="font-mono text-xs text-muted-foreground">
                                X/Twitter — Not connected
                            </span>
                        )}
                    </div>
                    {privyTwitter ? (
                        <button
                            onClick={handleUnlinkTwitter}
                            className="text-[10px] font-mono text-destructive hover:underline shrink-0"
                        >
                            Unlink
                        </button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="font-mono text-[10px] rounded-none border-border h-7"
                            onClick={handleLinkTwitter}
                        >
                            Connect
                        </Button>
                    )}
                </div>

                {/* Google */}
                <div className="flex items-center justify-between gap-2 p-2.5 border border-border rounded-none bg-background">
                    <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {privyGoogle ? (
                            <>
                                <span className="font-mono text-xs truncate">{privyGoogle}</span>
                                <Badge
                                    variant="outline"
                                    className="text-[8px] font-mono rounded-none border-green-400/30 text-green-400 shrink-0"
                                >
                                    Connected
                                </Badge>
                            </>
                        ) : (
                            <span className="font-mono text-xs text-muted-foreground">
                                Google — Not connected
                            </span>
                        )}
                    </div>
                    {privyGoogle ? (
                        <button
                            onClick={handleUnlinkGoogle}
                            className="text-[10px] font-mono text-destructive hover:underline shrink-0"
                        >
                            Unlink
                        </button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="font-mono text-[10px] rounded-none border-border h-7"
                            onClick={handleLinkGoogle}
                        >
                            Connect
                        </Button>
                    )}
                </div>
            </div>
        </SettingsSection>
    );
}

// ─── Wallet Section ─────────────────────────────────────────────────

function WalletSection({ wallet }: { wallet: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(wallet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <SettingsSection
            icon={Wallet}
            title="Wallet"
            description="Your connected Solana wallet address"
        >
            <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-none border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground select-all">
                    {wallet}
                </code>
                <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-none border border-border bg-background p-2 hover:bg-primary hover:text-background transition-colors"
                >
                    {copied ? (
                        <Check className="h-3.5 w-3.5" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                </button>
                <a
                    href={`https://solscan.io/account/${wallet}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-none border border-border bg-background p-2 hover:bg-primary hover:text-background transition-colors"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>
        </SettingsSection>
    );
}

// ─── Referral Section ─────────────────────────────────────────────

function ReferralSection({ wallet }: { wallet: string }) {
    const [referralLink, setReferralLink] = useState<string | null>(null);
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referredCount, setReferredCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchReferral(wallet);
                setReferralCode(data.referral_code);
                setReferralLink(data.referral_link);
                setReferredCount(data.referred_count);
            } catch (e) {
                console.error("Failed to load referral:", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [wallet]);

    const handleCopy = async () => {
        if (!referralLink) return;
        await navigator.clipboard.writeText(referralLink);
        setCopied(true);
        showToast({ type: "success", message: "Referral link copied!" });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <SettingsSection
            icon={Share2}
            title="Referral"
            description="Share your referral link and earn rewards"
        >
            {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="font-mono text-xs">Loading...</span>
                </div>
            ) : referralLink ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <code className="flex-1 overflow-x-auto rounded-none border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground select-all">
                            {referralLink}
                        </code>
                        <button
                            onClick={handleCopy}
                            className="shrink-0 rounded-none border border-border bg-background p-2 hover:bg-primary hover:text-background transition-colors"
                        >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[9px] font-mono rounded-none border-primary/30 text-primary">
                            Code: {referralCode}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                            {referredCount} {referredCount === 1 ? "referral" : "referrals"}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="font-mono text-xs text-muted-foreground">
                    Claim a username to get your referral link
                </p>
            )}
        </SettingsSection>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
    const router = useRouter();
    const { ready, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const currentWallet = wallets[0]?.address ?? null;

    const [profile, setProfile] = useState<ApiUserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async () => {
        if (!currentWallet) return;
        try {
            const data = await fetchUserProfile(currentWallet);
            setProfile(data);
        } catch (e) {
            console.error("Failed to load profile:", e);
        } finally {
            setLoading(false);
        }
    }, [currentWallet]);

    useEffect(() => {
        if (ready && !authenticated) {
            router.replace("/");
            return;
        }
        if (currentWallet) {
            loadProfile();
        }
    }, [ready, authenticated, currentWallet, loadProfile, router]);

    if (!ready || loading) {
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

    if (!authenticated || !currentWallet) {
        return null; // Redirect handled in useEffect
    }

    const wallet = currentWallet;
    const avatarSeed = profile?.avatar_seed ?? wallet;

    return (
        <div className="min-h-screen">
            <Navbar />

            <div className="mx-auto max-w-2xl px-4 py-6 sm:py-12">
                {/* Header */}
                <div className="mb-6 sm:mb-8 flex items-center justify-between">
                    <Link
                        href={
                            profile?.username
                                ? `/u/@${profile.username}`
                                : `/u/${wallet}`
                        }
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Profile
                    </Link>
                </div>

                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <Settings className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold font-mono">Settings</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-9">
                        Manage your profile and account settings
                    </p>
                </div>

                {/* Settings Sections */}
                <div className="space-y-4">
                    <AvatarSection
                        currentSeed={avatarSeed}
                        avatarUrl={profile?.avatar_url ?? null}
                        wallet={wallet}
                        onUpdate={(update) => {
                            if (profile) setProfile({ ...profile, ...update });
                        }}
                    />

                    <UsernameSection
                        username={profile?.username ?? null}
                        wallet={wallet}
                        onClaim={(u) => {
                            if (profile) setProfile({ ...profile, username: u });
                        }}
                    />

                    <EmailSection
                        profile={profile ?? {
                            wallet,
                            username: null,
                            avatar_seed: wallet,
                            avatar_url: null,
                            email: null,
                            referral_code: null,
                            privy_id: null,
                            created_at: "",
                            stats: { total_bets: 0, wins: 0, losses: 0, draws: 0, win_rate: 0, total_wagered: 0, total_claimed: 0 },
                            recent_bets: [],
                        }}
                        wallet={wallet}
                        onUpdate={(email) => {
                            if (profile) setProfile({ ...profile, email });
                        }}
                    />

                    <SocialSection />

                    <WalletSection wallet={wallet} />

                    <ReferralSection wallet={wallet} />
                </div>
            </div>

            <Footer />
        </div>
    );
}
