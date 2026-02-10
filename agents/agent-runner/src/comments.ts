import type { AgentPersona } from "./persona.js";
import type { Match } from "./api.js";

/**
 * Generate a contextual comment for a bid/support action.
 * Uses the persona's comment examples as templates and injects match context.
 */
export function generateComment(
    persona: AgentPersona,
    match: Match,
    action: "challenge" | "support"
): string {
    const examples = persona.commentExamples;

    // If we have examples, pick one and adapt it
    if (examples.length > 0) {
        const template = examples[Math.floor(Math.random() * examples.length)];
        return adaptComment(template, match, persona, action);
    }

    // Fallback: generate a basic comment based on persona style
    return generateFallbackComment(persona, match, action);
}

function adaptComment(
    template: string,
    match: Match,
    persona: AgentPersona,
    action: "challenge" | "support"
): string {
    // Replace team placeholders with actual teams
    let comment = template;

    // Try to make it contextual by swapping team names
    const teams = [match.home_team, match.away_team];
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];

    // Replace common team references in templates
    comment = comment
        .replace(/Arsenal|Liverpool|Man City|Manchester City|Inter|Juventus|Milan|Roma|Napoli/gi, randomTeam)
        .replace(/home win|away win/gi, action === "challenge" ? "upset potential" : "Oracle's read");

    // If comment is too similar to template, add match context
    if (comment === template) {
        const prefix = action === "challenge"
            ? `${match.home_team} vs ${match.away_team} — `
            : `Backing Oracle on ${match.home_team} vs ${match.away_team}. `;
        comment = prefix + comment;
    }

    // Truncate to reasonable length
    return comment.slice(0, 200);
}

function generateFallbackComment(
    persona: AgentPersona,
    match: Match,
    action: "challenge" | "support"
): string {
    const matchLabel = `${match.home_team} vs ${match.away_team}`;

    const challengeComments = [
        `Oracle's call on ${matchLabel} doesn't add up. I see value on the other side.`,
        `Going against the Oracle here. ${matchLabel} has upset written all over it.`,
        `The data tells a different story for ${matchLabel}. Challenging.`,
        `Oracle underestimating the visitors in ${matchLabel}. Taking the other side.`,
        `${matchLabel} — Oracle's read feels off. My analysis says otherwise.`,
        `Form guide disagrees with Oracle on ${matchLabel}. Challenge placed.`,
    ];

    const supportComments = [
        `Oracle nailed the read on ${matchLabel}. Backing this one.`,
        `${matchLabel} — everything points to Oracle being right here. Support.`,
        `Agreeing with Oracle on ${matchLabel}. The stats line up perfectly.`,
        `Smart call by Oracle on ${matchLabel}. Happy to support.`,
        `${matchLabel} — Oracle's analysis matches my own. Full support.`,
        `The form and standings both confirm Oracle's pick for ${matchLabel}.`,
    ];

    const pool = action === "challenge" ? challengeComments : supportComments;
    return pool[Math.floor(Math.random() * pool.length)];
}
