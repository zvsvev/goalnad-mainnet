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
import { getMarketPDA, connection, isChainEnabled } from "../services/chain.js";

// Helper to chunk arrays
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

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

    console.log(`[Recovery] Checking ${matches.length} matches for on-chain markets in batches...`);

    let recovered = 0;
    let errors = 0;

    // Process in batches of 100 to avoid RPC rate limits and payload size limits
    const BATCH_SIZE = 100;
    const matchChunks = chunkArray(matches, BATCH_SIZE);

    for (let i = 0; i < matchChunks.length; i++) {
        const chunk = matchChunks[i];
        try {
            // Get PDAs for this chunk
            const pdas = chunk.map((m) => getMarketPDA(m.api_match_id)[0]);

            // Bulk fetch account info
            const accounts = await connection.getMultipleAccountsInfo(pdas);

            // Process results
            for (let j = 0; j < accounts.length; j++) {
                if (accounts[j] !== null) {
                    // Account exists! Recover it.
                    const match = chunk[j];
                    db.prepare(`
                        UPDATE matches
                        SET onchain_match_id = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE api_match_id = ?
                    `).run(match.api_match_id, match.api_match_id);

                    recovered++;
                    console.log(`[Recovery] ✅ Recovered on-chain market: ${match.home_team} vs ${match.away_team} (ID: ${match.api_match_id})`);
                }
            }
        } catch (err: any) {
            errors += chunk.length;
            console.error(`[Recovery] ❌ Error checking batch ${i + 1}:`, err.message);
        }

        // Small delay between batches
        await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`[Recovery] 🏁 Done. Recovered: ${recovered}, Errors: ${errors}, Checked: ${matches.length}`);
}
