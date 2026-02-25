import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || "3001", 10),
    footballDataToken: process.env.FOOTBALL_DATA_TOKEN || "",
    footballDataBaseUrl: "http://api.football-data.org/v4",
    dbPath: process.env.DB_PATH || "./data/goalscore.db",

    // Target leagues (football-data.org competition codes)
    leagues: {
        EPL: { code: "PL", name: "Premier League", shortName: "EPL" },
        SERIE_A: { code: "SA", name: "Serie A", shortName: "Serie A" },
        LA_LIGA: { code: "PD", name: "La Liga", shortName: "La Liga" },
        BUNDESLIGA: { code: "BL1", name: "Bundesliga", shortName: "Bundesliga" },
    },

    // ─── Solana (On-Chain) ───────────────────────────────────────────
    solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    oracleKeypairPath: process.env.ORACLE_KEYPAIR_PATH || "",
    treasuryAddress: process.env.TREASURY_ADDRESS || "",
    goalTokenMint: process.env.GOAL_TOKEN_MINT || "",  // SPL token mint address (after pump.fun launch)

    // ─── Oracle Gating ───────────────────────────────────────────────
    // Minimum $GOAL tokens (raw, no decimals) required to see oracle predictions
    // Change this in .env without redeployment
    oracleGateMinimum: parseInt(process.env.ORACLE_GATE_MINIMUM || "100000", 10),

    // ─── Privy ──────────────────────────────────────────────────────
    privyAppId: process.env.PRIVY_APP_ID || "cmm1k9mbf001m0bky2uzpj9wi",
    privyAppSecret: process.env.PRIVY_APP_SECRET || "",

    // ─── OpenAI ─────────────────────────────────────────────────────
    openaiApiKey: process.env.OPENAI_API_KEY || "",
};
