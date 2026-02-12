import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { AgentPersona } from "./persona.js";
import { loadAllPersonas } from "./persona.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Types ───────────────────────────────────────────────────────────

export interface AgentWallet {
    name: string;         // e.g. "Marcus_GN"
    wallet: string;       // Monad wallet address
    privateKey?: string;  // Private key for on-chain transactions (optional)
    persona: AgentPersona;
}

// ─── Wallet Name Mapping ─────────────────────────────────────────────

// Maps persona name → env var key
function personaToEnvKey(personaName: string): string {
    // "Marcus_GN" → "AGENT_MARCUS_WALLET"
    const base = personaName.replace(/_GN$/i, "").toUpperCase();
    return `AGENT_${base}_WALLET`;
}

// ─── Load All Agent Wallets ──────────────────────────────────────────

export function loadAgentWallets(): AgentWallet[] {
    // Load all personas from the skills directory
    const skillsDir = path.resolve(__dirname, "../../skills");
    if (!fs.existsSync(skillsDir)) {
        console.error(`❌ Skills directory not found: ${skillsDir}`);
        console.error(`   Expected at: agents/skills/`);
        process.exit(1);
    }

    const personas = loadAllPersonas(skillsDir);
    const agents: AgentWallet[] = [];

    for (const persona of personas) {
        const walletEnvKey = personaToEnvKey(persona.name);
        const privateKeyEnvKey = walletEnvKey.replace("_WALLET", "_PRIVATE_KEY");

        const wallet = process.env[walletEnvKey];
        const privateKey = process.env[privateKeyEnvKey];

        if (!wallet) {
            console.warn(`⚠️  No wallet for ${persona.name} (env: ${walletEnvKey}) — skipping`);
            continue;
        }

        agents.push({
            name: persona.name,
            wallet: wallet.trim(),
            privateKey: privateKey?.trim(),
            persona,
        });
    }

    console.log(`\n📋 Loaded ${agents.length} agents with wallets:`);
    for (const a of agents) {
        const pkStatus = a.privateKey ? "🔑" : "❌";
        console.log(`   ${a.name.padEnd(15)} → ${a.wallet.slice(0, 10)}...${a.wallet.slice(-6)} ${pkStatus}`);
    }
    console.log();

    return agents;
}
