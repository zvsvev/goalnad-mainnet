import { Router, Request, Response } from "express";
import { getStandings } from "../services/footballData.js";

const router = Router();

// In-memory cache for standings (1 hour TTL)
const standingsCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// GET /api/standings/:competitionCode — e.g. /api/standings/PL
router.get("/:competitionCode", async (req: Request, res: Response) => {
    try {
        const { competitionCode } = req.params;
        const code = (competitionCode as string).toUpperCase();

        // Check cache
        const cached = standingsCache[code];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json({ source: "cache", standings: cached.data });
        }

        const standings = await getStandings(code);
        standingsCache[code] = { data: standings, timestamp: Date.now() };

        res.json({ source: "api", standings });
    } catch (err: any) {
        console.error("Error fetching standings:", err.response?.data || err.message);
        res.status(500).json({ error: "Failed to fetch standings" });
    }
});

export default router;
