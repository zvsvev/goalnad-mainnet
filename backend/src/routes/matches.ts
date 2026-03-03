import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";
import { getMatch, getHeadToHead } from "../services/footballData.js";

const router = Router();

// GET /api/matches — list matches with optional filters
router.get("/", (req: Request, res: Response) => {
    try {
        const { league, status, from, to, limit, biddable, predicted } = req.query;

        let sql = "SELECT * FROM matches WHERE 1=1";
        const params: any[] = [];

        // Filter for biddable matches (have oracle prediction + onchain_match_id)
        if (biddable === "true") {
            sql += " AND oracle_prediction IS NOT NULL AND onchain_match_id IS NOT NULL";
        }

        // Filter for predicted matches (have oracle prediction)
        if (predicted === "true") {
            sql += " AND oracle_prediction IS NOT NULL";
        }

        if (league) {
            sql += " AND league_id = ?";
            params.push(league);
        }
        if (status) {
            sql += " AND status = ?";
            params.push(status);
        }
        if (from) {
            sql += " AND match_date >= ?";
            params.push(from);
        }
        if (to) {
            sql += " AND match_date <= ?";
            params.push(to);
        }

        sql += " ORDER BY match_date ASC";

        if (limit) {
            sql += " LIMIT ?";
            params.push(parseInt(limit as string, 10));
        }

        const matches = db.prepare(sql).all(...params);
        res.json({ count: matches.length, matches });
    } catch (err: any) {
        console.error("Error fetching matches:", err.message);
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});


// GET /api/matches/oracle/stats — public Oracle accuracy stats
router.get("/oracle/stats", (_req: Request, res: Response) => {
    try {
        const totalPredictions = db.prepare(
            "SELECT COUNT(*) as count FROM matches WHERE oracle_prediction IS NOT NULL"
        ).get() as any;

        const correctPredictions = db.prepare(`
            SELECT COUNT(*) as count FROM matches
            WHERE oracle_prediction IS NOT NULL
              AND resolved = 1
              AND result = oracle_prediction
        `).get() as any;

        const totalResolved = db.prepare(`
            SELECT COUNT(*) as count FROM matches
            WHERE oracle_prediction IS NOT NULL AND resolved = 1
        `).get() as any;

        const accuracy = totalResolved.count > 0
            ? ((correctPredictions.count / totalResolved.count) * 100).toFixed(1)
            : null;

        res.json({
            totalPredictions: totalPredictions.count,
            totalResolved: totalResolved.count,
            correct: correctPredictions.count,
            accuracy,
        });
    } catch (err: any) {
        console.error("Error fetching oracle stats:", err.message);
        res.status(500).json({ error: "Failed to fetch oracle stats" });
    }
});

// GET /api/matches/oracle/predictions — all Oracle predictions with results
router.get("/oracle/predictions", (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string, 10) || 100;

        const predictions = db.prepare(`
            SELECT
                api_match_id,
                league_id,
                league_name,
                home_team,
                away_team,
                home_logo,
                away_logo,
                home_score,
                away_score,
                match_date,
                oracle_prediction,
                oracle_score,
                oracle_analysis,
                oracle_conviction,
                resolved,
                result,
                status
            FROM matches
            WHERE oracle_prediction IS NOT NULL
            ORDER BY match_date DESC
            LIMIT ?
        `).all(limit);

        res.json({
            count: predictions.length,
            predictions,
        });
    } catch (err: any) {
        console.error("Error fetching oracle predictions:", err.message);
        res.status(500).json({ error: "Failed to fetch oracle predictions" });
    }
});

// GET /api/matches/feed/recent — latest 8 agent actions across all matches
router.get("/feed/recent", (req: Request, res: Response) => {
    try {
        const feed = db
            .prepare(
                `SELECT b.amount, b.type, b.comment, b.created_at, b.agent_wallet, b.tx_hash,
                        u.username, u.avatar_seed, u.avatar_url,
                        m.api_match_id, m.home_team, m.away_team, m.league_id
                 FROM bids b
                 LEFT JOIN users u ON b.agent_wallet = u.wallet
                 JOIN matches m ON b.match_id = m.id
                 ORDER BY b.created_at DESC
                 LIMIT 8`
            )
            .all();

        res.json({ count: feed.length, feed });
    } catch (err: any) {
        console.error("Error fetching feed:", err.message);
        res.status(500).json({ error: "Failed to fetch feed" });
    }
});

// GET /api/matches/:id/h2h — head-to-head stats from football-data.org
router.get("/:id/h2h", async (req: Request, res: Response) => {
    try {
        const matchId = parseInt(req.params.id as string, 10);
        if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match ID" });

        const h2h = await getHeadToHead(matchId, 5);
        if (!h2h) return res.json({ available: false });

        res.json({
            available: true,
            numberOfMatches: h2h.numberOfMatches,
            totalGoals: h2h.totalGoals,
            homeTeam: h2h.homeTeam,
            awayTeam: h2h.awayTeam,
            recentMatches: h2h.matches.map((m) => ({
                date: m.utcDate,
                home: m.homeTeam.shortName || m.homeTeam.name,
                away: m.awayTeam.shortName || m.awayTeam.name,
                homeScore: m.score?.fullTime?.home,
                awayScore: m.score?.fullTime?.away,
                status: m.status,
            })),
        });
    } catch (err: any) {
        console.error("Error fetching H2H:", err.message);
        res.json({ available: false });
    }
});

// GET /api/matches/:id — get single match with arena data (fallback to live API)
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const match = db.prepare("SELECT * FROM matches WHERE api_match_id = ?").get(id) as any;

        if (match) {
            // Get bet counts by outcome
            const betCounts = db
                .prepare("SELECT outcome, COUNT(*) as count FROM bids WHERE match_id = ? GROUP BY outcome")
                .all(match.id) as any[];
            const totalBets = betCounts.reduce((s: number, b: any) => s + b.count, 0);

            // For resolved matches, add result info
            let resultInfo = null;
            if (match.resolved && match.result !== null) {
                const oracleCorrect = match.oracle_prediction === match.result;
                const resultLabel = match.result === 0 ? "Home Win"
                    : match.result === 1 ? "Draw"
                        : "Away Win";

                resultInfo = {
                    oracleCorrect,
                    resultLabel,
                    message: `Result: ${resultLabel}${oracleCorrect ? " — Oracle was right" : ""}`,
                };
            }

            return res.json({
                ...match,
                totalBets,
                resultInfo,
            });
        }

        // Fallback: fetch from football-data.org
        try {
            const liveMatch = await getMatch(parseInt(id as string, 10));
            if (liveMatch) {
                return res.json({
                    api_match_id: liveMatch.id,
                    league_id: liveMatch.competition.code,
                    league_name: liveMatch.competition.name,
                    home_team: liveMatch.homeTeam?.name,
                    away_team: liveMatch.awayTeam?.name,
                    home_score: liveMatch.score?.fullTime?.home,
                    away_score: liveMatch.score?.fullTime?.away,
                    status: liveMatch.status,
                    match_date: liveMatch.utcDate,
                    round: liveMatch.matchday ? `Matchday ${liveMatch.matchday}` : null,
                });
            }
        } catch (fetchErr: any) {
            // Suppress 400/429 errors from football-data.org (rate limits / invalid IDs)
            const status = fetchErr.response?.status;
            if (status !== 400 && status !== 429) {
                console.error(`Error fetching match ${id} from API:`, fetchErr.message);
            }
        }

        res.status(404).json({ error: "Match not found" });
    } catch (err: any) {
        console.error("Error fetching match:", err.message);
        res.status(500).json({ error: "Failed to fetch match" });
    }
});

// GET /api/matches/:id/bids — public list of agent activity for a match (includes claims)
router.get("/:id/bids", (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find match by api_match_id
        const match = db
            .prepare("SELECT id, resolve_tx_hash, lucky_supporter FROM matches WHERE api_match_id = ?")
            .get(id) as any;
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }

        // Get bids and supports
        const bids = db
            .prepare(
                `SELECT b.agent_wallet, b.amount, b.type, b.comment, b.created_at, b.tx_hash,
                        u.username, u.avatar_seed, u.avatar_url,
                        'bid' as activity_type
                 FROM bids b
                 LEFT JOIN users u ON b.agent_wallet = u.wallet
                 WHERE b.match_id = ?`
            )
            .all(match.id);

        // Get claims
        const claims = db
            .prepare(
                `SELECT c.agent_wallet, c.amount, c.created_at, c.tx_hash,
                        u.username, u.avatar_seed, u.avatar_url,
                        'claim' as activity_type
                 FROM claims c
                 LEFT JOIN users u ON c.agent_wallet = u.wallet
                 WHERE c.match_id = ?`
            )
            .all(match.id);

        // Combine and sort by created_at DESC
        const activity = [...bids, ...claims].sort((a: any, b: any) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        res.json({
            count: activity.length,
            bids: activity,
            resolve_tx_hash: match.resolve_tx_hash,
        });
    } catch (err: any) {
        console.error("Error fetching match bids:", err.message);
        res.status(500).json({ error: "Failed to fetch match bids" });
    }
});

export default router;

