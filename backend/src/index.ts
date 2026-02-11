import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { initSchema } from "./db/schema.js";
import matchesRouter from "./routes/matches.js";
import standingsRouter from "./routes/standings.js";
import agentRouter from "./routes/agent.js";
import chainRouter from "./routes/chain.js";
import adminRouter from "./routes/admin.js";
import oracleRouter from "./routes/oracle.js";
import leaderboardRouter from "./routes/leaderboard.js";
import { initialSync, scheduleSyncJobs } from "./jobs/syncFixtures.js";
import { isChainEnabled } from "./services/chain.js";

const app = express();

app.use(cors());
app.use(express.json());

// --- Routes ---
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        chain: isChainEnabled() ? "connected" : "offline",
        contracts: {
            goalToken: config.goalTokenAddress || null,
            arena: config.arenaAddress || null,
        },
    });
});

app.use("/api/matches", matchesRouter);
app.use("/api/standings", standingsRouter);
app.use("/api/agent", agentRouter);
app.use("/api/chain", chainRouter);
app.use("/api/admin", adminRouter);
app.use("/api/oracle", oracleRouter);
app.use("/api/leaderboard", leaderboardRouter);

// --- Start ---
async function start() {
    // Initialize database
    initSchema();
    console.log("✅ Database schema initialized\n");

    // Initial data load
    await initialSync();

    // Schedule recurring jobs
    scheduleSyncJobs();

    app.listen(config.port, () => {
        console.log(`\n🚀 Goalnad Backend running on http://localhost:${config.port}`);
        console.log(`   Chain: ${isChainEnabled() ? "Monad Testnet (CONNECTED)" : "OFFLINE (no keys configured)"}`);
        if (isChainEnabled()) {
            console.log(`   $GOAL Token: ${config.goalTokenAddress}`);
            console.log(`   Arena:       ${config.arenaAddress}`);
        }
        console.log(`   API Provider: football-data.org (free tier)\n`);
        console.log(`   Endpoints:`);
        console.log(`   GET  /api/health`);
        console.log(`   GET  /api/matches`);
        console.log(`   GET  /api/matches/:id`);
        console.log(`   GET  /api/standings/:competitionCode`);
        console.log(`   POST /api/agent/register`);
        console.log(`   GET  /api/agent/status`);
        console.log(`   POST /api/agent/bid`);
        console.log(`   POST /api/agent/support`);
        console.log(`   GET  /api/chain/match/:matchId`);
        console.log(`   GET  /api/chain/agent/:address`);
        console.log(`   GET  /api/chain/contracts`);
        console.log(`   POST /api/admin/test-match`);
        console.log(`   POST /api/admin/resolve-test`);
        console.log(`   POST /api/admin/oracle-predict`);
        console.log(`   POST /api/admin/fund-agent`);
        console.log(`   GET  /api/admin/test-timeline`);
        console.log(`   POST /api/oracle/predict`);
        console.log(`   GET  /api/oracle/stats`);
        console.log(`   POST /api/oracle/post-result`);
        console.log(`   POST /api/oracle/hype`);
        console.log(`   GET  /api/matches/feed/recent`);
        console.log(`   GET  /api/leaderboard`);
    });
}

start().catch(console.error);
