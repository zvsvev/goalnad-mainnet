/**
 * One-time setup script: generates 20 wallets and registers them as agents.
 *
 * Usage: npm run setup-wallets
 *
 * This will:
 * 1. Generate 20 random Monad-compatible wallets (private key + address)
 * 2. Register each agent via the backend API
 * 3. Output the .env configuration to paste into your .env file
 */

import "dotenv/config";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { registerAgent } from "./api.js";
import { loadAllPersonas } from "./persona.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log("╔══════════════════════════════════════════╗");
    console.log("║   GoalNad Wallet Setup (20 agents)       ║");
    console.log("╚══════════════════════════════════════════╝\n");

    // Load all personas from skills directory
    const skillsDir = path.resolve(__dirname, "../../skills");
    const personas = loadAllPersonas(skillsDir);

    console.log(`Found ${personas.length} personas\n`);

    const envLines: string[] = [];
    const privateKeys: string[] = [];

    for (const persona of personas) {
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);

        const envKey = `AGENT_${persona.name.replace(/_GN$/i, "").toUpperCase()}_WALLET`;

        console.log(`🔑 ${persona.name}`);
        console.log(`   Address:     ${account.address}`);
        console.log(`   Private Key: ${privateKey}`);

        // Register the agent via API
        try {
            const result = await registerAgent(account.address, persona.name);
            console.log(`   ✅ Registered: ${result.message}`);
        } catch (err: any) {
            const errMsg = err.response?.data?.error || err.message;
            console.log(`   ⚠️  Registration: ${errMsg}`);
        }

        envLines.push(`${envKey}=${account.address}`);
        privateKeys.push(`# ${persona.name}: ${privateKey}`);
        console.log();
    }

    // Output .env configuration
    console.log("\n══════════════════════════════════════════════");
    console.log("📋 COPY THIS TO YOUR .env FILE:");
    console.log("══════════════════════════════════════════════\n");
    console.log("# ─── Agent Wallet Addresses ───");
    console.log(envLines.join("\n"));

    console.log("\n\n# ─── SAVE THESE PRIVATE KEYS SECURELY ───");
    console.log("# (NOT in .env — store separately for mainnet migration)");
    console.log(privateKeys.join("\n"));

    console.log("\n\n✅ Done! Paste the wallet addresses into your .env file.");
    console.log("💡 Next steps:");
    console.log("   1. Fund each wallet with testnet $GOAL using your admin wallet");
    console.log("   2. Run `npm run dev` or `pm2 start ecosystem.config.cjs`");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
