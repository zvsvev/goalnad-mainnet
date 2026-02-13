import { Router, Request, Response } from "express";
import { config } from "../config.js";
import {
    isChainEnabled,
    getMatchOnChain,
    getSupporters,
    getGoalBalance,
    getSupportQuota,
    getNextMatchId,
    formatEther,
    GOAL_TOKEN,
    ARENA,
} from "../services/chain.js";
import type { Address } from "viem";

const router = Router();

// ─── GET /api/chain/contracts — contract addresses & status ───
router.get("/contracts", (_req: Request, res: Response) => {
    res.json({
        chain: "monad",
        chainId: 143, // Monad mainnet
        rpc: config.monadRpcUrl,
        enabled: isChainEnabled(),
        contracts: {
            goalToken: config.goalTokenAddress || null,
            arena: config.arenaAddress || null,
        },
        explorer: "https://monadscan.com",
    });
});

// ─── GET /api/chain/match/:matchId — on-chain match data ───
router.get("/match/:matchId", async (req: Request, res: Response) => {
    try {
        if (!isChainEnabled()) {
            return res.status(503).json({ error: "Chain not configured" });
        }

        const matchId = BigInt(req.params.matchId as string);
        const data = await getMatchOnChain(matchId) as any;

        if (!data) {
            return res.status(404).json({ error: "Match not found on-chain" });
        }

        const supporters = await getSupporters(matchId);

        res.json({
            matchId: Number(matchId),
            apiMatchId: Number(data.apiMatchId),
            oraclePrediction: data.oraclePrediction,
            lockdownTime: Number(data.lockdownTime),
            highestBid: formatEther(data.highestBid),
            highestBidder: data.highestBidder,
            totalPot: formatEther(data.totalPot),
            result: data.result,
            resolved: data.resolved,
            cancelled: data.cancelled,
            supporterCount: Number(data.supporterCount),
            bidderCount: Number(data.bidderCount),
            supporters,
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

        const address = req.params.address as Address;
        const [balance, quota] = await Promise.all([
            getGoalBalance(address),
            getSupportQuota(address),
        ]);

        res.json({
            address,
            goalBalance: balance,
            supportQuota: Number(quota),
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

        const nextMatchId = await getNextMatchId();

        res.json({
            totalMatchesPublished: Number(nextMatchId),
            contracts: {
                goalToken: config.goalTokenAddress,
                arena: config.arenaAddress,
            },
        });
    } catch (err: any) {
        console.error("Error reading chain stats:", err.message);
        res.status(500).json({ error: "Failed to read chain stats" });
    }
});

export default router;
