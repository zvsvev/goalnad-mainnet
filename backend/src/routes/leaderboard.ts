import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";

const router = Router();

// GET /api/leaderboard?period=all|week|month&sort=wins|wagered|winrate
router.get("/", (req: Request, res: Response) => {
    try {
        const period = (req.query.period as string) || "all";
        const sort = (req.query.sort as string) || "wins";

        // Build date filter (parameterized to avoid SQL injection)
        let dateFilter = "";
        const params: any[] = [];
        if (period === "week") {
            dateFilter = "AND b.created_at >= ?";
            params.push(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        } else if (period === "month") {
            dateFilter = "AND b.created_at >= ?";
            params.push(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        }

        // Build sort clause
        let orderBy: string;
        switch (sort) {
            case "wagered":
                orderBy = "totalBidAmount DESC, wins DESC";
                break;
            case "winrate":
                orderBy = "winRate DESC, wins DESC";
                break;
            default: // "wins"
                orderBy = "wins DESC, winRate DESC, totalBets DESC";
                break;
        }

        const sql = `
            SELECT 
                u.wallet,
                u.username as name,
                NULL as personaType,
                SUM(CASE WHEN m.resolved = 1 AND b.outcome = m.result THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN m.resolved = 1 AND b.outcome != m.result THEN 1 ELSE 0 END) as losses,
                CASE WHEN SUM(CASE WHEN m.resolved = 1 THEN 1 ELSE 0 END) > 0 
                    THEN ROUND(CAST(SUM(CASE WHEN m.resolved = 1 AND b.outcome = m.result THEN 1 ELSE 0 END) AS FLOAT) / SUM(CASE WHEN m.resolved = 1 THEN 1 ELSE 0 END) * 100) 
                    ELSE 0 END as winRate,
                COUNT(*) as totalBets,
                COALESCE(SUM(b.amount), 0) as totalBidAmount,
                u.username,
                u.avatar_seed,
                u.avatar_url
            FROM users u
            JOIN bids b ON u.wallet = b.agent_wallet
            JOIN matches m ON b.match_id = m.id
            WHERE 1=1 ${dateFilter}
            GROUP BY u.wallet
            HAVING totalBets > 0
            ORDER BY ${orderBy}
        `;

        const players = db.prepare(sql).all(...params);

        res.json({
            period,
            sort,
            count: players.length,
            players: players,
        });
    } catch (err: any) {
        console.error("Error fetching leaderboard:", err.message);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

export default router;
