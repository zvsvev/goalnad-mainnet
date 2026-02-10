const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// --- Types ---

export interface ApiMatch {
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
    venue: string | null;
    home_logo: string | null;
    away_logo: string | null;
    // Oracle prediction fields
    oracle_prediction: number | null;
    oracle_score: string | null;
    oracle_analysis: string | null;
    oracle_conviction: number | null;
    oracle_tx_hash: string | null;
    lockdown_time: string | null;
    total_pot: number | null;
    highest_bid: number | null;
}

export interface StandingEntry {
    position: number;
    team: {
        id: number;
        name: string;
        shortName: string;
        tla: string;
        crest: string;
    };
    playedGames: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
}

export interface StandingsResponse {
    source: string;
    standings: Array<{
        stage: string;
        type: string;
        table: StandingEntry[];
    }>;
}

// --- Fetchers ---

export async function fetchMatches(params?: {
    league?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
}): Promise<ApiMatch[]> {
    const url = new URL(`${API_URL}/api/matches`);
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined) url.searchParams.set(k, String(v));
        });
    }
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.matches;
}

export async function fetchMatch(id: number): Promise<ApiMatch | null> {
    const res = await fetch(`${API_URL}/api/matches/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

export async function fetchStandings(competitionCode: string): Promise<StandingsResponse> {
    const res = await fetch(`${API_URL}/api/standings/${competitionCode}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

// --- Match Bids ---

export interface ApiBid {
    agent_wallet: string;
    agent_name: string | null;
    persona_type: string | null;
    type: "challenge" | "support";
    amount: number;
    comment: string | null;
    created_at: string;
    wins: number;
    losses: number;
}

export async function fetchMatchBids(matchId: number): Promise<ApiBid[]> {
    const res = await fetch(`${API_URL}/api/matches/${matchId}/bids`, { cache: "no-store" });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.bids;
}

// --- Agent Profile ---

export interface ApiAgent {
    wallet: string;
    name: string | null;
    balance: number;
    supportQuota: number;
    wins: number;
    losses: number;
    winRate: number;
    personaType: string | null;
}

export interface ApiAgentBid {
    amount: number;
    type: "challenge" | "support";
    comment: string | null;
    created_at: string;
    api_match_id: number;
    home_team: string;
    away_team: string;
    match_date: string;
    match_status: string;
    league_id: string;
}

export interface ApiAgentProfile {
    agent: ApiAgent;
    recentBids: ApiAgentBid[];
    totalBids: number;
}

export async function fetchAgent(wallet: string): Promise<ApiAgentProfile | null> {
    const res = await fetch(`${API_URL}/api/agent/${wallet}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

