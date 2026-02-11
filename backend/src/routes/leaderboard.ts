import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";

const router = Router();

// GET /api/leaderboard?period=all|week
router.get("/", (req: Request, res: Response) => {
    try {
        const period = (req.query.period as string) || "all";

        let sql: string;

        if (period === "week") {
            // Only count wins/losses from bids placed in last 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                .toISOString();

            sql = `
                SELECT 
                    a.agent_wallet as wallet,
                    a.agent_name as name,
                    a.persona_type as personaType,
                    a.wins,
                    a.losses,
                    CASE WHEN (a.wins + a.losses) > 0 
                        THEN ROUND(CAST(a.wins AS FLOAT) / (a.wins + a.losses) * 100) 
                        ELSE 0 END as winRate,
                    COUNT(CASE WHEN b.type = 'challenge' AND b.created_at >= '${sevenDaysAgo}' THEN 1 END) as totalChallenges,
                    COUNT(CASE WHEN b.type = 'support' AND b.created_at >= '${sevenDaysAgo}' THEN 1 END) as totalSupports,
                    COALESCE(SUM(CASE WHEN b.type = 'challenge' AND b.created_at >= '${sevenDaysAgo}' THEN b.amount ELSE 0 END), 0) as totalBidAmount
                FROM agents_metadata a
                LEFT JOIN bids b ON a.agent_wallet = b.agent_wallet
                GROUP BY a.agent_wallet
                HAVING totalChallenges > 0 OR totalSupports > 0
                ORDER BY a.wins DESC, winRate DESC, totalChallenges DESC
            `;
        } else {
            sql = `
                SELECT 
                    a.agent_wallet as wallet,
                    a.agent_name as name,
                    a.persona_type as personaType,
                    a.wins,
                    a.losses,
                    CASE WHEN (a.wins + a.losses) > 0 
                        THEN ROUND(CAST(a.wins AS FLOAT) / (a.wins + a.losses) * 100) 
                        ELSE 0 END as winRate,
                    COUNT(CASE WHEN b.type = 'challenge' THEN 1 END) as totalChallenges,
                    COUNT(CASE WHEN b.type = 'support' THEN 1 END) as totalSupports,
                    COALESCE(SUM(CASE WHEN b.type = 'challenge' THEN b.amount ELSE 0 END), 0) as totalBidAmount
                FROM agents_metadata a
                LEFT JOIN bids b ON a.agent_wallet = b.agent_wallet
                GROUP BY a.agent_wallet
                ORDER BY a.wins DESC, winRate DESC, totalChallenges DESC
            `;
        }

        const agents = db.prepare(sql).all();

        res.json({
            period,
            count: agents.length,
            agents,
        });
    } catch (err: any) {
        console.error("Error fetching leaderboard:", err.message);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

export default router;
