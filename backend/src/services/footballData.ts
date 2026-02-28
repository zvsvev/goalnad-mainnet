import axios, { AxiosInstance } from "axios";
import { config } from "../config.js";

// football-data.org v4 API client
const client: AxiosInstance = axios.create({
    baseURL: config.footballDataBaseUrl,
    headers: {
        "X-Auth-Token": config.footballDataToken,
    },
    timeout: 15000,
});

// --- Types ---

export interface FDMatch {
    id: number;
    competition: { id: number; name: string; code: string; emblem: string };
    season: { id: number; startDate: string; endDate: string; currentMatchday: number };
    utcDate: string;
    status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED, CANCELLED, SUSPENDED, AWARDED
    matchday: number;
    stage: string;
    homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
    awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
    score: {
        winner: string | null;
        duration: string;
        fullTime: { home: number | null; away: number | null };
        halfTime: { home: number | null; away: number | null };
    };
    referees: Array<{ id: number; name: string; nationality: string }>;
}

export interface FDStanding {
    stage: string;
    type: string;
    table: Array<{
        position: number;
        team: { id: number; name: string; shortName: string; tla: string; crest: string };
        playedGames: number;
        won: number;
        draw: number;
        lost: number;
        points: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
    }>;
}

// --- API Methods ---

export async function getMatches(
    competitionCode: string,
    filters?: { status?: string; dateFrom?: string; dateTo?: string; matchday?: number }
): Promise<FDMatch[]> {
    const params: Record<string, string | number> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.matchday) params.matchday = filters.matchday;

    const res = await client.get(`/competitions/${competitionCode}/matches`, { params });
    return res.data.matches || [];
}

export async function getMatch(matchId: number): Promise<FDMatch | null> {
    try {
        const res = await client.get(`/matches/${matchId}`);
        return res.data;
    } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
    }
}

export async function getStandings(competitionCode: string): Promise<FDStanding[]> {
    const res = await client.get(`/competitions/${competitionCode}/standings`);
    return res.data.standings || [];
}

export interface FDH2H {
    numberOfMatches: number;
    totalGoals: number;
    homeTeam: { id: number; wins: number; draws: number; losses: number };
    awayTeam: { id: number; wins: number; draws: number; losses: number };
    matches: FDMatch[];
}

export async function getHeadToHead(matchId: number, limit = 5): Promise<FDH2H | null> {
    try {
        const res = await client.get(`/matches/${matchId}/head2head`, {
            params: { limit },
        });
        return {
            numberOfMatches: res.data.aggregates?.numberOfMatches || 0,
            totalGoals: res.data.aggregates?.totalGoals || 0,
            homeTeam: res.data.aggregates?.homeTeam || { id: 0, wins: 0, draws: 0, losses: 0 },
            awayTeam: res.data.aggregates?.awayTeam || { id: 0, wins: 0, draws: 0, losses: 0 },
            matches: res.data.matches || [],
        };
    } catch (err: any) {
        if (err.response?.status === 404 || err.response?.status === 400) return null;
        console.error(`Error fetching H2H for match ${matchId}:`, err.message);
        return null;
    }
}
