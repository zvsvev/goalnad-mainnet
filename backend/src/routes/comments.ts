import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";
import { broadcast } from "../services/websocket.js";

const router = Router();

// GET /api/comments/:matchApiId — get comments for a match
router.get("/:matchApiId", (req: Request, res: Response) => {
    try {
        const matchApiId = parseInt(req.params.matchApiId as string, 10);
        const match = db.prepare("SELECT id FROM matches WHERE api_match_id = ?").get(matchApiId) as any;
        if (!match) return res.json({ comments: [] });

        const comments = db.prepare(`
            SELECT c.id, c.wallet, c.message, c.created_at,
                   u.username, u.avatar_seed, u.avatar_url
            FROM match_comments c
            LEFT JOIN users u ON c.wallet = u.wallet
            WHERE c.match_id = ?
            ORDER BY c.created_at ASC
            LIMIT 200
        `).all(match.id) as any[];

        res.json({
            count: comments.length,
            comments: comments.map((c: any) => ({
                id: c.id,
                wallet: c.wallet,
                username: c.username || null,
                avatar_seed: c.avatar_seed || c.wallet,
                avatar_url: c.avatar_url || null,
                message: c.message,
                created_at: c.created_at,
            })),
        });
    } catch (err: any) {
        console.error("Error fetching comments:", err.message);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

// POST /api/comments — post a comment
router.post("/", (req: Request, res: Response) => {
    try {
        const { matchApiId, wallet, message } = req.body;

        if (!matchApiId || !wallet || !message) {
            return res.status(400).json({ error: "matchApiId, wallet, and message are required" });
        }

        const cleanMessage = message.trim().slice(0, 500); // max 500 chars
        if (cleanMessage.length === 0) {
            return res.status(400).json({ error: "Message cannot be empty" });
        }

        const match = db.prepare("SELECT id FROM matches WHERE api_match_id = ?").get(matchApiId) as any;
        if (!match) return res.status(404).json({ error: "Match not found" });

        // Rate limit: max 10 comments per minute per wallet
        const recentCount = db.prepare(`
            SELECT COUNT(*) as count FROM match_comments
            WHERE wallet = ? AND created_at >= datetime('now', '-1 minute')
        `).get(wallet) as any;
        if (recentCount.count >= 10) {
            return res.status(429).json({ error: "Too many comments. Please wait." });
        }

        const result = db.prepare(
            "INSERT INTO match_comments (match_id, wallet, message) VALUES (?, ?, ?)"
        ).run(match.id, wallet, cleanMessage);

        // Broadcast via WebSocket
        broadcast({
            type: "match_updated",
            matchId: matchApiId,
            data: { commentId: result.lastInsertRowid },
        });

        res.status(201).json({ success: true, commentId: result.lastInsertRowid });
    } catch (err: any) {
        console.error("Error posting comment:", err.message);
        res.status(500).json({ error: "Failed to post comment" });
    }
});

export default router;
