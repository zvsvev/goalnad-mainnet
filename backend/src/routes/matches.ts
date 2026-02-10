import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";
import { getMatch } from "../services/footballData.js";

const router = Router();

// GET /api/matches — list matches with optional filters
router.get("/", (req: Request, res: Response) => {
    try {
        const { league, status, from, to, limit } = req.query;

        let sql = "SELECT * FROM matches WHERE 1=1";
        const params: any[] = [];

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

// GET /api/matches/:id — get single match with arena data (fallback to live API)
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const match = db.prepare("SELECT * FROM matches WHERE api_match_id = ?").get(id) as any;

        if (match) {
            // Enrich with arena data
            const supportersCount = db
                .prepare("SELECT COUNT(*) as count FROM bids WHERE match_id = ? AND type = 'support'")
                .get(match.id) as any;
            const challengersCount = db
                .prepare("SELECT COUNT(*) as count FROM bids WHERE match_id = ? AND type = 'challenge'")
                .get(match.id) as any;

            return res.json({
                ...match,
                supportersCount: supportersCount?.count || 0,
                challengersCount: challengersCount?.count || 0,
                currentHighestBid: match.highest_bid || 0,
            });
        }

        // Fallback: fetch from football-data.org
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

        res.status(404).json({ error: "Match not found" });
    } catch (err: any) {
        console.error("Error fetching match:", err.message);
        res.status(500).json({ error: "Failed to fetch match" });
    }
});

// GET /api/matches/:id/bids — public list of agent activity for a match
router.get("/:id/bids", (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find match by api_match_id
        const match = db
            .prepare("SELECT id FROM matches WHERE api_match_id = ?")
            .get(id) as any;
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }

        const bids = db
            .prepare(
                `SELECT b.agent_wallet, b.amount, b.type, b.comment, b.created_at,
                        a.agent_name, a.persona_type, a.wins, a.losses
                 FROM bids b
                 LEFT JOIN agents_metadata a ON b.agent_wallet = a.agent_wallet
                 WHERE b.match_id = ?
                 ORDER BY b.created_at DESC`
            )
            .all(match.id);

        res.json({ count: bids.length, bids });
    } catch (err: any) {
        console.error("Error fetching match bids:", err.message);
        res.status(500).json({ error: "Failed to fetch match bids" });
    }
});

export default router;
