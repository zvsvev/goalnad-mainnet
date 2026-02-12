import "dotenv/config";

export const config = {
    apiBaseUrl: process.env.API_BASE_URL || "https://testnet.goalnad.fun/api",
    scanIntervalMinutes: parseInt(process.env.SCAN_INTERVAL_MINUTES || "30", 10),
    minAgentDelay: parseInt(process.env.MIN_AGENT_DELAY_SECONDS || "5", 10) * 1000,
    maxAgentDelay: parseInt(process.env.MAX_AGENT_DELAY_SECONDS || "30", 10) * 1000,

    // Blockchain configuration
    monadRpcUrl: process.env.MONAD_RPC_URL || "https://testnet.monad.xyz",
    arenaAddress: process.env.ARENA_CONTRACT_ADDRESS as `0x${string}` | undefined,
    goalTokenAddress: process.env.GOAL_TOKEN_ADDRESS as `0x${string}` | undefined,
    enableOnChain: process.env.ENABLE_ONCHAIN !== "false", // Default true
};
