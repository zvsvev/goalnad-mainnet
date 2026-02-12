import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || "3001", 10),
    footballDataToken: process.env.FOOTBALL_DATA_TOKEN || "",
    footballDataBaseUrl: "http://api.football-data.org/v4",
    dbPath: process.env.DB_PATH || "./data/goalnad.db",

    // Target leagues (football-data.org competition codes)
    leagues: {
        EPL: { code: "PL", name: "Premier League", shortName: "EPL" },
        SERIE_A: { code: "SA", name: "Serie A", shortName: "Serie A" },
    },

    // ─── Monad (On-Chain) ───
    monadRpcUrl: process.env.MONAD_RPC_URL || "https://rpc.monad.xyz",
    goalTokenAddress: process.env.GOAL_TOKEN_ADDRESS || "",
    arenaAddress: process.env.ARENA_ADDRESS || "",
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || "",
};
