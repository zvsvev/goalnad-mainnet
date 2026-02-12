import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";

const router = Router();

// ─── Constants ───
const MIN_BID = 1000;
const MIN_INCREMENT = 1000;
const DEFAULT_BALANCE = 100_000;
const SUPPORT_QUOTA_PER_CHALLENGE = 2;

// ─── Helper: extract wallet from header ───
function getWallet(req: Request): string | null {
    const wallet = req.headers["x-agent-wallet"];
    if (!wallet || typeof wallet !== "string") return null;
    return wallet.trim();
}

// ─── POST /api/agent/register ───
router.post("/register", (req: Request, res: Response) => {
    try {
        const { wallet, name } = req.body;

        if (!wallet || typeof wallet !== "string") {
            return res.status(400).json({ error: "wallet is required" });
        }

        // Check if already registered
        const existing = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet);
        if (existing) {
            return res.status(409).json({ error: "Agent already registered", agent: existing });
        }

        db.prepare(
            `INSERT INTO agents_metadata (agent_wallet, agent_name, balance, support_quota, wins, losses)
             VALUES (?, ?, ?, 0, 0, 0)`
        ).run(wallet, name || null, DEFAULT_BALANCE);

        const agent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet);

        res.status(201).json({ message: "Agent registered", agent });
    } catch (err: any) {
        console.error("Error registering agent:", err.message);
        res.status(500).json({ error: "Failed to register agent" });
    }
});

// ─── GET /api/agent/status ───
router.get("/status", (req: Request, res: Response) => {
    try {
        const wallet = getWallet(req);
        if (!wallet) {
            return res.status(400).json({ error: "X-Agent-Wallet header is required" });
        }

        const agent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet) as any;
        if (!agent) {
            return res.status(404).json({ error: "Agent not found. Register first." });
        }

        // Get active bids with match info
        const activeBids = db
            .prepare(
                `SELECT b.*, m.home_team, m.away_team, m.match_date, m.status as match_status,
                        m.oracle_prediction, m.total_pot, m.highest_bid
                 FROM bids b
                 JOIN matches m ON b.match_id = m.id
                 WHERE b.agent_wallet = ?
                 ORDER BY b.created_at DESC
                 LIMIT 20`
            )
            .all(wallet);

        res.json({
            agent: {
                wallet: agent.agent_wallet,
                name: agent.agent_name,
                balance: agent.balance,
                supportQuota: agent.support_quota,
                wins: agent.wins,
                losses: agent.losses,
                personaType: agent.persona_type,
            },
            activeBids,
        });
    } catch (err: any) {
        console.error("Error fetching agent status:", err.message);
        res.status(500).json({ error: "Failed to fetch agent status" });
    }
});

// ─── POST /api/agent/bid ───
// Matches contract bid() logic: additive pot, top-up bids, no refunds on outbid.
// DB tracks bids for display/stats — on-chain is the source of truth for tokens.
router.post("/bid", async (req: Request, res: Response) => {
    try {
        const wallet = getWallet(req);
        if (!wallet) {
            return res.status(400).json({ error: "X-Agent-Wallet header is required" });
        }

        const { matchId, amount, comment } = req.body;

        if (!matchId || !amount) {
            return res.status(400).json({ error: "matchId and amount are required" });
        }

        if (typeof amount !== "number" || amount < MIN_BID) {
            return res.status(400).json({ error: `Minimum bid is ${MIN_BID} $GOAL` });
        }

        // 1. Check agent exists
        const agent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet) as any;
        if (!agent) {
            return res.status(404).json({ error: "Agent not found. Register first." });
        }

        // 2. Check match exists and is biddable
        const match = db
            .prepare("SELECT * FROM matches WHERE api_match_id = ?")
            .get(matchId) as any;
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }
        if (match.status !== "NS") {
            return res.status(400).json({ error: "Match is not open for bidding (status: " + match.status + ")" });
        }

        // 3. Check if match has started (bids close at kickoff)
        const kickoff = new Date(match.match_date).getTime();
        if (Date.now() >= kickoff) {
            return res.status(400).json({ error: "Bidding is closed — match has started." });
        }

        // 4. Check mutual exclusivity — can't bid if already supported
        const existingBid = db
            .prepare("SELECT * FROM bids WHERE agent_wallet = ? AND match_id = ?")
            .get(wallet, match.id) as any;
        if (existingBid && existingBid.type === "support") {
            return res.status(400).json({ error: "You already supported this match — cannot also challenge." });
        }

        // 5. Compute new cumulative total (contract allows top-up bids)
        const currentBid = existingBid ? existingBid.amount : 0;
        const newTotalBid = currentBid + amount;

        // 6. Check bid beats current highest by MIN_INCREMENT
        //    Exception: current highest bidder can top-up without needing to beat themselves
        const currentHighest = match.highest_bid || 0;
        const isSelfTopUp = match.highest_bidder === wallet;
        if (!isSelfTopUp && newTotalBid < currentHighest + MIN_INCREMENT) {
            return res.status(400).json({
                error: `Total bid must be at least ${currentHighest + MIN_INCREMENT} $GOAL (current highest: ${currentHighest} + ${MIN_INCREMENT} increment). Your current bid: ${currentBid}.`,
                currentHighestBid: currentHighest,
                yourCurrentBid: currentBid,
                minimumRequired: currentHighest + MIN_INCREMENT,
            });
        }

        if (newTotalBid < MIN_BID) {
            return res.status(400).json({ error: `Minimum total bid is ${MIN_BID} $GOAL` });
        }

        // ─── Execute bid (all in a transaction) ───
        // Matches contract logic: additive pot, no refunds, tokens stay locked
        const executeBid = db.transaction(() => {
            const isFirstBid = !existingBid;

            if (isFirstBid) {
                // First bid — grant support quota
                db.prepare(
                    "UPDATE agents_metadata SET support_quota = support_quota + ? WHERE agent_wallet = ?"
                ).run(SUPPORT_QUOTA_PER_CHALLENGE, wallet);

                // Insert bid record
                db.prepare(
                    "INSERT INTO bids (agent_wallet, match_id, amount, type, comment) VALUES (?, ?, ?, 'challenge', ?)"
                ).run(wallet, match.id, amount, comment || null);
            } else {
                // Top-up — update existing bid amount (no extra quota)
                db.prepare(
                    "UPDATE bids SET amount = ?, comment = COALESCE(?, comment) WHERE agent_wallet = ? AND match_id = ?"
                ).run(newTotalBid, comment || null, wallet, match.id);
            }

            // Additive pot tracking (matches contract: totalPot += amount)
            const newTotalPot = (match.total_pot || 0) + amount;

            // Update highest bid if this agent's cumulative total beats it
            const newHighestBid = newTotalBid > currentHighest ? newTotalBid : currentHighest;
            const newHighestBidder = newTotalBid > currentHighest ? wallet : match.highest_bidder;

            db.prepare(
                "UPDATE matches SET highest_bid = ?, highest_bidder = ?, total_pot = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            ).run(newHighestBid, newHighestBidder, newTotalPot, match.id);
        });

        executeBid();

        // NOTE: On-chain transactions are signed directly by agents.
        // The backend event indexer syncs on-chain state to DB automatically.

        // Fetch updated state
        const updatedAgent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet) as any;
        const updatedMatch = db
            .prepare("SELECT * FROM matches WHERE id = ?")
            .get(match.id) as any;

        res.status(201).json({
            message: existingBid ? "Challenge bid topped up successfully" : "Challenge bid placed successfully",
            bid: {
                matchId: updatedMatch.api_match_id,
                amount,
                totalBid: existingBid ? (existingBid.amount + amount) : amount,
                comment: comment || null,
            },
            match: {
                homeTeam: updatedMatch.home_team,
                awayTeam: updatedMatch.away_team,
                totalPot: updatedMatch.total_pot,
                highestBid: updatedMatch.highest_bid,
                highestBidder: updatedMatch.highest_bidder,
            },
            agent: {
                wallet: updatedAgent.agent_wallet,
                supportQuota: updatedAgent.support_quota,
            },
        });
    } catch (err: any) {
        console.error("Error placing bid:", err.message);
        res.status(500).json({ error: "Failed to place bid" });
    }
});

// ─── POST /api/agent/support ───
router.post("/support", async (req: Request, res: Response) => {
    try {
        const wallet = getWallet(req);
        if (!wallet) {
            return res.status(400).json({ error: "X-Agent-Wallet header is required" });
        }

        const { matchId, comment } = req.body;

        if (!matchId) {
            return res.status(400).json({ error: "matchId is required" });
        }

        // 1. Check agent exists
        const agent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet) as any;
        if (!agent) {
            return res.status(404).json({ error: "Agent not found. Register first." });
        }

        // 2. Check support quota
        if (agent.support_quota <= 0) {
            return res.status(400).json({
                error: "No support quota available. Challenge a match first to earn +2 quota.",
                supportQuota: agent.support_quota,
            });
        }

        // 3. Check match exists and is open
        const match = db
            .prepare("SELECT * FROM matches WHERE api_match_id = ?")
            .get(matchId) as any;
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }
        if (match.status !== "NS") {
            return res.status(400).json({ error: "Match is not open for support (status: " + match.status + ")" });
        }

        // 4. Check if match has started (bids close at kickoff)
        const kickoff = new Date(match.match_date).getTime();
        if (Date.now() >= kickoff) {
            return res.status(400).json({ error: "Bidding is closed — match has started." });
        }

        // 5. Check agent hasn't already acted on this match
        const existingBid = db
            .prepare("SELECT * FROM bids WHERE agent_wallet = ? AND match_id = ?")
            .get(wallet, match.id);
        if (existingBid) {
            return res.status(400).json({ error: "You have already acted on this match (challenge or support)" });
        }

        // ─── Execute support (transaction) ───
        const executeSupport = db.transaction(() => {
            // Deduct 1 support quota
            db.prepare(
                "UPDATE agents_metadata SET support_quota = support_quota - 1 WHERE agent_wallet = ?"
            ).run(wallet);

            // Insert support record
            db.prepare(
                "INSERT INTO bids (agent_wallet, match_id, amount, type, comment) VALUES (?, ?, 0, 'support', ?)"
            ).run(wallet, match.id, comment || null);
        });

        executeSupport();

        // NOTE: On-chain transactions are now signed directly by agents
        // via their own wallets (support() contract function).
        // The backend event indexer picks up on-chain events automatically.

        // Fetch updated agent
        const updatedAgent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet) as any;

        // Count supporters for this match
        const supporterCount = db
            .prepare("SELECT COUNT(*) as count FROM bids WHERE match_id = ? AND type = 'support'")
            .get(match.id) as any;

        res.status(201).json({
            message: "Support placed successfully",
            support: {
                matchId: match.api_match_id,
                comment: comment || null,
            },
            match: {
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                supportersCount: supporterCount.count,
            },
            agent: {
                wallet: updatedAgent.agent_wallet,
                balance: updatedAgent.balance,
                supportQuota: updatedAgent.support_quota,
            },
        });
    } catch (err: any) {
        console.error("Error placing support:", err.message);
        res.status(500).json({ error: "Failed to place support" });
    }
});

// ─── GET /api/agent/:wallet — public agent profile ───
router.get("/:wallet", (req: Request, res: Response) => {
    try {
        const { wallet } = req.params;

        const agent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet) as any;
        if (!agent) {
            return res.status(404).json({ error: "Agent not found" });
        }

        // Get recent bids with match info
        const recentBids = db
            .prepare(
                `SELECT b.amount, b.type, b.comment, b.created_at,
                        m.api_match_id, m.home_team, m.away_team, m.match_date,
                        m.status as match_status, m.league_id
                 FROM bids b
                 JOIN matches m ON b.match_id = m.id
                 WHERE b.agent_wallet = ?
                 ORDER BY b.created_at DESC
                 LIMIT 30`
            )
            .all(wallet);

        const totalBids = recentBids.length;
        const winRate =
            agent.wins + agent.losses > 0
                ? Math.round((agent.wins / (agent.wins + agent.losses)) * 100)
                : 0;

        res.json({
            agent: {
                wallet: agent.agent_wallet,
                name: agent.agent_name,
                balance: agent.balance,
                supportQuota: agent.support_quota,
                wins: agent.wins,
                losses: agent.losses,
                winRate,
                personaType: agent.persona_type,
            },
            recentBids,
            totalBids,
        });
    } catch (err: any) {
        console.error("Error fetching agent profile:", err.message);
        res.status(500).json({ error: "Failed to fetch agent profile" });
    }
});

export default router;
