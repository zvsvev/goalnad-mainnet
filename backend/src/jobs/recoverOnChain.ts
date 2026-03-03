/**
 * recoverOnChain.ts — Startup recovery job
 *
 * After a Railway redeploy wipes SQLite, this job scans all matches
 * in the database and checks if they have on-chain market PDAs.
 * If a market PDA exists on Solana, it restores the onchain_match_id
 * in SQLite so the frontend can display them correctly.
 *
 * Run once at backend startup, after syncFixtures has populated matches.
 */

import { db } from "../db/connection.js";
import { getMarketOnChain, isChainEnabled } from "../services/chain.js";

export async function recoverOnChainMarkets(): Promise<void> {
    if (!isChainEnabled()) {
        console.log("[Recovery] ⚠️  Chain not enabled — skipping on-chain recovery");
        return;
    }

    console.log("[Recovery] 🔍 Scanning matches for existing on-chain markets...");

    // Get all matches that don't have onchain_match_id set
    const matches = db.prepare(`
        SELECT api_match_id, home_team, away_team, onchain_match_id
        FROM matches
        WHERE onchain_match_id IS NULL
          AND status IN ('NS', 'FT', 'LIVE')
        ORDER BY match_date DESC
    `).all() as any[];

    if (matches.length === 0) {
        console.log("[Recovery] ✅ No matches to check");
        return;
    }

    console.log(`[Recovery] Checking ${matches.length} matches for on-chain markets...`);

    let recovered = 0;
    let errors = 0;

    for (const match of matches) {
        try {
            const onchainMarket = await getMarketOnChain(match.api_match_id);
            if (onchainMarket) {
                // Market exists on-chain — restore the link in SQLite
                db.prepare(`
                    UPDATE matches
                    SET onchain_match_id = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE api_match_id = ?
                `).run(match.api_match_id, match.api_match_id);

                recovered++;
                console.log(`[Recovery] ✅ Recovered on-chain market: ${match.home_team} vs ${match.away_team} (ID: ${match.api_match_id})`);
            }
        } catch (err: any) {
            errors++;
            // Don't log "Account does not exist" — that's expected for matches without markets
            if (!err.message?.includes("Account does not exist")) {
                console.error(`[Recovery] ❌ Error checking match ${match.api_match_id}:`, err.message);
            }
        }

        // Small delay to avoid RPC rate limiting
        await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`[Recovery] 🏁 Done. Recovered: ${recovered}, Errors: ${errors}, Checked: ${matches.length}`);
}
