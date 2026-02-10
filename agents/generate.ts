#!/usr/bin/env node

/**
 * Converts existing agent persona skill files (*-gn-skill.md) into
 * OpenClaw SKILL.md format in the openclaw-skills/personas/ directory,
 * then generates a docker-compose.yml for all 20 agents.
 *
 * Usage: npx tsx generate.ts
 * No external dependencies required.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Simple frontmatter parser (no deps)
function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { data: {}, content: raw };
    const data: Record<string, string> = {};
    for (const line of match[1].split("\n")) {
        const [key, ...rest] = line.split(":");
        if (key && rest.length) data[key.trim()] = rest.join(":").trim();
    }
    return { data, content: match[2] };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, "skills");
const OPENCLAW_SKILLS_DIR = path.resolve(__dirname, "openclaw-skills/personas");
const COMPOSE_OUTPUT = path.resolve(__dirname, "openclaw-deploy/docker-compose.yml");

// ─── Step 1: Convert Skill Files ─────────────────────────────────────

function convertSkills(): string[] {
    const files = fs.readdirSync(SKILLS_DIR).filter((f) => f.endsWith("-gn-skill.md"));
    const agentNames: string[] = [];

    for (const file of files) {
        const raw = fs.readFileSync(path.join(SKILLS_DIR, file), "utf-8");
        const { data: frontmatter, content } = parseFrontmatter(raw);
        const name = frontmatter.name || file.replace("-gn-skill.md", "");
        const slug = name.replace(/_GN$/i, "").toLowerCase();

        agentNames.push(slug);

        // Create OpenClaw SKILL.md with proper frontmatter
        const openclawSkill = `---
name: goalnad-persona-${slug}
description: Persona and strategy for ${name} house agent in GoalNad Arena
---

# ${name} — GoalNad Persona

You are **${name}**, a house agent in the GoalNad Arena. This is your personality and strategy. Follow these instructions IN ADDITION to the base goalnad-agent skill.

${content.trim()}

## Agent Configuration

Your identity:
- **Agent Name**: ${name}
- **Wallet Address**: Use the \`AGENT_WALLET\` environment variable
- **API URL**: Use the \`GOALNAD_API_URL\` environment variable

When making API calls, always set the header:
\`\`\`
X-Agent-Wallet: {AGENT_WALLET}
\`\`\`

## Autonomous Schedule

You will be activated periodically. Each time you are activated:
1. Follow the goalnad-agent skill workflow (check status → scan matches → analyze → act)
2. Apply YOUR persona's strategy when deciding (challenge vs support split, risk level, bid sizing)
3. Write comments in YOUR style — stay in character
4. Log your decisions with brief reasoning
`;

        // Write to openclaw-skills/personas/<slug>/SKILL.md
        const outDir = path.join(OPENCLAW_SKILLS_DIR, slug);
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, "SKILL.md"), openclawSkill);
        console.log(`✅ Converted: ${name} → ${outDir}/SKILL.md`);
    }

    return agentNames;
}

// ─── Step 2: Generate docker-compose.yml ─────────────────────────────

function generateCompose(agentNames: string[]): void {
    const services: string[] = [];

    for (const slug of agentNames) {
        const envKey = `AGENT_${slug.toUpperCase()}_WALLET`;
        const service = `
  openclaw-${slug}:
    image: ghcr.io/phioranex/openclaw-docker:latest
    container_name: goalnad-${slug}
    environment:
      - ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
      - AGENT_NAME=\${AGENT_${slug.toUpperCase()}_NAME:-${slug.charAt(0).toUpperCase() + slug.slice(1)}_GN}
      - AGENT_WALLET=\${${envKey}}
      - GOALNAD_API_URL=\${GOALNAD_API_URL}
    volumes:
      - ../openclaw-skills/goalnad-agent:/home/user/.openclaw/skills/goalnad-agent:ro
      - ../openclaw-skills/personas/${slug}:/home/user/.openclaw/skills/goalnad-persona:ro
      - ./agent-data/${slug}:/home/user/.openclaw/data
    restart: unless-stopped
    mem_limit: 256m
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"`;

        services.push(service);
    }

    const compose = `# AUTO-GENERATED — Do not edit manually
# Regenerate with: npx tsx ../generate.ts

version: "3.8"

services:${services.join("\n")}
`;

    fs.mkdirSync(path.dirname(COMPOSE_OUTPUT), { recursive: true });
    fs.writeFileSync(COMPOSE_OUTPUT, compose);
    console.log(`\n✅ Generated: ${COMPOSE_OUTPUT}`);
    console.log(`   ${agentNames.length} agent services defined`);
}

// ─── Step 3: Generate .env.example ───────────────────────────────────

function generateEnvExample(agentNames: string[]): void {
    const envPath = path.join(path.dirname(COMPOSE_OUTPUT), ".env.example");

    const walletLines = agentNames.map((slug) => {
        const name = slug.charAt(0).toUpperCase() + slug.slice(1);
        return `AGENT_${slug.toUpperCase()}_WALLET=\nAGENT_${slug.toUpperCase()}_NAME=${name}_GN`;
    });

    const envContent = `# GoalNad OpenClaw Deployment Configuration

# ─── Shared Secrets ───
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOALNAD_API_URL=https://testnet.goalnad.fun/api
ADMIN_API_KEY=goalnad-admin-secret

# ─── Agent Wallets (generated by setup-wallets.ts) ───
${walletLines.join("\n")}
`;

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Generated: ${envPath}`);
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║   GoalNad OpenClaw Setup Generator           ║");
    console.log("╚══════════════════════════════════════════════╝\n");

    const agentNames = convertSkills();
    console.log(`\n📋 ${agentNames.length} personas converted\n`);

    generateCompose(agentNames);
    generateEnvExample(agentNames);

    console.log("\n🎯 Next steps:");
    console.log("   1. cd openclaw-deploy");
    console.log("   2. cp .env.example .env");
    console.log("   3. Fill in wallet addresses + ANTHROPIC_API_KEY");
    console.log("   4. docker compose up -d");
}

main();
