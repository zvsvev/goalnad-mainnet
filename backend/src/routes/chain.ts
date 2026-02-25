import { Router, Request, Response } from "express";
import { config } from "../config.js";
import {
    isChainEnabled,
    getMarketOnChain,
    getGoalTokenBalance,
    PROGRAM_ID,
    lamportsToSol,
} from "../services/chain.js";

const router = Router();

// ─── GET /api/chain/contracts — contract addresses & status ───
router.get("/contracts", (_req: Request, res: Response) => {
    res.json({
        chain: "solana",
        network: config.solanaRpcUrl.includes("devnet") ? "devnet" : "mainnet",
        rpc: config.solanaRpcUrl,
        enabled: isChainEnabled(),
        contracts: {
            goalToken: config.goalTokenMint || null,
            arena: PROGRAM_ID.toBase58(),
        },
        explorer: "https://explorer.solana.com",
    });
});

// ─── GET /api/chain/match/:matchId — on-chain match data ───
router.get("/match/:matchId", async (req: Request, res: Response) => {
    try {
        if (!isChainEnabled()) {
            return res.status(503).json({ error: "Chain not configured" });
        }

        const matchId = Number(req.params.matchId);
        const data = await getMarketOnChain(matchId);

        if (!data) {
            return res.status(404).json({ error: "Match not found on-chain" });
        }

        res.json({
            matchId,
            market: data,
        });
    } catch (err: any) {
        console.error("Error reading chain match:", err.message);
        res.status(500).json({ error: "Failed to read on-chain match data" });
    }
});

// ─── GET /api/chain/agent/:address — on-chain agent data ───
router.get("/agent/:address", async (req: Request, res: Response) => {
    try {
        if (!isChainEnabled()) {
            return res.status(503).json({ error: "Chain not configured" });
        }

        const address = req.params.address as string;
        const goalBalance = await getGoalTokenBalance(address);

        res.json({
            address,
            goalBalance,
        });
    } catch (err: any) {
        console.error("Error reading chain agent:", err.message);
        res.status(500).json({ error: "Failed to read on-chain agent data" });
    }
});

// ─── GET /api/chain/stats — arena stats ───
router.get("/stats", async (_req: Request, res: Response) => {
    try {
        if (!isChainEnabled()) {
            return res.status(503).json({ error: "Chain not configured" });
        }

        res.json({
            contracts: {
                goalToken: config.goalTokenMint || null,
                arena: PROGRAM_ID.toBase58(),
            },
        });
    } catch (err: any) {
        console.error("Error reading chain stats:", err.message);
        res.status(500).json({ error: "Failed to read chain stats" });
    }
});

export default router;
