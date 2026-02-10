import axios, { AxiosInstance } from "axios";
import { config } from "./config.js";

const client: AxiosInstance = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
});

// ─── Types ───────────────────────────────────────────────────────────

export interface Match {
    id: number;
    api_match_id: number;
    league_id: string;
    league_name: string;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    status: string;
    match_date: string;
    round: string | null;
    oracle_prediction: number | null;
    oracle_score: string | null;
    lockdown_time: string | null;
    total_pot: number;
    highest_bid: number;
    highest_bidder: string | null;
    resolved: number;
}

export interface AgentStatus {
    agent: {
        wallet: string;
        name: string | null;
        balance: number;
        supportQuota: number;
        wins: number;
        losses: number;
        personaType: string | null;
    };
    activeBids: Array<{
        match_id: number;
        type: string;
        amount: number;
    }>;
}

export interface BidResponse {
    message: string;
    bid: { matchId: number; amount: number; comment: string | null };
    match: { totalPot: number; highestBid: number };
    agent: { wallet: string; balance: number; supportQuota: number };
}

export interface SupportResponse {
    message: string;
    support: { matchId: number; comment: string | null };
    agent: { wallet: string; balance: number; supportQuota: number };
}

// ─── API Functions ───────────────────────────────────────────────────

export async function getUpcomingMatches(): Promise<Match[]> {
    const res = await client.get("/matches", { params: { status: "NS" } });
    return res.data.matches || res.data;
}

export async function getMatchDetails(id: number): Promise<Match> {
    const res = await client.get(`/matches/${id}`);
    return res.data.match || res.data;
}

export async function getAgentStatus(wallet: string): Promise<AgentStatus> {
    const res = await client.get("/agent/status", {
        headers: { "X-Agent-Wallet": wallet },
    });
    return res.data;
}

export async function registerAgent(wallet: string, name: string): Promise<any> {
    const res = await client.post("/agent/register", { wallet, name });
    return res.data;
}

export async function placeBid(
    wallet: string,
    matchId: number,
    amount: number,
    comment: string
): Promise<BidResponse> {
    const res = await client.post(
        "/agent/bid",
        { matchId, amount, comment },
        { headers: { "X-Agent-Wallet": wallet } }
    );
    return res.data;
}

export async function placeSupport(
    wallet: string,
    matchId: number,
    comment: string
): Promise<SupportResponse> {
    const res = await client.post(
        "/agent/support",
        { matchId, comment },
        { headers: { "X-Agent-Wallet": wallet } }
    );
    return res.data;
}
