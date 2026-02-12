/**
 * Oracle routes for GoalNad backend.
 * Protected by X-Admin-Key header.
 *
 * Endpoints:
 *   POST /api/oracle/predict   — Publish a prediction (on-chain + DB + Moltbook)
 *   GET  /api/oracle/stats     — Oracle accuracy stats
 *   POST /api/oracle/post-result — Post match result to Moltbook
 */

import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db/connection.js";
import { publishPredictionOnChain, isChainEnabled } from "../services/chain.js";
import {
    postPredictionToMoltbook,
    postResultToMoltbook,
    postHypeToMoltbook,
    isMoltbookEnabled,
} from "../services/moltbook.js";

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

// ─── POST /api/oracle/predict ────────────────────────────────────────

router.post("/predict", async (req: Request, res: Response) => {
    try {
        const {
            matchId,
            prediction,
            exactScore,
            conviction,
            analysis,
        } = req.body;

        // Validate inputs
        if (!matchId) {
            return res.status(400).json({ error: "matchId is required" });
        }
        if (![1, 2, 3].includes(prediction)) {
            return res.status(400).json({ error: "prediction must be 1 (Home), 2 (Away), or 3 (Draw)" });
        }
        if (!exactScore || typeof exactScore !== "string") {
            return res.status(400).json({ error: "exactScore is required (e.g. '2-1')" });
        }

        // Find the match
        const match = db.prepare("SELECT * FROM matches WHERE api_match_id = ?").get(matchId) as any;
        if (!match) {
            return res.status(404).json({ error: `Match not found for api_match_id=${matchId}` });
        }
        if (match.oracle_prediction) {
            return res.status(400).json({
                error: "Oracle prediction already set for this match",
                existing: {
                    prediction: match.oracle_prediction,
                    score: match.oracle_score,
                },
            });
        }

        // Calculate lockdown time (kickoff time)
        const kickoff = new Date(match.match_date).getTime(); // Set lockdown to kickoff time
        const lockdownTime = new Date(kickoff).toISOString();
        const lockdownTimestamp = Math.floor(kickoff / 1000);

        // ── Step 1: Publish on-chain ──
        let txHash: string | null = null;
        let onchainMatchId: number | null = null;
        if (isChainEnabled()) {
            try {
                const chainResult = await publishPredictionOnChain(
                    matchId,
                    prediction,
                    exactScore,
                    analysis || `Oracle predicts ${match.home_team} vs ${match.away_team}.`,
                    lockdownTimestamp
                );
                txHash = chainResult.txHash;
                onchainMatchId = Number(chainResult.onchainMatchId);
                console.log(`[Oracle] On-chain tx: ${txHash}, onchainMatchId: ${onchainMatchId}`);
            } catch (chainErr: any) {
                console.warn(`[Oracle] On-chain publish failed (non-fatal): ${chainErr.message}`);
            }
        }

        // ── Step 2: Update DB ──
        db.prepare(`
      UPDATE matches
      SET oracle_prediction = ?,
          oracle_score = ?,
          oracle_analysis = ?,
          oracle_conviction = ?,
          oracle_tx_hash = ?,
          onchain_match_id = ?,
          lockdown_time = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE api_match_id = ?
    `).run(
            prediction,
            exactScore,
            analysis || null,
            conviction || null,
            txHash,
            onchainMatchId,
            lockdownTime,
            matchId
        );

        // ── Step 3: Post to Moltbook ──
        let moltbookPostId: string | null = null;
        if (isMoltbookEnabled()) {
            try {
                moltbookPostId = await postPredictionToMoltbook({
                    homeTeam: match.home_team,
                    awayTeam: match.away_team,
                    prediction,
                    exactScore,
                    conviction: conviction || 0,
                    analysis: analysis || `Oracle predicts ${match.home_team} vs ${match.away_team}.`,
                    league: match.league_name,
                    txHash,
                });

                // Store Moltbook post ID if available
                if (moltbookPostId) {
                    db.prepare("UPDATE matches SET moltbook_post_id = ? WHERE api_match_id = ?")
                        .run(moltbookPostId, matchId);
                }
            } catch (moltErr: any) {
                console.warn(`[Oracle] Moltbook post failed (non-fatal): ${moltErr.message}`);
            }
        }

        const updatedMatch = db.prepare("SELECT * FROM matches WHERE api_match_id = ?").get(matchId);

        console.log(`[Oracle] Prediction published: ${match.home_team} vs ${match.away_team}`);
        console.log(`[Oracle] Prediction: ${prediction} (${exactScore}), conviction: ${conviction}`);
        console.log(`[Oracle] Lockdown: ${lockdownTime}`);
        console.log(`[Oracle] On-chain: ${txHash || "skipped"}`);
        console.log(`[Oracle] Moltbook: ${moltbookPostId || "skipped"}`);

        res.status(201).json({
            message: "Oracle prediction published",
            match: updatedMatch,
            onChain: {
                txHash,
                status: txHash ? "confirmed" : "skipped",
            },
            moltbook: {
                postId: moltbookPostId,
                status: moltbookPostId ? "posted" : "skipped",
            },
        });
    } catch (err: any) {
        console.error("Error publishing oracle prediction:", err.message);
        res.status(500).json({ error: "Failed to publish prediction" });
    }
});

// ─── POST /api/oracle/post-result — Post match result to Moltbook ───

router.post("/post-result", async (req: Request, res: Response) => {
    try {
        const { matchId } = req.body;

        if (!matchId) {
            return res.status(400).json({ error: "matchId is required" });
        }

        const match = db.prepare(
            "SELECT * FROM matches WHERE id = ? OR api_match_id = ?"
        ).get(matchId, matchId) as any;

        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }
        if (!match.resolved) {
            return res.status(400).json({ error: "Match not resolved yet" });
        }

        const oracleCorrect = match.result === match.oracle_prediction;

        // Get oracle accuracy
        const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN result = oracle_prediction THEN 1 ELSE 0 END) as correct
      FROM matches
      WHERE oracle_prediction IS NOT NULL AND resolved = 1
    `).get() as any;

        const accuracy = stats.total > 0
            ? ((stats.correct / stats.total) * 100).toFixed(1)
            : "N/A";

        const postId = await postResultToMoltbook({
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            homeScore: match.home_score,
            awayScore: match.away_score,
            oracleCorrect,
            accuracy,
            league: match.league_name,
        });

        res.json({
            message: "Result posted to Moltbook",
            moltbook: {
                postId,
                status: postId ? "posted" : "failed",
            },
            oracleCorrect,
            accuracy,
        });
    } catch (err: any) {
        console.error("Error posting result to Moltbook:", err.message);
        res.status(500).json({ error: "Failed to post result" });
    }
});

// ─── POST /api/oracle/hype — Post hype/engagement content ───────────

router.post("/hype", async (req: Request, res: Response) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: "title and content are required" });
        }

        const postId = await postHypeToMoltbook(title, content);

        res.json({
            message: "Hype post published",
            moltbook: {
                postId,
                status: postId ? "posted" : "failed",
            },
        });
    } catch (err: any) {
        console.error("Error posting hype:", err.message);
        res.status(500).json({ error: "Failed to post hype" });
    }
});

// ─── GET /api/oracle/stats ───────────────────────────────────────────

router.get("/stats", (_req: Request, res: Response) => {
    try {
        const totalPredictions = db.prepare(
            "SELECT COUNT(*) as count FROM matches WHERE oracle_prediction IS NOT NULL"
        ).get() as any;

        const correctPredictions = db.prepare(`
      SELECT COUNT(*) as count FROM matches
      WHERE oracle_prediction IS NOT NULL
        AND resolved = 1
        AND result = oracle_prediction
    `).get() as any;

        const totalResolved = db.prepare(`
      SELECT COUNT(*) as count FROM matches
      WHERE oracle_prediction IS NOT NULL AND resolved = 1
    `).get() as any;

        const accuracy = totalResolved.count > 0
            ? ((correctPredictions.count / totalResolved.count) * 100).toFixed(1)
            : "N/A";

        // Count Moltbook posts
        const moltbookPosts = db.prepare(
            "SELECT COUNT(*) as count FROM matches WHERE moltbook_post_id IS NOT NULL"
        ).get() as any;

        res.json({
            totalPredictions: totalPredictions.count,
            totalResolved: totalResolved.count,
            correct: correctPredictions.count,
            accuracy,
            moltbookPosts: moltbookPosts.count,
            moltbookEnabled: isMoltbookEnabled(),
            chainEnabled: isChainEnabled(),
        });
    } catch (err: any) {
        console.error("Error fetching oracle stats:", err.message);
        res.status(500).json({ error: "Failed to fetch oracle stats" });
    }
});

export default router;
