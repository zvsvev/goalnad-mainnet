const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
// Strip trailing /api or /api/ to prevent double-prefix
const API_URL = RAW_URL.replace(/\/api\/?$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

/** Outcome constants matching the smart contract */
export const OUTCOME_HOME = 0;
export const OUTCOME_DRAW = 1;
export const OUTCOME_AWAY = 2;

export type Outcome = 0 | 1 | 2;

export function outcomeName(o: number | null | undefined): string {
  if (o === OUTCOME_HOME) return "Home";
  if (o === OUTCOME_DRAW) return "Draw";
  if (o === OUTCOME_AWAY) return "Away";
  return "—";
}

export function outcomeColor(o: number | null | undefined): string {
  if (o === OUTCOME_HOME) return "text-blue-400";
  if (o === OUTCOME_DRAW) return "text-yellow-400";
  if (o === OUTCOME_AWAY) return "text-red-400";
  return "text-muted-foreground";
}

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
  // Oracle prediction
  oracle_prediction: Outcome | null; // 0=Home, 1=Draw, 2=Away
  oracle_score: string | null;
  oracle_analysis: string | null;
  oracle_conviction: number | null;
  oracle_tx_hash: string | null;
  kickoff_time: string | null;
  // On-chain market state
  total_pot: number | null;        // in lamports
  total_home: number | null;
  total_draw: number | null;
  total_away: number | null;
  resolved: number | null;         // 0 or 1
  result: Outcome | null;          // 0=Home, 1=Draw, 2=Away
  resolve_tx_hash: string | null;
}

export interface ApiBet {
  user_wallet: string;
  outcome: Outcome;
  amount: number;             // lamports
  claimed: boolean;
  refunded: boolean;
  tx_hash: string | null;
  created_at: string;
}

export interface ApiUserProfile {
  wallet: string;
  username: string | null;
  avatar_seed: string;
  avatar_url: string | null;
  email: string | null;
  referral_code: string | null;
  privy_id: string | null;
  created_at: string;
  stats: {
    total_bets: number;
    wins: number;
    losses: number;
    draws: number;
    win_rate: number;
    total_wagered: number; // lamports
    total_claimed: number; // lamports
  };
  recent_bets: Array<{
    api_match_id: number;
    home_team: string;
    away_team: string;
    match_date: string;
    league_id: string;
    outcome: Outcome;
    amount: number;
    claimed: boolean;
    refunded: boolean;
    result: Outcome | null;
    resolved: number;
  }>;
}

export interface PnlEntry {
  date: string;
  pnl: number; // lamports, cumulative
}

export interface ReferralInfo {
  referral_code: string | null;
  referred_count: number;
  referral_link: string | null;
}

// ─── Match Fetchers ───────────────────────────────────────────────────────────

export async function fetchMatches(params?: {
  league?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  predicted?: string;
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

export async function fetchMatchBets(matchId: number): Promise<ApiBet[]> {
  const res = await fetch(`${API_URL}/api/matches/${matchId}/bets`, { cache: "no-store" });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.bets;
}

// ─── User / Profile ───────────────────────────────────────────────────────────

export async function fetchUserProfile(walletOrUsername: string): Promise<ApiUserProfile | null> {
  const res = await fetch(`${API_URL}/api/users/${walletOrUsername}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function claimUsername(wallet: string, username: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/api/users/claim-username`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, username }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error };
  return { success: true };
}

export async function updateAvatar(wallet: string, avatarSeed: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/users/update-avatar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, avatarSeed }),
  });
  return res.json();
}

export async function updateEmail(wallet: string, email: string | null): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/api/users/update-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, email }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error };
  return { success: true };
}

export async function uploadAvatar(wallet: string, avatarData: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/api/users/upload-avatar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, avatarData }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error };
  return { success: true };
}

export async function fetchPnl(wallet: string): Promise<PnlEntry[]> {
  const res = await fetch(`${API_URL}/api/users/${wallet}/pnl`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.pnl;
}

export async function fetchReferral(wallet: string): Promise<ReferralInfo> {
  const res = await fetch(`${API_URL}/api/users/${wallet}/referral`, { cache: "no-store" });
  if (!res.ok) return { referral_code: null, referred_count: 0, referral_link: null };
  return res.json();
}

export interface LeaderboardEntry {
  wallet: string;
  total_bets: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_wagered: number; // lamports
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_URL}/api/leaderboard`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.players;
}

// ─── Oracle Prediction (gated) ────────────────────────────────────────────────

export interface OraclePrediction {
  match_id: number;
  outcome: Outcome;
  score: string;
  analysis: string;
  conviction: number;
  tx_hash: string | null;
}

export async function fetchOraclePrediction(
  matchId: number,
  authToken?: string
): Promise<OraclePrediction | null> {
  const headers: Record<string, string> = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${API_URL}/api/oracle/${matchId}`, {
    headers,
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) return null; // gated
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── Bet placement ────────────────────────────────────────────────────────────

export async function placeBetApi(params: {
  matchId: number;
  outcome: Outcome;
  amountLamports: number;
  userWallet: string;
  signedTx: string; // base64 serialized signed transaction
}): Promise<{ txHash: string }> {
  const res = await fetch(`${API_URL}/api/bets/place`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function lamportsToSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4).replace(/\.?0+$/, "");
}

export function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol >= 1) return sol.toFixed(2) + " SOL";
  return (sol * 1000).toFixed(1) + " mSOL";
}
