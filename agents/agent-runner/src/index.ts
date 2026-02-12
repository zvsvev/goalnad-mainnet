import cron from "node-cron";
import { config } from "./config.js";
import { loadAgentWallets } from "./wallets.js";
import { runAgent } from "./engine.js";

// ─── Helpers ─────────────────────────────────────────────────────────

function randomDelay(): Promise<void> {
    const ms =
        config.minAgentDelay +
        Math.floor(Math.random() * (config.maxAgentDelay - config.minAgentDelay));
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main Runner ─────────────────────────────────────────────────────

async function runAllAgents(): Promise<void> {
    const agents = loadAgentWallets();

    if (agents.length === 0) {
        console.error("❌ No agents loaded! Check your .env file and skills directory.");
        return;
    }

    console.log(`\n🚀 Starting agent cycle (${agents.length} agents)...\n`);
    const startTime = Date.now();

    // Shuffle agents to vary order each cycle
    const shuffled = [...agents].sort(() => Math.random() - 0.5);

    for (const agent of shuffled) {
        console.log(`\n─── ${agent.name} ────────────────────────`);
        await runAgent({
            wallet: agent.wallet,
            privateKey: agent.privateKey,
            persona: agent.persona,
        });

        // Stagger delay between agents
        await randomDelay();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Agent cycle complete (${elapsed}s)\n`);
}

// ─── Startup ─────────────────────────────────────────────────────────

async function main() {
    console.log("╔══════════════════════════════════════════╗");
    console.log("║     GoalNad Agent Runner v1.0            ║");
    console.log("╚══════════════════════════════════════════╝");
    console.log(`\n📡 API: ${config.apiBaseUrl}`);
    console.log(`⏰ Schedule: every ${config.scanIntervalMinutes} minutes`);
    console.log(`⏱  Agent delay: ${config.minAgentDelay / 1000}-${config.maxAgentDelay / 1000}s\n`);

    // Run immediately on start
    await runAllAgents();

    // Schedule recurring runs
    const cronExpr = `*/${config.scanIntervalMinutes} * * * *`;
    cron.schedule(cronExpr, async () => {
        console.log(`\n🔔 Scheduled run triggered at ${new Date().toISOString()}`);
        await runAllAgents();
    });

    console.log(`\n⏰ Cron scheduled: ${cronExpr}`);
    console.log("💤 Waiting for next cycle...\n");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
