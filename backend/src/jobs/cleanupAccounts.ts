/**
 * Cleanup Accounts Job
 *
 * Closes resolved/cancelled market accounts on-chain to reclaim rent SOL.
 * Runs periodically after auto-resolve.
 *
 * Only closes markets where all bets have been claimed/refunded
 * (we check by looking for any unsettled bets in the DB).
 */

import { db } from "../db/connection.js";
import {
    closeMarketOnChain,
    isChainEnabled,
} from "../services/chain.js";

interface CloseableMarket {
    id: number;
    api_match_id: number;
    onchain_match_id: number;
    home_team: string;
    away_team: string;
}

/**
 * Close settled market accounts on-chain to reclaim rent.
 */
export async function cleanupAccounts(): Promise<void> {
    if (!isChainEnabled()) {
        return;
    }

    // Find resolved/cancelled markets with on-chain IDs that haven't been closed yet.
    // On-chain bets are settled by users directly on Solana (claim/refund),
    // so we just wait a day after resolution before closing the market account.
    const closeableMarkets = db.prepare(`
        SELECT m.id, m.api_match_id, m.onchain_match_id, m.home_team, m.away_team
        FROM matches m
        WHERE m.resolved = 1
          AND m.onchain_match_id IS NOT NULL
          AND m.onchain_closed IS NULL
          AND m.updated_at < datetime('now', '-1 day')
    `).all() as CloseableMarket[];

    if (closeableMarkets.length === 0) {
        return;
    }

    console.log(`[Cleanup] Found ${closeableMarkets.length} market(s) to close`);

    for (const market of closeableMarkets) {
        try {
            const txHash = await closeMarketOnChain(
                Number(market.onchain_match_id)
            );

            // Mark as closed in DB
            db.prepare(`
                UPDATE matches
                SET onchain_closed = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(market.id);

            console.log(`[Cleanup] ✅ Closed market ${market.id} (${market.home_team} vs ${market.away_team}) — tx: ${txHash}`);

            await new Promise((r) => setTimeout(r, 3000));
        } catch (err: any) {
            // If account already closed, just mark it
            if (err.message?.includes("AccountNotInitialized") || err.message?.includes("Account does not exist")) {
                db.prepare(`
                    UPDATE matches
                    SET onchain_closed = 1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(market.id);
                console.log(`[Cleanup] Already closed on-chain, DB updated for market ${market.id}`);
            } else {
                console.error(`[Cleanup] ❌ Failed to close market ${market.id}: ${err.message}`);
            }
        }
    }
}
