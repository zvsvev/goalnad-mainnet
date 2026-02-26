/**
 * Auto-Resolve Job
 *
 * Watches for matches that have finished (status = 'FT') according to
 * football-data.org but haven't been resolved on-chain yet.
 *
 * Also handles:
 *   - Auto-cancel: matches with status PST/CANC → cancel on-chain
 *   - Post-match result summary: posts to Moltbook after resolution
 *
 * Flow:
 *   1. Query DB for matches WHERE status='FT' AND resolved=0
 *      AND oracle_prediction IS NOT NULL AND onchain_match_id IS NOT NULL
 *   2. Determine result from scores: 0 = Home, 1 = Draw, 2 = Away
 *   3. Call resolveMatchOnChain(matchId, result)
 *   4. Update DB: resolved=1, result
 *   5. Post result to Moltbook
 */

import { db } from "../db/connection.js";
import {
    resolveMatchOnChain,
    cancelMatchOnChain,
    isChainEnabled,
} from "../services/chain.js";
import {
    postResultToMoltbook,
    isMoltbookEnabled,
} from "../services/moltbook.js";

interface UnresolvedMatch {
    id: number;
    api_match_id: number;
    onchain_match_id: number;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    oracle_prediction: number;
    oracle_score: string | null;
    league_id: string;
}

interface PostponedMatch {
    id: number;
    api_match_id: number;
    onchain_match_id: number;
    home_team: string;
    away_team: string;
    status: string;
}

/**
 * Determine match result from scores.
 * Returns: 0 = Home Win, 1 = Draw, 2 = Away Win
 */
function determineResult(homeScore: number, awayScore: number): number {
    if (homeScore > awayScore) return 0;
    if (awayScore > homeScore) return 2;
    return 1;
}

/**
 * Run auto-resolve cycle: find finished-but-unresolved matches and resolve on-chain.
 */
export async function autoResolve(): Promise<void> {
    if (!isChainEnabled()) {
        console.log("[AutoResolve] Chain not enabled — skipping");
        return;
    }

    // ── Step 1: Auto-cancel postponed / cancelled matches ──
    await autoCancelPostponed();

    // ── Step 2: Resolve finished matches ──
    await resolveFinishedMatches();
}

/**
 * Auto-cancel matches that are postponed (PST) or cancelled (CANC) by the league.
 * Calls cancel_match on-chain so bettors can refund.
 */
async function autoCancelPostponed(): Promise<void> {
    const postponed = db.prepare(`
        SELECT id, api_match_id, onchain_match_id, home_team, away_team, status
        FROM matches
        WHERE status IN ('PST', 'CANC', 'SUSP', 'AWD')
          AND resolved = 0
          AND onchain_match_id IS NOT NULL
          AND oracle_prediction IS NOT NULL
    `).all() as PostponedMatch[];

    if (postponed.length === 0) return;

    console.log(`[AutoCancel] Found ${postponed.length} postponed/cancelled match(es)`);

    for (const match of postponed) {
        console.log(
            `[AutoCancel] Cancelling: ${match.home_team} vs ${match.away_team} (${match.status})`
        );

        try {
            const txHash = await cancelMatchOnChain(
                Number(match.onchain_match_id)
            );

            // Update DB
            db.prepare(`
                UPDATE matches
                SET resolved = 1, result = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(match.id);

            console.log(`[AutoCancel] ✅ Cancelled match ${match.id} — tx: ${txHash}`);

            await new Promise((r) => setTimeout(r, 3000));
        } catch (err: any) {
            // If already cancelled on-chain, just update DB
            if (err.message?.includes("MarketCancelled") || err.message?.includes("MarketResolved")) {
                db.prepare(`
                    UPDATE matches
                    SET resolved = 1, result = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(match.id);
                console.log(`[AutoCancel] Already cancelled on-chain, DB updated for match ${match.id}`);
            } else {
                console.error(`[AutoCancel] ❌ Failed to cancel match ${match.id}: ${err.message}`);
            }
        }
    }
}

/**
 * Resolve matches that have finished (FT) according to football-data.org.
 */
async function resolveFinishedMatches(): Promise<void> {
    const unresolvedMatches = db.prepare(`
        SELECT id, api_match_id, onchain_match_id,
               home_team, away_team, home_score, away_score,
               oracle_prediction, oracle_score, league_id
        FROM matches
        WHERE status = 'FT'
          AND resolved = 0
          AND oracle_prediction IS NOT NULL
          AND onchain_match_id IS NOT NULL
          AND home_score IS NOT NULL
          AND away_score IS NOT NULL
    `).all() as UnresolvedMatch[];

    if (unresolvedMatches.length === 0) {
        console.log("[AutoResolve] No matches to resolve");
        return;
    }

    console.log(`[AutoResolve] Found ${unresolvedMatches.length} match(es) to resolve`);

    for (const match of unresolvedMatches) {
        const result = determineResult(match.home_score, match.away_score);
        const resultLabel = result === 0 ? "Home Win" : result === 2 ? "Away Win" : "Draw";
        const oracleCorrect = result === match.oracle_prediction;

        console.log(
            `[AutoResolve] Resolving: ${match.home_team} ${match.home_score}-${match.away_score} ${match.away_team} → ${resultLabel}` +
            ` (Oracle ${oracleCorrect ? "CORRECT ✅" : "WRONG ❌"})`
        );

        try {
            const txHash = await resolveMatchOnChain(
                Number(match.onchain_match_id),
                result
            );

            // Update DB
            db.prepare(`
                UPDATE matches
                SET resolved = 1, result = ?, resolve_tx_hash = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(result, txHash, match.id);

            // Update agent stats
            const bids = db.prepare("SELECT * FROM bids WHERE match_id = ?").all(match.id) as any[];
            const challengers = bids.filter((b: any) => b.type === "challenge");

            if (challengers.length > 0 && result !== 1) {
                if (oracleCorrect) {
                    for (const bid of challengers) {
                        db.prepare("UPDATE agents_metadata SET losses = losses + 1 WHERE agent_wallet = ?")
                            .run(bid.agent_wallet);
                    }
                } else {
                    const highestBidder = challengers.reduce((a: any, b: any) => a.amount > b.amount ? a : b);
                    db.prepare("UPDATE agents_metadata SET wins = wins + 1 WHERE agent_wallet = ?")
                        .run(highestBidder.agent_wallet);
                    for (const bid of challengers) {
                        if (bid.agent_wallet !== highestBidder.agent_wallet) {
                            db.prepare("UPDATE agents_metadata SET losses = losses + 1 WHERE agent_wallet = ?")
                                .run(bid.agent_wallet);
                        }
                    }
                }
            }

            console.log(`[AutoResolve] ✅ Resolved match ${match.id} — tx: ${txHash}`);

            // ── Post-match result summary to Moltbook ──
            await postMatchResult(match, result, oracleCorrect);

            // Delay between resolves to avoid nonce issues
            await new Promise((r) => setTimeout(r, 5000));
        } catch (err: any) {
            console.error(`[AutoResolve] ❌ Failed to resolve match ${match.id}: ${err.message}`);
        }
    }

    console.log("[AutoResolve] Cycle complete");
}

/**
 * Post match result summary to Moltbook after resolution.
 */
async function postMatchResult(
    match: UnresolvedMatch,
    result: number,
    oracleCorrect: boolean
): Promise<void> {
    if (!isMoltbookEnabled()) return;

    try {
        // Get oracle accuracy stats
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

        await postResultToMoltbook({
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            homeScore: match.home_score,
            awayScore: match.away_score,
            oraclePrediction: match.oracle_prediction,
            oracleScore: match.oracle_score || undefined,
            oracleCorrect,
            accuracy,
        });

        console.log(`[AutoResolve] 📝 Result posted to Moltbook for ${match.home_team} vs ${match.away_team}`);
    } catch (err: any) {
        console.warn(`[AutoResolve] Moltbook result post failed (non-fatal): ${err.message}`);
    }
}
