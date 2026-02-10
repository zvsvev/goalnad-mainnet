import type { AgentPersona } from "./persona.js";
import type { Match, AgentStatus } from "./api.js";
import {
    getUpcomingMatches,
    getAgentStatus,
    placeBid,
    placeSupport,
} from "./api.js";
import { generateComment } from "./comments.js";

// ─── Types ───────────────────────────────────────────────────────────

export interface AgentConfig {
    wallet: string;
    persona: AgentPersona;
}

interface ActionDecision {
    action: "challenge" | "support" | "skip";
    bidAmount?: number;
    reason: string;
}

// ─── Decision Engine ─────────────────────────────────────────────────

/**
 * Decide what action an agent should take on a given match.
 * Uses weighted random based on persona's challenge/support split.
 */
function decide(
    persona: AgentPersona,
    match: Match,
    agentStatus: AgentStatus
): ActionDecision {
    const { balance, supportQuota } = agentStatus.agent;

    // Check if agent already acted on this match
    const alreadyActed = agentStatus.activeBids.some(
        (b) => b.match_id === match.id
    );
    if (alreadyActed) {
        return { action: "skip", reason: "Already acted on this match" };
    }

    // Check if match is locked down
    if (match.lockdown_time) {
        const lockdown = new Date(match.lockdown_time).getTime();
        if (Date.now() >= lockdown) {
            return { action: "skip", reason: "Match is locked down" };
        }
    }

    // Roll dice: skip first based on persona's skip percentage
    const skipRoll = Math.random() * 100;
    if (skipRoll < persona.skipPct) {
        return { action: "skip", reason: `Skip roll (${skipRoll.toFixed(0)} < ${persona.skipPct}% threshold)` };
    }

    // Remaining probability split between challenge and support
    const totalActionPct = persona.challengePct + persona.supportPct;
    const actionRoll = Math.random() * totalActionPct;
    const wantsChallenge = actionRoll < persona.challengePct;

    if (wantsChallenge) {
        // Challenge: need sufficient balance
        const currentHighest = match.highest_bid || 0;
        const minRequired = Math.max(persona.minBid, currentHighest + 1000);

        if (minRequired > balance) {
            // Can't afford to challenge — try support instead
            if (supportQuota > 0) {
                return { action: "support", reason: "Wanted to challenge but insufficient balance, supporting instead" };
            }
            return { action: "skip", reason: `Cannot afford min bid (${minRequired}) with balance (${balance})` };
        }

        // Calculate bid amount based on persona strategy
        const bidAmount = calculateBidAmount(persona, match, balance, minRequired);

        return {
            action: "challenge",
            bidAmount,
            reason: `Challenge — bid ${bidAmount} $GOAL (highest was ${currentHighest})`,
        };
    } else {
        // Support: need quota > 0
        if (supportQuota <= 0) {
            // No quota — try challenge instead if affordable
            const currentHighest = match.highest_bid || 0;
            const minRequired = Math.max(persona.minBid, currentHighest + 1000);

            if (minRequired <= balance) {
                const bidAmount = calculateBidAmount(persona, match, balance, minRequired);
                return {
                    action: "challenge",
                    bidAmount,
                    reason: "Wanted to support but no quota, challenging instead to earn quota",
                };
            }
            return { action: "skip", reason: "No support quota and can't afford to challenge" };
        }

        return { action: "support", reason: "Support — backing Oracle's prediction" };
    }
}

/**
 * Calculate bid amount based on persona's risk/sizing strategy.
 */
function calculateBidAmount(
    persona: AgentPersona,
    match: Match,
    balance: number,
    minRequired: number
): number {
    const maxAffordable = Math.min(balance, persona.maxBid);

    // Base amount: min required + random increment based on risk
    let amount: number;

    switch (persona.riskLevel) {
        case "Low":
            // Conservative: bid right at minimum or slightly above
            amount = minRequired + Math.floor(Math.random() * 1000);
            break;
        case "Med":
            // Moderate: bid 10-40% above minimum
            amount = minRequired + Math.floor(Math.random() * minRequired * 0.4);
            break;
        case "Med-High":
            // Aggressive-ish: bid 20-60% above minimum
            amount = minRequired + Math.floor(Math.random() * minRequired * 0.6);
            break;
        case "High":
            // Aggressive: bid 30-80% above minimum
            amount = minRequired + Math.floor(Math.random() * minRequired * 0.8);
            break;
        case "Random":
            // Chaos: anywhere from min to max affordable
            amount = minRequired + Math.floor(Math.random() * (maxAffordable - minRequired));
            break;
        default:
            amount = minRequired;
    }

    // Clamp to persona's max bid and available balance
    amount = Math.min(amount, maxAffordable);
    // Ensure we're at least at minimum
    amount = Math.max(amount, minRequired);

    return amount;
}

// ─── Agent Run Loop ──────────────────────────────────────────────────

/**
 * Run a single agent's decision cycle for all available matches.
 */
export async function runAgent(agentConfig: AgentConfig): Promise<void> {
    const { wallet, persona } = agentConfig;
    const tag = `[${persona.name}]`;

    try {
        // 1. Get agent status
        const status = await getAgentStatus(wallet);
        console.log(
            `${tag} Balance: ${status.agent.balance} | Quota: ${status.agent.supportQuota} | Active bids: ${status.activeBids.length}`
        );

        // 2. Get available matches
        const matches = await getUpcomingMatches();
        if (matches.length === 0) {
            console.log(`${tag} No upcoming matches to act on.`);
            return;
        }

        console.log(`${tag} Found ${matches.length} upcoming matches.`);

        // 3. Evaluate each match
        for (const match of matches) {
            // Re-fetch status (balance/quota may have changed from previous action)
            const currentStatus = await getAgentStatus(wallet);

            const decision = decide(persona, match, currentStatus);

            if (decision.action === "skip") {
                console.log(`${tag} SKIP ${match.home_team} vs ${match.away_team} — ${decision.reason}`);
                continue;
            }

            const comment = generateComment(persona, match, decision.action);

            if (decision.action === "challenge" && decision.bidAmount) {
                try {
                    const result = await placeBid(wallet, match.api_match_id, decision.bidAmount, comment);
                    console.log(
                        `${tag} ✅ CHALLENGE ${match.home_team} vs ${match.away_team} — ${decision.bidAmount} $GOAL | Pot: ${result.match.totalPot}`
                    );
                } catch (err: any) {
                    const errMsg = err.response?.data?.error || err.message;
                    console.log(`${tag} ❌ CHALLENGE FAILED ${match.home_team} vs ${match.away_team} — ${errMsg}`);
                }
            } else if (decision.action === "support") {
                try {
                    const result = await placeSupport(wallet, match.api_match_id, comment);
                    console.log(
                        `${tag} ✅ SUPPORT ${match.home_team} vs ${match.away_team} | Remaining quota: ${result.agent.supportQuota}`
                    );
                } catch (err: any) {
                    const errMsg = err.response?.data?.error || err.message;
                    console.log(`${tag} ❌ SUPPORT FAILED ${match.home_team} vs ${match.away_team} — ${errMsg}`);
                }
            }
        }
    } catch (err: any) {
        console.error(`${tag} Agent cycle error:`, err.message);
    }
}
