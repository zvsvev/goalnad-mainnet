/**
 * indexer.ts — Solana event indexer for GoalScore
 *
 * NOTE: This is a placeholder. The old EVM indexer used viem's getContractEvents.
 * Solana uses a different pattern — account change subscriptions or tx parsing.
 * The on-chain program needs to be fully deployed before this can be implemented.
 *
 * For now, the indexer is disabled and the backend works in "off-chain" mode,
 * reading data from the SQLite DB populated by the oracle/admin routes.
 */

import { config } from "../config.js";
import { connection, isChainEnabled, PROGRAM_ID } from "../services/chain.js";

let isRunning = false;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Start the event indexer (stub — Solana implementation pending)
 */
export async function startIndexer() {
    if (isRunning) {
        console.warn("[Indexer] ⚠️  Indexer is already running");
        return;
    }

    if (!isChainEnabled()) {
        console.error("[Indexer] ❌ Chain not configured — indexer disabled");
        return;
    }

    isRunning = true;
    console.log(`[Indexer] 🚀 Indexer started (stub mode — Solana implementation pending)`);
    console.log(`[Indexer] Program: ${PROGRAM_ID.toBase58()}`);
    console.log(`[Indexer] RPC: ${config.solanaRpcUrl}`);
}

/**
 * Stop the event indexer
 */
export function stopIndexer() {
    if (!isRunning) {
        console.warn("[Indexer] ⚠️  Indexer is not running");
        return;
    }

    isRunning = false;
    console.log("[Indexer] 🛑 Event indexer stopped");
}

/**
 * Check if indexer is running
 */
export function isIndexerRunning(): boolean {
    return isRunning;
}

/**
 * Get indexer status
 */
export function getIndexerStatus() {
    return {
        running: isRunning,
        mode: "stub",
        programId: PROGRAM_ID.toBase58(),
        rpc: config.solanaRpcUrl,
    };
}
