/**
 * Auto-Resolve Job
 *
 * Watches for matches that have finished (status = 'FT') according to
 * football-data.org but haven't been resolved on-chain yet.
 *
 * Flow:
 *   1. Query DB for matches WHERE status='FT' AND resolved=0
 *      AND oracle_prediction IS NOT NULL AND onchain_match_id IS NOT NULL
 *   2. Determine result from scores: home > away → 1, away > home → 2, draw → 3
 *   3. Call resolveMatchOnChain(onchainMatchId, result)
 *   4. Update DB: resolved=1, result
 *
 * Lucky supporter is selected ON-CHAIN via block.prevrandao.
 */

import { db } from "../db/connection.js";
import {
    resolveMatchOnChain,
    isChainEnabled,
} from "../services/chain.js";

interface UnresolvedMatch {
    id: number;
    api_match_id: number;
    onchain_match_id: number;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    oracle_prediction: number;
}

/**
 * Determine match result from scores.
 * Returns: 1 = Home Win, 2 = Away Win, 3 = Draw
 */
function determineResult(homeScore: number, awayScore: number): number {
    if (homeScore > awayScore) return 1;
    if (awayScore > homeScore) return 2;
    return 3;
}

/**
 * Run auto-resolve cycle: find finished-but-unresolved matches and resolve on-chain.
 */
export async function autoResolve(): Promise<void> {
    if (!isChainEnabled()) {
        console.log("[AutoResolve] Chain not enabled — skipping");
        return;
    }

    const unresolvedMatches = db.prepare(`
        SELECT id, api_match_id, onchain_match_id,
               home_team, away_team, home_score, away_score,
               oracle_prediction
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
        const resultLabel = result === 1 ? "Home Win" : result === 2 ? "Away Win" : "Draw";
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
                SET resolved = 1, result = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(result, match.id);

            // Update agent stats
            const bids = db.prepare("SELECT * FROM bids WHERE match_id = ?").all(match.id) as any[];
            const challengers = bids.filter((b: any) => b.type === "challenge");

            if (challengers.length > 0 && result !== 3) {
                if (oracleCorrect) {
                    // Oracle won — all challengers lost
                    for (const bid of challengers) {
                        db.prepare("UPDATE agents_metadata SET losses = losses + 1 WHERE agent_wallet = ?")
                            .run(bid.agent_wallet);
                    }
                } else {
                    // Oracle wrong — highest bidder won, rest lost
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

            // Delay between resolves to avoid nonce issues
            await new Promise((r) => setTimeout(r, 5000));
        } catch (err: any) {
            console.error(`[AutoResolve] ❌ Failed to resolve match ${match.id}: ${err.message}`);
            // Continue with next match — don't halt the entire cycle
        }
    }

    console.log("[AutoResolve] Cycle complete");
}
