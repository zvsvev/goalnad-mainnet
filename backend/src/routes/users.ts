/**
 * Users routes — profile management
 *
 * GET    /api/users/:walletOrUsername  — fetch profile (wallet or @username)
 * POST   /api/users/claim-username    — one-time username claim
 * POST   /api/users/update-avatar     — update avatar seed
 * GET    /api/users/:wallet/pnl       — P&L history
 * GET    /api/users/:wallet/referral  — referral code + stats
 */

import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────

function generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
    let code = "GOAL";
    for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function isValidUsername(username: string): boolean {
    return /^[a-z0-9_]{3,20}$/.test(username);
}

function ensureUserRow(wallet: string): void {
    const existing = db.prepare("SELECT wallet FROM users WHERE wallet = ?").get(wallet);
    if (!existing) {
        const referralCode = generateReferralCode();
        db.prepare(
            "INSERT OR IGNORE INTO users (wallet, referral_code) VALUES (?, ?)"
        ).run(wallet, referralCode);
    }
}

// ─── GET /api/users/search?q= ────────────────────────────────────────

router.get("/search", (req: Request, res: Response) => {
    const q = (req.query.q as string || "").trim().toLowerCase();
    if (q.length < 2) {
        return res.json({ users: [] });
    }

    try {
        const users = db.prepare(`
            SELECT wallet, username, avatar_seed, avatar_url
            FROM users
            WHERE LOWER(username) LIKE ? OR LOWER(wallet) LIKE ?
            LIMIT 10
        `).all(`${q}%`, `%${q}%`) as any[];

        res.json({
            users: users.map((u: any) => ({
                wallet: u.wallet,
                username: u.username || null,
                avatar_seed: u.avatar_seed || u.wallet,
                avatar_url: u.avatar_url || null,
            })),
        });
    } catch (err: any) {
        console.error("Error searching users:", err.message);
        res.status(500).json({ error: "Failed to search users" });
    }
});

// ─── GET /api/users/referrals/leaderboard ────────────────────────────

router.get("/referrals/leaderboard", (_req: Request, res: Response) => {
    try {
        const referrers = db.prepare(`
            SELECT
                u.wallet,
                u.username,
                u.avatar_seed,
                u.avatar_url,
                COUNT(r.wallet) as referred_count
            FROM users u
            JOIN users r ON r.referred_by = u.wallet
            GROUP BY u.wallet
            HAVING referred_count > 0
            ORDER BY referred_count DESC
            LIMIT 20
        `).all() as any[];

        res.json({
            count: referrers.length,
            referrers: referrers.map((r: any, i: number) => ({
                rank: i + 1,
                wallet: r.wallet,
                username: r.username || null,
                avatar_seed: r.avatar_seed || r.wallet,
                avatar_url: r.avatar_url || null,
                referred_count: r.referred_count,
            })),
        });
    } catch (err: any) {
        console.error("Error fetching referral leaderboard:", err.message);
        res.status(500).json({ error: "Failed to fetch referral leaderboard" });
    }
});

// ─── GET /api/users/:walletOrUsername ─────────────────────────────────

router.get("/:walletOrUsername", (req: Request, res: Response) => {
    const param = req.params.walletOrUsername as string;

    let wallet: string;

    // Check if it starts with @ → username lookup
    if (param.startsWith("@")) {
        const username = param.slice(1).toLowerCase();
        const user = db.prepare("SELECT wallet FROM users WHERE username = ?").get(username) as any;
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        wallet = user.wallet;
    } else {
        wallet = param;
    }

    // Ensure user row exists
    ensureUserRow(wallet);

    // Fetch user profile data
    const user = db.prepare("SELECT * FROM users WHERE wallet = ?").get(wallet) as any;

    // Fetch bet stats
    const stats = db.prepare(`
        SELECT
            COUNT(*) as total_bets,
            SUM(CASE WHEN m.resolved = 1 AND b.outcome = m.result AND m.result != 1 THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN m.resolved = 1 AND b.outcome != m.result AND m.result != 1 THEN 1 ELSE 0 END) as losses,
            SUM(CASE WHEN m.resolved = 1 AND m.result = 1 THEN 1 ELSE 0 END) as draws,
            COALESCE(SUM(b.amount), 0) as total_wagered,
            COALESCE(SUM(CASE WHEN b.claimed = 1 THEN b.claim_amount ELSE 0 END), 0) as total_claimed
        FROM bids b
        JOIN matches m ON b.match_id = m.id
        WHERE b.agent_wallet = ?
    `).get(wallet) as any;

    const totalDecided = (stats.wins || 0) + (stats.losses || 0);
    const winRate = totalDecided > 0 ? Math.round(((stats.wins || 0) / totalDecided) * 100) : 0;

    // Fetch recent bets
    const recentBets = db.prepare(`
        SELECT
            m.api_match_id,
            m.home_team,
            m.away_team,
            m.match_date,
            m.league_id,
            b.outcome,
            b.amount,
            b.claimed,
            b.refunded,
            m.result,
            m.resolved
        FROM bids b
        JOIN matches m ON b.match_id = m.id
        WHERE b.agent_wallet = ?
        ORDER BY m.match_date DESC
        LIMIT 50
    `).all(wallet) as any[];

    res.json({
        wallet: user.wallet,
        username: user.username || null,
        avatar_seed: user.avatar_seed || wallet,
        avatar_url: user.avatar_url || null,
        email: user.email || null,
        referral_code: user.referral_code || null,
        privy_id: null,
        created_at: user.created_at,
        stats: {
            total_bets: stats.total_bets || 0,
            wins: stats.wins || 0,
            losses: stats.losses || 0,
            draws: stats.draws || 0,
            win_rate: winRate,
            total_wagered: stats.total_wagered || 0,
            total_claimed: stats.total_claimed || 0,
        },
        recent_bets: recentBets.map((b: any) => ({
            api_match_id: b.api_match_id,
            home_team: b.home_team,
            away_team: b.away_team,
            match_date: b.match_date,
            league_id: b.league_id,
            outcome: b.outcome,
            amount: b.amount,
            claimed: !!b.claimed,
            refunded: !!b.refunded,
            result: b.result,
            resolved: b.resolved,
        })),
    });
});

// ─── POST /api/users/claim-username ──────────────────────────────────

router.post("/claim-username", (req: Request, res: Response) => {
    const { wallet, username } = req.body;

    if (!wallet || !username) {
        return res.status(400).json({ error: "wallet and username are required" });
    }

    const cleanUsername = username.toLowerCase().trim();

    if (!isValidUsername(cleanUsername)) {
        return res.status(400).json({
            error: "Username must be 3-20 characters, lowercase letters, numbers, and underscores only",
        });
    }

    // Reserved words
    const reserved = ["admin", "oracle", "goalscore", "goalnad", "system", "bot", "official"];
    if (reserved.includes(cleanUsername)) {
        return res.status(400).json({ error: "This username is reserved" });
    }

    ensureUserRow(wallet);

    // Check if user already has a username
    const user = db.prepare("SELECT username FROM users WHERE wallet = ?").get(wallet) as any;
    if (user?.username) {
        return res.status(400).json({ error: "Username already claimed — cannot change" });
    }

    // Check if username is taken
    const existing = db.prepare("SELECT wallet FROM users WHERE username = ?").get(cleanUsername) as any;
    if (existing) {
        return res.status(409).json({ error: "Username already taken" });
    }

    db.prepare("UPDATE users SET username = ? WHERE wallet = ?").run(cleanUsername, wallet);

    res.json({ success: true, username: cleanUsername });
});

// ─── POST /api/users/update-avatar ───────────────────────────────────

router.post("/update-avatar", (req: Request, res: Response) => {
    const { wallet, avatarSeed } = req.body;

    if (!wallet || !avatarSeed) {
        return res.status(400).json({ error: "wallet and avatarSeed are required" });
    }

    if (typeof avatarSeed !== "string" || avatarSeed.length > 50) {
        return res.status(400).json({ error: "Invalid avatar seed" });
    }

    ensureUserRow(wallet);

    db.prepare("UPDATE users SET avatar_seed = ? WHERE wallet = ?").run(avatarSeed, wallet);

    res.json({ success: true, avatar_seed: avatarSeed });
});

// ─── POST /api/users/update-email ───────────────────────────────────

router.post("/update-email", (req: Request, res: Response) => {
    const { wallet, email } = req.body;

    if (!wallet) {
        return res.status(400).json({ error: "wallet is required" });
    }

    // Allow clearing email by sending null/empty
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    ensureUserRow(wallet);

    db.prepare("UPDATE users SET email = ? WHERE wallet = ?").run(cleanEmail, wallet);

    res.json({ success: true, email: cleanEmail });
});

// ─── POST /api/users/upload-avatar ──────────────────────────────────

router.post("/upload-avatar", (req: Request, res: Response) => {
    const { wallet, avatarData } = req.body;

    if (!wallet || !avatarData) {
        return res.status(400).json({ error: "wallet and avatarData are required" });
    }

    // Validate base64 data URI format
    if (typeof avatarData !== "string" || !avatarData.startsWith("data:image/")) {
        return res.status(400).json({ error: "avatarData must be a base64 data URI (data:image/...)" });
    }

    // Max ~500KB base64 string (~375KB actual image)
    if (avatarData.length > 700_000) {
        return res.status(400).json({ error: "Image too large (max 500KB)" });
    }

    ensureUserRow(wallet);

    db.prepare("UPDATE users SET avatar_url = ? WHERE wallet = ?").run(avatarData, wallet);

    res.json({ success: true, avatar_url: avatarData });
});

// ─── GET /api/users/:wallet/pnl ──────────────────────────────────────

router.get("/:wallet/pnl", (req: Request, res: Response) => {
    const wallet = req.params.wallet as string;

    // Get all resolved bets with results for this wallet
    const bets = db.prepare(`
        SELECT
            m.match_date,
            b.amount,
            b.outcome,
            m.result,
            m.resolved,
            b.claimed,
            b.claim_amount
        FROM bids b
        JOIN matches m ON b.match_id = m.id
        WHERE b.agent_wallet = ? AND m.resolved = 1
        ORDER BY m.match_date ASC
    `).all(wallet) as any[];

    let cumulative = 0;
    const pnl = bets.map((b: any) => {
        const isDraw = b.result === 1;
        const isWin = b.outcome === b.result && !isDraw;

        if (isDraw) {
            // No change on draw (refunded)
        } else if (isWin && b.claimed) {
            cumulative += (b.claim_amount || 0) - b.amount; // profit
        } else if (!isWin) {
            cumulative -= b.amount; // loss
        }

        return {
            date: b.match_date,
            pnl: cumulative,
        };
    });

    res.json({ pnl });
});

// ─── GET /api/users/:wallet/referral ─────────────────────────────────

router.get("/:wallet/referral", (req: Request, res: Response) => {
    const wallet = req.params.wallet as string;

    ensureUserRow(wallet);

    const user = db.prepare("SELECT referral_code, username FROM users WHERE wallet = ?").get(wallet) as any;
    const referredCount = db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE referred_by = ?"
    ).get(wallet) as any;

    // Prefer username as referral code, fallback to random code
    const refCode = user?.username || user?.referral_code || null;

    const frontendUrl = process.env.FRONTEND_URL || "https://goalscore.fun";
    res.json({
        referral_code: refCode,
        referred_count: referredCount?.count || 0,
        referral_link: refCode
            ? `${frontendUrl}/?ref=${refCode}`
            : null,
    });
});

export default router;
