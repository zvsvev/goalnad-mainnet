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
// READ-ONLY ENDPOINT: Returns match info and instructions for on-chain bidding.
// Agents must sign their own bid() transaction on-chain.
// The backend indexer syncs on-chain events to DB automatically.
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

        // Store comment (optional, defaults to empty string)
        const agentComment = typeof comment === "string" ? comment.trim() : "";

        // 1. Check agent exists
        const agent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet) as any;
        if (!agent) {
            return res.status(404).json({ error: "Agent not found. Register first." });
        }

        // 2. Check match exists and has been published on-chain
        const match = db
            .prepare("SELECT * FROM matches WHERE api_match_id = ?")
            .get(matchId) as any;
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }
        if (!match.onchain_match_id && match.onchain_match_id !== 0) {
            return res.status(400).json({
                error: "Match not published on-chain yet. Oracle must publish prediction first.",
                matchId: match.api_match_id,
                homeTeam: match.home_team,
                awayTeam: match.away_team,
            });
        }
        if (match.status !== "NS") {
            return res.status(400).json({ error: "Match is not open for bidding (status: " + match.status + ")" });
        }

        // 3. Check if match has started (bids close at lockdown time)
        const lockdown = match.lockdown_time ? new Date(match.lockdown_time).getTime() : new Date(match.match_date).getTime();
        if (Date.now() >= lockdown) {
            return res.status(400).json({ error: "Bidding is closed — auction locked." });
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

        // ─── Store comment in database (off-chain) ───
        // This will be linked to the on-chain transaction when indexer processes BidPlaced event
        try {
            const commentStmt = db.prepare(`
                INSERT INTO bids (agent_wallet, match_id, amount, type, comment, created_at)
                VALUES (?, ?, ?, 'challenge', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(agent_wallet, match_id)
                DO UPDATE SET amount = ?, comment = ?, created_at = CURRENT_TIMESTAMP
            `);
            commentStmt.run(wallet, match.id, newTotalBid, agentComment, newTotalBid, agentComment);
        } catch (err: any) {
            console.warn("[Agent Bid] Failed to store comment:", err.message);
            // Don't fail the request if comment storage fails
        }

        // ─── Return on-chain transaction instructions ───
        // Agent must sign bid() transaction on-chain with these parameters
        res.status(200).json({
            message: "Bid validation passed. Sign on-chain transaction to complete.",
            onChainInstructions: {
                contract: process.env.ARENA_CONTRACT_ADDRESS,
                function: "bid",
                args: {
                    matchId: match.onchain_match_id,
                    amount: amount,
                },
                note: "Call contract.bid(matchId, amount) with your wallet. Amount should be in wei (multiply by 1e18).",
            },
            match: {
                onchainMatchId: match.onchain_match_id,
                apiMatchId: match.api_match_id,
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                oraclePrediction: match.oracle_prediction,
                totalPot: match.total_pot,
                highestBid: match.highest_bid,
                highestBidder: match.highest_bidder,
                lockdownTime: match.lockdown_time,
            },
            yourBid: {
                currentBid: currentBid,
                incrementAmount: amount,
                newTotalBid: newTotalBid,
            },
        });
    } catch (err: any) {
        console.error("Error validating bid:", err.message);
        res.status(500).json({ error: "Failed to validate bid" });
    }
});

// ─── POST /api/agent/support ───
// READ-ONLY ENDPOINT: Returns match info and instructions for on-chain support.
// Agents must sign their own support() transaction on-chain.
// The backend indexer syncs on-chain events to DB automatically.
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

        // Store comment (optional, defaults to empty string)
        const agentComment = typeof comment === "string" ? comment.trim() : "";

        // 1. Check agent exists
        const agent = db
            .prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?")
            .get(wallet) as any;
        if (!agent) {
            return res.status(404).json({ error: "Agent not found. Register first." });
        }

        // 2. Check support quota (DB value - will be validated on-chain too)
        if (agent.support_quota <= 0) {
            return res.status(400).json({
                error: "No support quota available. Challenge a match first to earn +2 quota.",
                supportQuota: agent.support_quota,
                note: "On-chain quota is the source of truth. This is a DB estimate.",
            });
        }

        // 3. Check match exists and has been published on-chain
        const match = db
            .prepare("SELECT * FROM matches WHERE api_match_id = ?")
            .get(matchId) as any;
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }
        if (!match.onchain_match_id && match.onchain_match_id !== 0) {
            return res.status(400).json({
                error: "Match not published on-chain yet. Oracle must publish prediction first.",
                matchId: match.api_match_id,
                homeTeam: match.home_team,
                awayTeam: match.away_team,
            });
        }
        if (match.status !== "NS") {
            return res.status(400).json({ error: "Match is not open for support (status: " + match.status + ")" });
        }

        // 4. Check if match has started (bids close at lockdown time)
        const lockdown = match.lockdown_time ? new Date(match.lockdown_time).getTime() : new Date(match.match_date).getTime();
        if (Date.now() >= lockdown) {
            return res.status(400).json({ error: "Bidding is closed — auction locked." });
        }

        // 5. Check agent hasn't already acted on this match (DB check - will be validated on-chain too)
        const existingBid = db
            .prepare("SELECT * FROM bids WHERE agent_wallet = ? AND match_id = ?")
            .get(wallet, match.id);
        if (existingBid) {
            return res.status(400).json({ error: "You have already acted on this match (challenge or support)" });
        }

        // ─── Store comment in database (off-chain) ───
        // This will be linked to the on-chain transaction when indexer processes Supported event
        try {
            const commentStmt = db.prepare(`
                INSERT INTO bids (agent_wallet, match_id, amount, type, comment, created_at)
                VALUES (?, ?, 0, 'support', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(agent_wallet, match_id) DO NOTHING
            `);
            commentStmt.run(wallet, match.id, agentComment);
        } catch (err: any) {
            console.warn("[Agent Support] Failed to store comment:", err.message);
            // Don't fail the request if comment storage fails
        }

        // ─── Return on-chain transaction instructions ───
        // Agent must sign support() transaction on-chain
        res.status(200).json({
            message: "Support validation passed. Sign on-chain transaction to complete.",
            onChainInstructions: {
                contract: process.env.ARENA_CONTRACT_ADDRESS,
                function: "support",
                args: {
                    matchId: match.onchain_match_id,
                },
                note: "Call contract.support(matchId) with your wallet. This will deduct 1 support quota on-chain.",
            },
            match: {
                onchainMatchId: match.onchain_match_id,
                apiMatchId: match.api_match_id,
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                oraclePrediction: match.oracle_prediction,
                lockdownTime: match.lockdown_time,
            },
            agent: {
                wallet: agent.agent_wallet,
                supportQuota: agent.support_quota,
                note: "On-chain quota is the source of truth. This is a DB estimate.",
            },
        });
    } catch (err: any) {
        console.error("Error validating support:", err.message);
        res.status(500).json({ error: "Failed to validate support" });
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
