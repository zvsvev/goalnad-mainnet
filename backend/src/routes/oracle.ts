/**
 * Oracle routes for GoalScore backend.
 * Protected by X-Admin-Key header.
 *
 * Endpoints:
 *   POST /api/oracle/predict   — Publish a prediction (on-chain + DB)
 *   GET  /api/oracle/stats     — Oracle accuracy stats
 */

import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db/connection.js";
import { createMatchOnChain, getMarketOnChain, isChainEnabled } from "../services/chain.js";

const router = Router();

// ─── Auth Middleware ──────────────────────────────────────────────────

const ADMIN_KEY = process.env.ADMIN_API_KEY || "goalscore-secret";

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
            prediction: rawPrediction,
            exactScore,
            conviction,
            analysis,
            skipOnChain,
        } = req.body;

        // Coerce prediction to number (agents may send string "1"/"2")
        const prediction = Number(rawPrediction);

        // Validate inputs
        if (!matchId) {
            return res.status(400).json({ error: "matchId is required" });
        }
        if (![0, 1, 2].includes(prediction)) {
            return res.status(400).json({ error: "prediction must be 0 (Home), 1 (Draw), or 2 (Away)" });
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
        // First check if the market PDA already exists on-chain (e.g. after SQLite wipe)
        let txHash: string | null = match.oracle_tx_hash || null;
        let onchainMatchId: number | null = match.onchain_match_id || null;

        if (isChainEnabled() && !skipOnChain) {
            try {
                // Check on-chain state first — market may exist even if SQLite was wiped
                const existingMarket = await getMarketOnChain(matchId);
                if (existingMarket) {
                    console.log(`[Oracle] ℹ️  Market ${matchId} already exists on-chain, skipping creation`);
                    onchainMatchId = matchId;
                    // txHash stays as-is (we don't know the original tx hash)
                } else {
                    txHash = await createMatchOnChain(
                        matchId,
                        lockdownTimestamp
                    );
                    onchainMatchId = matchId;
                    console.log(`[Oracle] ✅ Successfully published on-chain: ${txHash}, onchainMatchId: ${onchainMatchId}`);
                }
            } catch (chainErr: any) {
                console.error(`[Oracle] ❌ On-chain publish FAILED: ${chainErr.message}`);
                // If it failed because PDA already exists, still mark it
                if (chainErr.message?.includes("already in use")) {
                    console.log(`[Oracle] ℹ️  Market ${matchId} PDA already in use — marking as on-chain`);
                    onchainMatchId = matchId;
                } else {
                    txHash = null;
                    onchainMatchId = null;
                }
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

        const updatedMatch = db.prepare("SELECT * FROM matches WHERE api_match_id = ?").get(matchId);

        console.log(`[Oracle] Prediction published: ${match.home_team} vs ${match.away_team}`);
        console.log(`[Oracle] Prediction: ${prediction} (${exactScore}), conviction: ${conviction}`);
        console.log(`[Oracle] Lockdown: ${lockdownTime}`);
        console.log(`[Oracle] On-chain: ${txHash || "skipped"}`);

        res.status(201).json({
            message: "Oracle prediction published",
            match: updatedMatch,
            onChain: {
                txHash,
                status: txHash ? "confirmed" : "skipped",
            },
        });
    } catch (err: any) {
        console.error("Error publishing oracle prediction:", err.message);
        res.status(500).json({ error: "Failed to publish prediction" });
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

        res.json({
            totalPredictions: totalPredictions.count,
            totalResolved: totalResolved.count,
            correct: correctPredictions.count,
            accuracy,
            chainEnabled: isChainEnabled(),
        });
    } catch (err: any) {
        console.error("Error fetching oracle stats:", err.message);
        res.status(500).json({ error: "Failed to fetch oracle stats" });
    }
});

export default router;
