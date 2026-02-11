import { publicClient } from "./chain.js";
import { config } from "../config.js";
import { db } from "../db/connection.js";
import GoalNadArenaABI from "../contracts/GoalNadArena.abi.json";
import type { Address } from "viem";

// ─── Configuration ──────────────────────────────────────────────────

const ARENA_ADDRESS = config.arenaAddress as Address;
const POLL_INTERVAL = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || "5000", 10);
const START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK || "0");

let isRunning = false;
let lastProcessedBlock = START_BLOCK;

// ─── Event Handlers ─────────────────────────────────────────────────

/**
 * Handle PredictionPublished event
 * Emitted when Oracle publishes a prediction
 */
async function handlePredictionPublished(log: any) {
    const { matchId, apiMatchId, prediction, lockdownTime } = log.args;

    console.log(`[Indexer] PredictionPublished: matchId=${matchId}, apiMatchId=${apiMatchId}, prediction=${prediction}`);

    try {
        // Update match with on-chain prediction data
        // Note: exactScore and oracle_analysis are NOT emitted on-chain —
        // they are stored in the DB by the oracle route directly.
        const stmt = db.prepare(`
            UPDATE matches
            SET oracle_prediction = ?,
                lockdown_time = ?,
                id = ?
            WHERE api_match_id = ?
        `);

        stmt.run(
            Number(prediction),
            new Date(Number(lockdownTime) * 1000).toISOString(),
            Number(matchId),
            Number(apiMatchId)
        );

        console.log(`[Indexer] ✅ Synced prediction for match ${matchId}`);
    } catch (err: any) {
        console.error(`[Indexer] ❌ Error handling PredictionPublished:`, err.message);
    }
}

/**
 * Handle BidPlaced event
 * Emitted when an agent places a challenge bid
 */
async function handleBidPlaced(log: any) {
    const { matchId, bidder, amount, totalBid } = log.args;

    console.log(`[Indexer] BidPlaced: matchId=${matchId}, bidder=${bidder}, amount=${amount}`);

    try {
        // Insert or update bid
        const bidStmt = db.prepare(`
            INSERT INTO bids (agent_wallet, match_id, amount, type, comment, created_at)
            VALUES (?, ?, ?, 'challenge', '', CURRENT_TIMESTAMP)
            ON CONFLICT(agent_wallet, match_id) 
            DO UPDATE SET amount = ?, created_at = CURRENT_TIMESTAMP
        `);

        bidStmt.run(
            bidder.toLowerCase(),
            Number(matchId),
            Number(amount),
            Number(amount)
        );

        // Update match pot and highest bid
        const matchStmt = db.prepare(`
            UPDATE matches 
            SET total_pot = ?,
                highest_bid = ?,
                highest_bidder = ?
            WHERE id = ?
        `);

        matchStmt.run(
            Number(totalBid),
            Number(amount),
            bidder.toLowerCase(),
            Number(matchId)
        );

        // Ensure agent exists in metadata
        const agentStmt = db.prepare(`
            INSERT OR IGNORE INTO agents_metadata (agent_wallet, support_quota, balance)
            VALUES (?, 0, 100000)
        `);

        agentStmt.run(bidder.toLowerCase());

        // Grant +2 support quota for bidding
        const quotaStmt = db.prepare(`
            UPDATE agents_metadata 
            SET support_quota = support_quota + 2
            WHERE agent_wallet = ?
        `);

        quotaStmt.run(bidder.toLowerCase());

        console.log(`[Indexer] ✅ Synced bid for match ${matchId} from ${bidder.slice(0, 10)}...`);
    } catch (err: any) {
        console.error(`[Indexer] ❌ Error handling BidPlaced:`, err.message);
    }
}

/**
 * Handle Supported event
 * Emitted when an agent supports the Oracle
 */
async function handleSupported(log: any) {
    const { matchId, supporter } = log.args;

    console.log(`[Indexer] Supported: matchId=${matchId}, supporter=${supporter}`);

    try {
        // Insert support record
        const supportStmt = db.prepare(`
            INSERT INTO bids (agent_wallet, match_id, amount, type, comment, created_at)
            VALUES (?, ?, 0, 'support', '', CURRENT_TIMESTAMP)
            ON CONFLICT(agent_wallet, match_id) DO NOTHING
        `);

        supportStmt.run(
            supporter.toLowerCase(),
            Number(matchId)
        );

        // Ensure agent exists in metadata
        const agentStmt = db.prepare(`
            INSERT OR IGNORE INTO agents_metadata (agent_wallet, support_quota, balance)
            VALUES (?, 0, 100000)
        `);

        agentStmt.run(supporter.toLowerCase());

        // Consume 1 support quota
        const quotaStmt = db.prepare(`
            UPDATE agents_metadata 
            SET support_quota = MAX(0, support_quota - 1)
            WHERE agent_wallet = ?
        `);

        quotaStmt.run(supporter.toLowerCase());

        console.log(`[Indexer] ✅ Synced support for match ${matchId} from ${supporter.slice(0, 10)}...`);
    } catch (err: any) {
        console.error(`[Indexer] ❌ Error handling Supported:`, err.message);
    }
}

/**
 * Handle MatchResolved event
 * Emitted when a match is resolved
 */
async function handleMatchResolved(log: any) {
    const { matchId, result } = log.args;

    console.log(`[Indexer] MatchResolved: matchId=${matchId}, result=${result}`);

    try {
        // Update match as resolved
        const stmt = db.prepare(`
            UPDATE matches 
            SET resolved = 1,
                result = ?
            WHERE id = ?
        `);

        stmt.run(
            Number(result),
            Number(matchId)
        );

        console.log(`[Indexer] ✅ Synced resolution for match ${matchId}`);
    } catch (err: any) {
        console.error(`[Indexer] ❌ Error handling MatchResolved:`, err.message);
    }
}

/**
 * Handle MatchCancelled event
 * Emitted when a match is cancelled
 */
async function handleMatchCancelled(log: any) {
    const { matchId } = log.args;

    console.log(`[Indexer] MatchCancelled: matchId=${matchId}`);

    try {
        // Mark match as cancelled (we can use resolved = 1 with a special result code)
        const stmt = db.prepare(`
            UPDATE matches 
            SET resolved = 1,
                result = 99
            WHERE id = ?
        `);

        stmt.run(Number(matchId));

        console.log(`[Indexer] ✅ Synced cancellation for match ${matchId}`);
    } catch (err: any) {
        console.error(`[Indexer] ❌ Error handling MatchCancelled:`, err.message);
    }
}

// ─── Event Polling Loop ────────────────────────────────────────────

/**
 * Poll for new events and process them
 */
async function pollEvents() {
    try {
        const latestBlock = await publicClient.getBlockNumber();

        if (lastProcessedBlock >= latestBlock) {
            // No new blocks, skip
            return;
        }

        const fromBlock = lastProcessedBlock + 1n;
        const toBlock = latestBlock;

        console.log(`[Indexer] Scanning blocks ${fromBlock} to ${toBlock}...`);

        // Fetch all events from the arena contract
        const logs = await publicClient.getContractEvents({
            address: ARENA_ADDRESS,
            abi: GoalNadArenaABI,
            fromBlock,
            toBlock,
        });

        // Process each event
        for (const log of logs) {
            // @ts-ignore - eventName exists on parsed logs
            const eventName = log.eventName;

            switch (eventName) {
                case "PredictionPublished":
                    await handlePredictionPublished(log);
                    break;
                case "BidPlaced":
                    await handleBidPlaced(log);
                    break;
                case "Supported":
                    await handleSupported(log);
                    break;
                case "MatchResolved":
                    await handleMatchResolved(log);
                    break;
                case "MatchCancelled":
                    await handleMatchCancelled(log);
                    break;
                default:
                    // Ignore other events (RewardClaimed, GoalBurned, etc.)
                    break;
            }
        }

        if (logs.length > 0) {
            console.log(`[Indexer] ✅ Processed ${logs.length} events from blocks ${fromBlock}-${toBlock}`);
        }

        // Update last processed block
        lastProcessedBlock = toBlock;

    } catch (err: any) {
        console.error(`[Indexer] ❌ Error polling events:`, err.message);
    }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Start the event indexer
 */
export async function startIndexer() {
    if (isRunning) {
        console.warn("[Indexer] ⚠️  Indexer is already running");
        return;
    }

    if (!ARENA_ADDRESS) {
        console.error("[Indexer] ❌ ARENA_CONTRACT_ADDRESS not configured — indexer disabled");
        return;
    }

    isRunning = true;
    console.log(`[Indexer] 🚀 Starting event indexer...`);
    console.log(`[Indexer] Arena: ${ARENA_ADDRESS}`);
    console.log(`[Indexer] Poll interval: ${POLL_INTERVAL}ms`);
    console.log(`[Indexer] Start block: ${START_BLOCK}`);

    // Initial poll
    await pollEvents();

    // Start polling loop
    setInterval(async () => {
        if (isRunning) {
            await pollEvents();
        }
    }, POLL_INTERVAL);

    console.log(`[Indexer] ✅ Event indexer started`);
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
        lastProcessedBlock: lastProcessedBlock.toString(),
        pollInterval: POLL_INTERVAL,
        arenaAddress: ARENA_ADDRESS,
    };
}
