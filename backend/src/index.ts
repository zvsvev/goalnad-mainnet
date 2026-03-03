import express from "express";
import cors from "cors";
import http from "http";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { initSchema } from "./db/schema.js";
import matchesRouter from "./routes/matches.js";
import standingsRouter from "./routes/standings.js";
import chainRouter from "./routes/chain.js";
import adminRouter from "./routes/admin.js";
import oracleRouter from "./routes/oracle.js";
import leaderboardRouter from "./routes/leaderboard.js";
import usersRouter from "./routes/users.js";
import commentsRouter from "./routes/comments.js";
import { initialSync, scheduleSyncJobs } from "./jobs/syncFixtures.js";
import { isChainEnabled } from "./services/chain.js";
import { startIndexer, getIndexerStatus } from "./services/indexer.js";
import { initWebSocket, getWsConnectionCount } from "./services/websocket.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// --- Rate Limiting ---
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 100,             // 100 req/min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
});

const sensitiveLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,              // 10 req/min for admin/oracle endpoints
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded for this endpoint" },
});

app.use(globalLimiter);

// --- Routes ---
app.get("/api/health", (_req, res) => {
    const indexerStatus = getIndexerStatus();
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        chain: isChainEnabled() ? "connected" : "offline",
        indexer: indexerStatus.running ? "running" : "stopped",
        websocket: { connections: getWsConnectionCount() },
        contracts: {
            goalToken: config.goalTokenMint || null,
            arena: config.arenaProgramId || null,
        },
    });
});

app.use("/api/matches", matchesRouter);
app.use("/api/standings", standingsRouter);
app.use("/api/chain", chainRouter);
app.use("/api/admin", sensitiveLimiter, adminRouter);
app.use("/api/oracle", sensitiveLimiter, oracleRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/users", usersRouter);
app.use("/api/comments", commentsRouter);

// --- Start ---
async function start() {
    // Initialize database
    initSchema();
    console.log("✅ Database schema initialized\n");

    // Initial data load
    await initialSync();

    // Schedule recurring jobs
    scheduleSyncJobs();

    // Start event indexer if enabled
    const enableIndexer = process.env.ENABLE_INDEXER !== "false";
    if (enableIndexer && isChainEnabled()) {
        console.log("\n🔍 Starting event indexer...");
        await startIndexer();
    } else if (!isChainEnabled()) {
        console.log("\n⚠️  Event indexer disabled (blockchain not configured)");
    } else {
        console.log("\n⚠️  Event indexer disabled (ENABLE_INDEXER=false)");
    }

    // Create HTTP server and attach WebSocket
    const server = http.createServer(app);
    initWebSocket(server);

    server.listen(config.port, () => {
        console.log(`\n🚀 GoalScore Backend running on http://localhost:${config.port}`);
        console.log(`   Chain: ${isChainEnabled() ? "Solana (CONNECTED)" : "OFFLINE (no keys configured)"}`);
        if (isChainEnabled()) {
            console.log(`   $GOAL Token: ${config.goalTokenMint}`);
            console.log(`   Arena:       ${config.arenaProgramId}`);
        }
        console.log(`   API Provider: football-data.org (free tier)`);
        console.log(`   WebSocket: ws://localhost:${config.port}/ws`);
        console.log(`   Rate Limit: 100 req/min (global), 10 req/min (admin/oracle)\n`);
    });
}

start().catch(console.error);
