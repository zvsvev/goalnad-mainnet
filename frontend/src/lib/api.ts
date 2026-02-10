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
