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
        const envKey = personaToEnvKey(persona.name);
        const wallet = process.env[envKey];

        if (!wallet) {
            console.warn(`⚠️  No wallet for ${persona.name} (env: ${envKey}) — skipping`);
            continue;
        }

        agents.push({
            name: persona.name,
            wallet: wallet.trim(),
            persona,
        });
    }

    console.log(`\n📋 Loaded ${agents.length} agents with wallets:`);
    for (const a of agents) {
        console.log(`   ${a.name.padEnd(15)} → ${a.wallet.slice(0, 10)}...${a.wallet.slice(-6)}`);
    }
    console.log();

    return agents;
}
