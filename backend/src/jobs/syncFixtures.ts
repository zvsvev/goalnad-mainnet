import cron from "node-cron";
import { db } from "../db/connection.js";
import { config } from "../config.js";
import { getMatches, FDMatch } from "../services/footballData.js";

// --- Lazy prepared statement ---
let _upsertStmt: ReturnType<typeof db.prepare> | null = null;
function getUpsertStatement() {
    if (!_upsertStmt) {
        _upsertStmt = db.prepare(`
            INSERT INTO matches (
                api_match_id, league_id, league_name,
                home_team, away_team,
                home_score, away_score,
                status, match_date, round, venue,
                home_logo, away_logo
            ) VALUES (
                @api_match_id, @league_id, @league_name,
                @home_team, @away_team,
                @home_score, @away_score,
                @status, @match_date, @round, @venue,
                @home_logo, @away_logo
            )
            ON CONFLICT(api_match_id) DO UPDATE SET
                home_score = @home_score,
                away_score = @away_score,
                status = @status,
                match_date = @match_date,
                round = @round,
                updated_at = CURRENT_TIMESTAMP
        `);
    }
    return _upsertStmt;
}

// Map football-data.org status to our simplified status
function mapStatus(fdStatus: string): string {
    switch (fdStatus) {
        case "SCHEDULED":
        case "TIMED":
            return "NS"; // Not Started
        case "IN_PLAY":
        case "PAUSED":
            return "LIVE";
        case "FINISHED":
            return "FT"; // Full Time
        case "POSTPONED":
            return "PST";
        case "CANCELLED":
            return "CANC";
        case "SUSPENDED":
            return "SUSP";
        case "AWARDED":
            return "AWD";
        default:
            return fdStatus;
    }
}

function upsertMatch(match: FDMatch, leagueCode: string, leagueName: string) {
    const stmt = getUpsertStatement();
    stmt.run({
        api_match_id: match.id,
        league_id: leagueCode,
        league_name: leagueName,
        home_team: match.homeTeam?.name || "TBD",
        away_team: match.awayTeam?.name || "TBD",
        home_score: match.score?.fullTime?.home,
        away_score: match.score?.fullTime?.away,
        status: mapStatus(match.status),
        match_date: match.utcDate,
        round: match.matchday ? `Matchday ${match.matchday}` : match.stage || null,
        venue: null, // football-data.org free tier doesn't include venue
        home_logo: match.homeTeam?.crest || null,
        away_logo: match.awayTeam?.crest || null,
    });
}

// Sync all matches for a competition
export async function syncFixturesForLeague(leagueCode: string, leagueName: string) {
    console.log(`🔄 Syncing fixtures for ${leagueName}...`);
    try {
        const matches = await getMatches(leagueCode);
        if (!matches || matches.length === 0) {
            console.log(`  ⚠️ No fixtures returned for ${leagueName}`);
            return 0;
        }

        const upsertMany = db.transaction((items: FDMatch[]) => {
            for (const match of items) {
                upsertMatch(match, leagueCode, leagueName);
            }
        });
        upsertMany(matches);

        console.log(`  ✅ Synced ${matches.length} fixtures for ${leagueName}`);
        return matches.length;
    } catch (err: any) {
        console.error(`  ❌ Error syncing ${leagueName}:`, err.response?.data || err.message);
        return 0;
    }
}

// Sync results for finished matches
export async function syncResults() {
    console.log("🔄 Syncing match results...");
    for (const league of Object.values(config.leagues)) {
        try {
            const matches = await getMatches(league.code, { status: "FINISHED" });
            if (matches && matches.length > 0) {
                const upsertMany = db.transaction((items: FDMatch[]) => {
                    for (const match of items) {
                        upsertMatch(match, league.code, league.name);
                    }
                });
                upsertMany(matches);
                console.log(`  ✅ Updated ${matches.length} results for ${league.name}`);
            }
        } catch (err: any) {
            console.error(`  ❌ Error syncing results for ${league.name}:`, err.response?.data || err.message);
        }
    }
}

// Initial sync: load all fixtures
export async function initialSync() {
    console.log("🔄 Running initial fixture sync...");
    let total = 0;
    for (const league of Object.values(config.leagues)) {
        // Add delay between requests (free tier: 10 req/min)
        if (total > 0) {
            await new Promise((r) => setTimeout(r, 6500));
        }
        const count = await syncFixturesForLeague(league.code, league.name);
        total += count;
    }
    console.log(`✅ Initial sync complete: ${total} fixtures loaded\n`);
}

// Schedule cron jobs
export function scheduleSyncJobs() {
    // Sync fixtures daily at 06:00 UTC
    cron.schedule("0 6 * * *", async () => {
        for (const league of Object.values(config.leagues)) {
            await syncFixturesForLeague(league.code, league.name);
            // Respect rate limit
            await new Promise((r) => setTimeout(r, 6500));
        }
    });

    // Sync results every 2 hours
    cron.schedule("0 */2 * * *", syncResults);

    console.log("⏰ Cron jobs scheduled:");
    console.log("   - Fixture sync: daily at 06:00 UTC");
    console.log("   - Result sync: every 2 hours");
}
