import fs from "fs";
import path from "path";
import matter from "gray-matter";

// ─── Types ───────────────────────────────────────────────────────────

export interface AgentPersona {
    name: string;
    riskLevel: "Low" | "Med" | "Med-High" | "High" | "Random";
    challengePct: number;   // 0-100, e.g. 35 means 35% challenge
    supportPct: number;     // 0-100, e.g. 65 means 65% support
    skipPct: number;        // derived: matches skipped
    maxBid: number;         // max $GOAL per bid
    minBid: number;         // always 1000
    commentExamples: string[];
    style: string;
    strength: string;
    weakness: string;
    favoritePatterns: string[];
}

// ─── Skill File Parser ───────────────────────────────────────────────

export function parseSkillFile(filePath: string): AgentPersona {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data: frontmatter, content } = matter(raw);

    const name = frontmatter.name || path.basename(filePath, ".md").replace("-gn-skill", "");

    // Extract strategy values from markdown content
    const challengePct = extractNumber(content, /Action Split.*?(\d+)%\s*Challenge/i) || 50;
    const supportPct = extractNumber(content, /Action Split.*?(\d+)%\s*Support/i) || 50;

    // Risk level
    const riskMatch = content.match(/\*\*Risk:\*\*\s*(Low|Med-High|Med|High|Random)/i);
    const riskLevel = (riskMatch?.[1] || "Med") as AgentPersona["riskLevel"];

    // Max bid
    const maxBidMatch = content.match(/Never bids more than (\d+)/i)
        || content.match(/max.*?(\d+)\s*\$GOAL/i)
        || content.match(/up to (\d+)\s*\$GOAL/i)
        || content.match(/(\d+)\s*\$GOAL.*cap/i);
    const maxBid = maxBidMatch ? parseInt(maxBidMatch[1], 10) : riskToBidCap(riskLevel);

    // Skip percentage from "Skips ~XX% of matches"
    const skipMatch = content.match(/Skips?\s*~?(\d+)%/i);
    const skipPct = skipMatch ? parseInt(skipMatch[1], 10) : riskToSkipPct(riskLevel);

    // Comment examples
    const commentExamples = extractCommentExamples(content);

    // Style, strength, weakness
    const style = extractField(content, "Style") || "Analytical";
    const strength = extractField(content, "Strength") || "General analysis";
    const weakness = extractField(content, "Weakness") || "None specified";

    // Favorite patterns
    const favoritePatterns = extractListSection(content, "Favorite Patterns");

    return {
        name,
        riskLevel,
        challengePct,
        supportPct,
        skipPct,
        maxBid,
        minBid: 1000,
        commentExamples,
        style,
        strength,
        weakness,
        favoritePatterns,
    };
}

// Load all skill files from a directory
export function loadAllPersonas(skillsDir: string): AgentPersona[] {
    const files = fs.readdirSync(skillsDir).filter((f) => f.endsWith("-gn-skill.md"));
    return files.map((f) => parseSkillFile(path.join(skillsDir, f)));
}

// ─── Helpers ─────────────────────────────────────────────────────────

function extractNumber(content: string, regex: RegExp): number | null {
    const match = content.match(regex);
    return match ? parseInt(match[1], 10) : null;
}

function extractField(content: string, field: string): string | null {
    const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`, "i");
    const match = content.match(regex);
    return match ? match[1].trim() : null;
}

function extractCommentExamples(content: string): string[] {
    const codeBlockMatch = content.match(/```[\s\S]*?Examples:\s*([\s\S]*?)```/i);
    if (!codeBlockMatch) return [];

    return codeBlockMatch[1]
        .split("\n")
        .map((line) => line.replace(/^[""\s]+|[""\s]+$/g, "").trim())
        .filter((line) => line.length > 10);
}

function extractListSection(content: string, heading: string): string[] {
    const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, "i");
    const match = content.match(regex);
    if (!match) return [];

    return match[1]
        .split("\n")
        .filter((line) => line.startsWith("- "))
        .map((line) => line.replace(/^-\s*/, "").trim());
}

function riskToBidCap(risk: string): number {
    switch (risk.toLowerCase()) {
        case "low": return 3000;
        case "med": return 5000;
        case "med-high": return 7000;
        case "high": return 10000;
        case "random": return 8000;
        default: return 5000;
    }
}

function riskToSkipPct(risk: string): number {
    switch (risk.toLowerCase()) {
        case "low": return 55;
        case "med": return 40;
        case "med-high": return 30;
        case "high": return 20;
        case "random": return 30;
        default: return 40;
    }
}
