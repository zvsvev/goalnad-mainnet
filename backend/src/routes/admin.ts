/**
 * Admin routes for GoalNad backend.
 * Protected by X-Admin-Key header (must match ADMIN_API_KEY env var).
 *
 * Endpoints:
 *   POST /api/admin/test-match        — Create a fake match with custom timing
 *   POST /api/admin/resolve-test      — Manually resolve a test match
 *   POST /api/admin/oracle-predict    — Set Oracle prediction on an existing match
 *   POST /api/admin/fund-agent        — Give $GOAL balance to an agent for testing
 *   GET  /api/admin/test-timeline     — View the test match timeline
 */

import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db/connection.js";
import { config } from "../config.js";
import {
    publishPredictionOnChain,
    resolveMatchOnChain,
    isChainEnabled,
    getNextMatchId,
} from "../services/chain.js";
import type { Address } from "viem";

const router = Router();

// ─── Auth Middleware ──────────────────────────────────────────────────

const ADMIN_KEY = process.env.ADMIN_API_KEY || "goalnad-admin-secret";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const key = req.headers["x-admin-key"];
    if (!key || key !== ADMIN_KEY) {
        return res.status(401).json({ error: "Unauthorized — X-Admin-Key required" });
    }
    next();
}

router.use(requireAdmin);

// ─── POST /api/admin/test-match ──────────────────────────────────────
//
// Creates a compressed-timeline test match:
//   - kickoffMinutes (default 60): when the "match" kicks off
//   - lockdownMinutes (default 30): when bidding closes
//   - publishOnChain (default true): also publish on GoalNadArena contract
//
// This creates a full 1-hour test cycle:
//   T+0:  Match created + Oracle prediction published
//   T+30: Lockdown (bidding closes)
//   T+60: "Kickoff" (match starts)
//   T+60+: Admin resolves via /api/admin/resolve-test

router.post("/test-match", async (req: Request, res: Response) => {
    try {
        const {
            homeTeam = "Test FC",
            awayTeam = "Trial United",
            kickoffMinutes = 60,
            lockdownMinutes = 30,
            oraclePrediction = 1,
            oracleScore = "2-1",
            oracleConviction = 75,
            oracleAnalysis = null,
            leagueId = "TEST",
            leagueName = "Test League",
            publishOnChain = true,
        } = req.body;

        // Validate oracle prediction (1=Home, 2=Away, 3=Draw)
        if (![1, 2, 3].includes(oraclePrediction)) {
            return res.status(400).json({ error: "oraclePrediction must be 1 (Home), 2 (Away), or 3 (Draw)" });
        }

        const now = new Date();
        const matchDate = new Date(now.getTime() + kickoffMinutes * 60 * 1000);
        const lockdownTime = new Date(now.getTime() + lockdownMinutes * 60 * 1000);

        // Generate a unique fake API match ID (large positive to avoid collision with real IDs)
        const fakeApiMatchId = Math.floor(Date.now() / 1000) + 900000000;

        // Generate analysis if not provided
        const analysis = oracleAnalysis ||
            `Test prediction: Oracle calls ${oraclePrediction === 1 ? "Home Win" : oraclePrediction === 2 ? "Away Win" : "Draw"} ` +
            `${oracleScore} for ${homeTeam} vs ${awayTeam}. Conviction: ${oracleConviction}/100.`;

        const result = db.prepare(`
      INSERT INTO matches (
        api_match_id, league_id, league_name,
        home_team, away_team,
        home_score, away_score,
        status, match_date, round,
        oracle_prediction, oracle_score, oracle_analysis, oracle_conviction,
        lockdown_time,
        total_pot, highest_bid, resolved
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 'NS', ?, 'Test Match', ?, ?, ?, ?, ?, 0, 0, 0)
    `).run(
            fakeApiMatchId,
            leagueId,
            leagueName,
            homeTeam,
            awayTeam,
            matchDate.toISOString(),
            oraclePrediction,
            oracleScore,
            analysis,
            oracleConviction,
            lockdownTime.toISOString()
        );

        const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(result.lastInsertRowid) as any;

        // Publish on-chain if enabled
        let txHash: string | null = null;
        let onchainMatchId: number | null = null;
        if (publishOnChain && isChainEnabled()) {
            try {
                const lockdownTimestamp = Math.floor(lockdownTime.getTime() / 1000);
                const chainResult = await publishPredictionOnChain(
                    fakeApiMatchId,
                    oraclePrediction,
                    oracleScore || "",
                    analysis,
                    lockdownTimestamp
                );
                txHash = chainResult.txHash;
                onchainMatchId = Number(chainResult.onchainMatchId);

                // Store tx hash and on-chain match ID
                db.prepare("UPDATE matches SET oracle_tx_hash = ?, onchain_match_id = ? WHERE id = ?")
                    .run(txHash, onchainMatchId, match.id);

                console.log(`[Admin] On-chain test match published: tx=${txHash}, onchainMatchId=${onchainMatchId}`);
            } catch (chainErr: any) {
                console.warn(`[Admin] On-chain publish failed: ${chainErr.message}`);
            }
        }

        console.log(`[Admin] Test match created: ${homeTeam} vs ${awayTeam} (ID: ${result.lastInsertRowid})`);
        console.log(`[Admin] Kickoff: ${matchDate.toISOString()}`);
        console.log(`[Admin] Lockdown: ${lockdownTime.toISOString()}`);
        console.log(`[Admin] Oracle: ${oraclePrediction} (${oracleScore}), conviction: ${oracleConviction}`);

        res.status(201).json({
            message: "Test match created",
            match: db.prepare("SELECT * FROM matches WHERE id = ?").get(match.id),
            onChain: {
                txHash,
                status: txHash ? "confirmed" : publishOnChain ? "failed" : "skipped",
            },
            timing: {
                now: now.toISOString(),
                lockdown: lockdownTime.toISOString(),
                kickoff: matchDate.toISOString(),
                auctionWindowMinutes: lockdownMinutes,
                totalDurationMinutes: kickoffMinutes,
            },
            timeline: {
                "T+0 (now)": "Match created + Oracle prediction published",
                [`T+${lockdownMinutes}min`]: "Bidding closes (lockdown)",
                [`T+${kickoffMinutes}min`]: "Kickoff — match starts",
                [`T+${kickoffMinutes}min+`]: "Admin resolves via POST /api/admin/resolve-test",
            },
        });
    } catch (err: any) {
        console.error("Error creating test match:", err.message);
        res.status(500).json({ error: "Failed to create test match" });
    }
});

// ─── POST /api/admin/resolve-test ────────────────────────────────────
//
// Resolves a test match. Also resolves on-chain if chain is enabled.

router.post("/resolve-test", async (req: Request, res: Response) => {
    try {
        const {
            matchId,
            result: matchResult,
            homeScore,
            awayScore,
            resolveOnChain = true,
        } = req.body;

        if (!matchId) {
            return res.status(400).json({ error: "matchId is required" });
        }
        if (![1, 2, 3].includes(matchResult)) {
            return res.status(400).json({ error: "result must be 1 (Home), 2 (Away), or 3 (Draw)" });
        }

        // Get the match
        const match = db.prepare("SELECT * FROM matches WHERE id = ? OR api_match_id = ?").get(matchId, matchId) as any;
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }
        if (match.resolved) {
            return res.status(400).json({ error: "Match already resolved" });
        }

        const oracleCorrect = matchResult === match.oracle_prediction;

        // Determine scores if not provided
        const finalHomeScore = homeScore ?? (matchResult === 1 ? 2 : matchResult === 2 ? 0 : 1);
        const finalAwayScore = awayScore ?? (matchResult === 1 ? 0 : matchResult === 2 ? 2 : 1);

        // Resolve the match in DB
        const resolveTransaction = db.transaction(() => {
            // Update match status
            db.prepare(`
        UPDATE matches
        SET status = 'FT', resolved = 1, result = ?,
            home_score = ?, away_score = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(matchResult, finalHomeScore, finalAwayScore, match.id);

            // Get all bids for this match
            const bids = db.prepare("SELECT * FROM bids WHERE match_id = ?").all(match.id) as any[];
            const challengers = bids.filter((b: any) => b.type === "challenge");
            const supporters = bids.filter((b: any) => b.type === "support");

            if (challengers.length === 0) {
                console.log("[Admin] No challengers — nothing to distribute");
                return { winners: [], distribution: "none", challengers: 0, supporters: supporters.length };
            }

            if (matchResult === 3 && match.oracle_prediction !== 3) {
                // Draw: full refund to all challengers (no fee)
                for (const bid of challengers) {
                    db.prepare("UPDATE agents_metadata SET balance = balance + ? WHERE agent_wallet = ?")
                        .run(bid.amount, bid.agent_wallet);
                }
                return { winners: [], distribution: "draw_refund", challengers: challengers.length, supporters: supporters.length };
            }

            if (oracleCorrect) {
                // Oracle correct: pick random supporter -> 99% of pot (1% burned)
                if (supporters.length > 0) {
                    const luckyIdx = Math.floor(Math.random() * supporters.length);
                    const luckySupporter = supporters[luckyIdx];
                    const burnAmount = Math.floor(match.total_pot * 0.01);
                    const supporterPrize = match.total_pot - burnAmount;

                    db.prepare("UPDATE agents_metadata SET balance = balance + ?, wins = wins + 1 WHERE agent_wallet = ?")
                        .run(supporterPrize, luckySupporter.agent_wallet);

                    for (const bid of challengers) {
                        db.prepare("UPDATE agents_metadata SET losses = losses + 1 WHERE agent_wallet = ?")
                            .run(bid.agent_wallet);
                    }

                    return {
                        winners: [{ wallet: luckySupporter.agent_wallet, prize: supporterPrize, type: "luckySupporter" }],
                        burned: burnAmount,
                        distribution: "oracle_win",
                        challengers: challengers.length,
                        supporters: supporters.length,
                    };
                }
                return { winners: [], distribution: "oracle_win_no_supporters", challengers: challengers.length, supporters: 0 };
            } else {
                // Oracle wrong: highest bidder wins 99% of pot (1% burned)
                const highestBidder = challengers.reduce((a: any, b: any) => a.amount > b.amount ? a : b);
                const burnAmount = Math.floor(match.total_pot * 0.01);
                const winnerPrize = match.total_pot - burnAmount;
                db.prepare("UPDATE agents_metadata SET balance = balance + ?, wins = wins + 1 WHERE agent_wallet = ?")
                    .run(winnerPrize, highestBidder.agent_wallet);

                for (const bid of challengers) {
                    if (bid.agent_wallet !== highestBidder.agent_wallet) {
                        db.prepare("UPDATE agents_metadata SET losses = losses + 1 WHERE agent_wallet = ?")
                            .run(bid.agent_wallet);
                    }
                }

                return {
                    winners: [{ wallet: highestBidder.agent_wallet, prize: winnerPrize, type: "highestBidder" }],
                    burned: burnAmount,
                    distribution: "challenger_win",
                    challengers: challengers.length,
                    supporters: supporters.length,
                };
            }
        });

        const resolution = resolveTransaction();

        // Resolve on-chain too
        let onChainTxHash: string | null = null;
        if (resolveOnChain && isChainEnabled() && match.onchain_match_id != null) {
            try {
                const luckyAddress = (resolution.winners?.length > 0
                    ? resolution.winners[0].wallet
                    : "0x0000000000000000000000000000000000000000") as Address;

                onChainTxHash = await resolveMatchOnChain(
                    BigInt(match.onchain_match_id),
                    matchResult,
                    luckyAddress
                );
                console.log(`[Admin] On-chain resolution tx: ${onChainTxHash}`);
            } catch (chainErr: any) {
                console.warn(`[Admin] On-chain resolution failed: ${chainErr.message}`);
            }
        }

        const updatedMatch = db.prepare("SELECT * FROM matches WHERE id = ?").get(match.id);

        console.log(`[Admin] Match ${match.id} resolved: result=${matchResult}, oracleCorrect=${oracleCorrect}`);
        console.log(`[Admin] Distribution: ${resolution.distribution}`);

        res.json({
            message: "Match resolved",
            match: updatedMatch,
            resolution: {
                oracleCorrect,
                ...resolution,
            },
            onChain: {
                txHash: onChainTxHash,
                status: onChainTxHash ? "confirmed" : "skipped",
            },
        });
    } catch (err: any) {
        console.error("Error resolving test match:", err.message);
        res.status(500).json({ error: "Failed to resolve test match" });
    }
});

// ─── POST /api/admin/oracle-predict ──────────────────────────────────

router.post("/oracle-predict", (req: Request, res: Response) => {
    try {
        const { matchId, prediction, score } = req.body;

        if (!matchId || !prediction) {
            return res.status(400).json({ error: "matchId and prediction are required" });
        }
        if (![1, 2, 3].includes(prediction)) {
            return res.status(400).json({ error: "prediction must be 1 (Home), 2 (Away), or 3 (Draw)" });
        }

        const match = db.prepare("SELECT * FROM matches WHERE api_match_id = ?").get(matchId) as any;
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }

        // Set lockdown to kickoff time
        const kickoff = new Date(match.match_date).getTime();
        const lockdownTime = new Date(kickoff).toISOString();

        db.prepare(`
      UPDATE matches SET oracle_prediction = ?, oracle_score = ?, lockdown_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE api_match_id = ?
    `).run(prediction, score || null, lockdownTime, matchId);

        const updated = db.prepare("SELECT * FROM matches WHERE api_match_id = ?").get(matchId);

        res.json({ message: "Oracle prediction set", match: updated });
    } catch (err: any) {
        console.error("Error setting prediction:", err.message);
        res.status(500).json({ error: "Failed to set prediction" });
    }
});

// ─── POST /api/admin/fund-agent — Give test $GOAL to an agent ────────

router.post("/fund-agent", (req: Request, res: Response) => {
    try {
        const { wallet, amount = 100000, name } = req.body;

        if (!wallet) {
            return res.status(400).json({ error: "wallet address is required" });
        }

        // Upsert agent
        const existing = db.prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?").get(wallet) as any;

        if (existing) {
            db.prepare("UPDATE agents_metadata SET balance = balance + ? WHERE agent_wallet = ?")
                .run(amount, wallet);
        } else {
            db.prepare(`
        INSERT INTO agents_metadata (agent_wallet, agent_name, balance, support_quota, wins, losses, persona_type)
        VALUES (?, ?, ?, 0, 0, 0, 'house')
      `).run(wallet, name || `Agent_${wallet.slice(0, 8)}`, amount);
        }

        const agent = db.prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?").get(wallet);

        console.log(`[Admin] Funded agent ${wallet}: +${amount} $GOAL`);
        res.json({ message: "Agent funded", agent });
    } catch (err: any) {
        console.error("Error funding agent:", err.message);
        res.status(500).json({ error: "Failed to fund agent" });
    }
});

// ─── POST /api/admin/rename-agent — Rename an agent in the DB ────────

router.post("/rename-agent", (req: Request, res: Response) => {
    try {
        const { wallet, newName } = req.body;

        if (!wallet || !newName) {
            return res.status(400).json({ error: "wallet and newName are required" });
        }

        const existing = db.prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?").get(wallet) as any;
        if (!existing) {
            return res.status(404).json({ error: "Agent not found" });
        }

        db.prepare("UPDATE agents_metadata SET agent_name = ? WHERE agent_wallet = ?")
            .run(newName, wallet);

        // Also update the name in any existing bids
        db.prepare("UPDATE bids SET agent_name = ? WHERE agent_wallet = ?")
            .run(newName, wallet);

        const agent = db.prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?").get(wallet);
        console.log(`[Admin] Renamed agent ${wallet}: ${existing.agent_name} → ${newName}`);
        res.json({ message: `Agent renamed: ${existing.agent_name} → ${newName}`, agent });
    } catch (err: any) {
        console.error("Error renaming agent:", err.message);
        res.status(500).json({ error: "Failed to rename agent" });
    }
});

// ─── GET /api/admin/test-timeline — View active test matches ─────────

router.get("/test-timeline", (_req: Request, res: Response) => {
    try {
        const testMatches = db.prepare(`
      SELECT * FROM matches
      WHERE league_id = 'TEST'
      ORDER BY created_at DESC
      LIMIT 10
    `).all() as any[];

        const now = new Date();

        const timeline = testMatches.map((m: any) => {
            const lockdown = new Date(m.lockdown_time);
            const kickoff = new Date(m.match_date);

            let phase: string;
            if (m.resolved) {
                phase = "RESOLVED";
            } else if (now >= kickoff) {
                phase = "READY_TO_RESOLVE";
            } else if (now >= lockdown) {
                phase = "LOCKED (bidding closed)";
            } else {
                phase = "OPEN (bidding active)";
            }

            return {
                id: m.id,
                apiMatchId: m.api_match_id,
                match: `${m.home_team} vs ${m.away_team}`,
                oracle: `${m.oracle_prediction} (${m.oracle_score})`,
                conviction: m.oracle_conviction,
                phase,
                lockdown: m.lockdown_time,
                kickoff: m.match_date,
                resolved: !!m.resolved,
                result: m.result,
                totalPot: m.total_pot,
                highestBid: m.highest_bid,
                txHash: m.oracle_tx_hash,
            };
        });

        res.json({ testMatches: timeline, count: timeline.length });
    } catch (err: any) {
        console.error("Error fetching test timeline:", err.message);
        res.status(500).json({ error: "Failed to fetch test timeline" });
    }
});

// ─── POST /api/admin/delete-agent — Remove an agent and their bids ───

router.post("/delete-agent", (req: Request, res: Response) => {
    try {
        const { wallet } = req.body;

        if (!wallet) {
            return res.status(400).json({ error: "wallet address is required" });
        }

        const existing = db.prepare("SELECT * FROM agents_metadata WHERE agent_wallet = ?").get(wallet) as any;
        if (!existing) {
            return res.status(404).json({ error: "Agent not found" });
        }

        const deleteTransaction = db.transaction(() => {
            // Refund bids on unresolved matches
            const unresolvedBids = db.prepare(`
                SELECT b.*, m.highest_bidder, m.highest_bid, m.total_pot, m.id as mid
                FROM bids b JOIN matches m ON b.match_id = m.id
                WHERE b.agent_wallet = ? AND m.resolved = 0 AND b.type = 'challenge'
            `).all(wallet) as any[];

            for (const bid of unresolvedBids) {
                // If this agent was the highest bidder, reset the match
                if (bid.highest_bidder === wallet) {
                    db.prepare("UPDATE matches SET highest_bid = 0, highest_bidder = NULL, total_pot = total_pot - ? WHERE id = ?")
                        .run(bid.amount, bid.mid);
                }
            }

            // Delete all bids by this agent
            const deletedBids = db.prepare("DELETE FROM bids WHERE agent_wallet = ?").run(wallet);

            // Delete the agent
            db.prepare("DELETE FROM agents_metadata WHERE agent_wallet = ?").run(wallet);

            return { deletedBids: deletedBids.changes, agentName: existing.agent_name };
        });

        const result = deleteTransaction();

        console.log(`[Admin] Deleted agent ${existing.agent_name} (${wallet}), removed ${result.deletedBids} bids`);
        res.json({
            message: `Agent ${result.agentName} deleted`,
            deletedBids: result.deletedBids,
        });
    } catch (err: any) {
        console.error("Error deleting agent:", err.message);
        res.status(500).json({ error: "Failed to delete agent" });
    }
});

export default router;
