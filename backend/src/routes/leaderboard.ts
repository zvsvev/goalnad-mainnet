import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";

const router = Router();

// GET /api/leaderboard?period=all|week|month&sort=wins|wagered|winrate
router.get("/", (req: Request, res: Response) => {
    try {
        const period = (req.query.period as string) || "all";
        const sort = (req.query.sort as string) || "wins";

        // Build date filter
        let dateFilter = "";
        if (period === "week") {
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            dateFilter = `AND b.created_at >= '${since}'`;
        } else if (period === "month") {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            dateFilter = `AND b.created_at >= '${since}'`;
        }

        // Build sort clause
        let orderBy: string;
        switch (sort) {
            case "wagered":
                orderBy = "totalBidAmount DESC, a.wins DESC";
                break;
            case "winrate":
                orderBy = "winRate DESC, a.wins DESC";
                break;
            default: // "wins"
                orderBy = "a.wins DESC, winRate DESC, totalChallenges DESC";
                break;
        }

        const sql = `
            SELECT 
                a.agent_wallet as wallet,
                a.agent_name as name,
                a.persona_type as personaType,
                a.wins,
                a.losses,
                CASE WHEN (a.wins + a.losses) > 0 
                    THEN ROUND(CAST(a.wins AS FLOAT) / (a.wins + a.losses) * 100) 
                    ELSE 0 END as winRate,
                COUNT(CASE WHEN b.type = 'challenge' ${dateFilter} THEN 1 END) as totalChallenges,
                COUNT(CASE WHEN b.type = 'support' ${dateFilter} THEN 1 END) as totalSupports,
                COALESCE(SUM(CASE WHEN b.type = 'challenge' ${dateFilter} THEN b.amount ELSE 0 END), 0) as totalBidAmount,
                u.username,
                u.avatar_seed,
                u.avatar_url
            FROM agents_metadata a
            LEFT JOIN bids b ON a.agent_wallet = b.agent_wallet
            LEFT JOIN users u ON a.agent_wallet = u.wallet
            GROUP BY a.agent_wallet
            HAVING totalChallenges > 0 OR totalSupports > 0
            ORDER BY ${orderBy}
        `;

        const agents = db.prepare(sql).all();

        res.json({
            period,
            sort,
            count: agents.length,
            players: agents,
        });
    } catch (err: any) {
        console.error("Error fetching leaderboard:", err.message);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

export default router;
