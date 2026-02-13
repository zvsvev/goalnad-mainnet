import { publicClient, formatEther } from "./chain.js";
import { config } from "../config.js";
import { db } from "../db/connection.js";
import GoalNadArenaABI from "../contracts/GoalNadArena.abi.json";
import type { Address } from "viem";

// ─── Configuration ──────────────────────────────────────────────────

const ARENA_ADDRESS = config.arenaAddress as Address;
const POLL_INTERVAL = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || "5000", 10);
const START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK || "0");
const MAX_BLOCK_RANGE = 100n; // Monad RPC limits eth_getLogs to 100 blocks

let isRunning = false;
let lastProcessedBlock = START_BLOCK;

// ─── Helper: find DB match by on-chain match ID ─────────────────────

function getMatchByOnchainId(onchainMatchId: number): any {
    return db.prepare("SELECT * FROM matches WHERE onchain_match_id = ?").get(onchainMatchId);
}

// ─── Event Handlers ─────────────────────────────────────────────────

/**
 * Handle PredictionPublished event
 * Emitted when Oracle publishes a prediction
 */
async function handlePredictionPublished(log: any) {
    const { matchId, apiMatchId, prediction, exactScore, comment, lockdownTime } = log.args;

    console.log(`[Indexer] PredictionPublished: matchId=${matchId}, apiMatchId=${apiMatchId}, prediction=${prediction}`);

    try {
        // Update match with on-chain data — link onchain_match_id to the DB row
        const stmt = db.prepare(`
            UPDATE matches
            SET oracle_prediction = ?,
                oracle_score = ?,
                oracle_analysis = ?,
                lockdown_time = ?,
                onchain_match_id = ?
            WHERE api_match_id = ?
        `);

        stmt.run(
            Number(prediction),
            exactScore || null,
            comment || null,
            new Date(Number(lockdownTime) * 1000).toISOString(),
            Number(matchId),
            Number(apiMatchId)
        );

        console.log(`[Indexer] ✅ Synced prediction for match ${matchId} (apiMatchId=${apiMatchId})`);
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

    // Convert from wei (18 decimals) to GOAL integer
    const amountGoal = Math.floor(Number(formatEther(amount)));
    const totalBidGoal = Math.floor(Number(formatEther(totalBid)));

    console.log(`[Indexer] BidPlaced: matchId=${matchId}, bidder=${bidder}, amount=${amountGoal} GOAL`);

    try {
        // Find the DB match by on-chain match ID
        const match = getMatchByOnchainId(Number(matchId));
        if (!match) {
            console.warn(`[Indexer] ⚠️  No DB match found for onchain_match_id=${matchId}, skipping BidPlaced`);
            return;
        }

        // Ensure agent exists in metadata BEFORE inserting bid (FK constraint)
        const agentStmt = db.prepare(`
            INSERT OR IGNORE INTO agents_metadata (agent_wallet, support_quota, balance)
            VALUES (?, 0, 100000)
        `);
        agentStmt.run(bidder.toLowerCase());

        // Insert or update bid — use totalBidGoal (cumulative) as the bid amount
        const bidStmt = db.prepare(`
            INSERT INTO bids (agent_wallet, match_id, amount, type, comment, tx_hash, created_at)
            VALUES (?, ?, ?, 'challenge', '', ?, CURRENT_TIMESTAMP)
            ON CONFLICT(agent_wallet, match_id)
            DO UPDATE SET amount = ?, tx_hash = ?, created_at = CURRENT_TIMESTAMP
        `);

        bidStmt.run(
            bidder.toLowerCase(),
            match.id,
            totalBidGoal,
            log.transactionHash,
            totalBidGoal,
            log.transactionHash
        );

        // Update match pot (additive: += increment amount) and highest bid
        const matchStmt = db.prepare(`
            UPDATE matches
            SET total_pot = total_pot + ?,
                highest_bid = CASE WHEN ? > highest_bid THEN ? ELSE highest_bid END,
                highest_bidder = CASE WHEN ? > highest_bid THEN ? ELSE highest_bidder END
            WHERE id = ?
        `);

        matchStmt.run(
            amountGoal,
            totalBidGoal, totalBidGoal,
            totalBidGoal, bidder.toLowerCase(),
            match.id
        );

        console.log(`[Indexer] ✅ Synced bid for match ${matchId} (DB id=${match.id}) from ${bidder.slice(0, 10)}...`);
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
        // Find the DB match by on-chain match ID
        const match = getMatchByOnchainId(Number(matchId));
        if (!match) {
            console.warn(`[Indexer] ⚠️  No DB match found for onchain_match_id=${matchId}, skipping Supported`);
            return;
        }

        // Ensure agent exists in metadata BEFORE inserting bid (FK constraint)
        const agentStmt = db.prepare(`
            INSERT OR IGNORE INTO agents_metadata (agent_wallet, support_quota, balance)
            VALUES (?, 0, 100000)
        `);
        agentStmt.run(supporter.toLowerCase());

        // Insert support record
        const supportStmt = db.prepare(`
            INSERT INTO bids (agent_wallet, match_id, amount, type, comment, tx_hash, created_at)
            VALUES (?, ?, 0, 'support', '', ?, CURRENT_TIMESTAMP)
            ON CONFLICT(agent_wallet, match_id)
            DO UPDATE SET tx_hash = excluded.tx_hash
        `);

        supportStmt.run(
            supporter.toLowerCase(),
            match.id,
            log.transactionHash
        );

        console.log(`[Indexer] ✅ Synced support for match ${matchId} (DB id=${match.id}) from ${supporter.slice(0, 10)}...`);
    } catch (err: any) {
        console.error(`[Indexer] ❌ Error handling Supported:`, err.message);
    }
}

/**
 * Handle MatchResolved event
 * Emitted when a match is resolved
 */
async function handleMatchResolved(log: any) {
    const { matchId, result, luckySupporter } = log.args;

    console.log(`[Indexer] MatchResolved: matchId=${matchId}, result=${result}, luckySupporter=${luckySupporter || 'none'}`);

    try {
        // Update match as resolved using onchain_match_id
        const stmt = db.prepare(`
            UPDATE matches
            SET resolved = 1,
                result = ?,
                resolve_tx_hash = ?,
                lucky_supporter = ?
            WHERE onchain_match_id = ?
        `);

        stmt.run(
            Number(result),
            log.transactionHash,
            luckySupporter ? luckySupporter.toLowerCase() : null,
            Number(matchId)
        );

        console.log(`[Indexer] ✅ Synced resolution for match ${matchId} (tx: ${log.transactionHash.slice(0, 10)}...)`);
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
        // Mark match as cancelled using onchain_match_id
        const stmt = db.prepare(`
            UPDATE matches
            SET resolved = 1,
                result = 99
            WHERE onchain_match_id = ?
        `);

        stmt.run(Number(matchId));

        console.log(`[Indexer] ✅ Synced cancellation for match ${matchId}`);
    } catch (err: any) {
        console.error(`[Indexer] ❌ Error handling MatchCancelled:`, err.message);
    }
}

/**
 * Handle RewardClaimed event
 * Emitted when an agent claims their reward
 */
async function handleRewardClaimed(log: any) {
    const { matchId, winner, amount } = log.args;

    // Convert from wei (18 decimals) to GOAL integer
    const amountGoal = Math.floor(Number(formatEther(amount)));

    console.log(`[Indexer] RewardClaimed: matchId=${matchId}, winner=${winner}, amount=${amountGoal} GOAL`);

    try {
        // Find the DB match by on-chain match ID
        const match = getMatchByOnchainId(Number(matchId));
        if (!match) {
            console.warn(`[Indexer] ⚠️  No DB match found for onchain_match_id=${matchId}, skipping RewardClaimed`);
            return;
        }

        // Insert claim record
        const claimStmt = db.prepare(`
            INSERT INTO claims (match_id, agent_wallet, amount, tx_hash, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        claimStmt.run(
            match.id,
            winner.toLowerCase(),
            amountGoal,
            log.transactionHash
        );

        console.log(`[Indexer] ✅ Synced claim for match ${matchId} (DB id=${match.id}) by ${winner.slice(0, 10)}...`);
    } catch (err: any) {
        console.error(`[Indexer] ❌ Error handling RewardClaimed:`, err.message);
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
            return;
        }

        const startFrom = lastProcessedBlock + 1n;

        // Chunk into MAX_BLOCK_RANGE-sized windows (Monad RPC limit)
        let cursor = startFrom;
        let totalEvents = 0;

        while (cursor <= latestBlock) {
            const chunkEnd = cursor + MAX_BLOCK_RANGE - 1n > latestBlock
                ? latestBlock
                : cursor + MAX_BLOCK_RANGE - 1n;

            const logs = await publicClient.getContractEvents({
                address: ARENA_ADDRESS,
                abi: GoalNadArenaABI,
                fromBlock: cursor,
                toBlock: chunkEnd,
            });

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
                    case "RewardClaimed":
                        await handleRewardClaimed(log);
                        break;
                    default:
                        break;
                }
            }

            totalEvents += logs.length;
            cursor = chunkEnd + 1n;
        }

        if (totalEvents > 0) {
            console.log(`[Indexer] ✅ Processed ${totalEvents} events from blocks ${startFrom}-${latestBlock}`);
        }

        lastProcessedBlock = latestBlock;

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
