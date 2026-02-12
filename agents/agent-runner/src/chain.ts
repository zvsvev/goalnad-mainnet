import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    formatEther,
    type PublicClient,
    type WalletClient,
    type Address,
    type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";
import GoalTokenABI from "./contracts/GoalToken.abi.json";
import GoalNadArenaABI from "./contracts/GoalNadArena.abi.json";

// ─── Monad Testnet Chain Definition ─────────────────────────────────
const monadTestnet: Chain = {
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: {
        default: { http: [config.monadRpcUrl] },
    },
    blockExplorers: {
        default: { name: "MonadExplorer", url: "https://testnet.monadexplorer.com" },
    },
};

// ─── Public Client (Read-Only) ──────────────────────────────────────
const transport = http(config.monadRpcUrl);

export const publicClient: PublicClient = createPublicClient({
    chain: monadTestnet,
    transport,
}) as PublicClient;

// ─── Helper: Create Wallet Client ───────────────────────────────────
function createAgentWalletClient(privateKey: `0x${string}`): WalletClient {
    const account = privateKeyToAccount(privateKey);
    return createWalletClient({
        account,
        chain: monadTestnet,
        transport,
    });
}

// ─── Contract Addresses ─────────────────────────────────────────────
function getArenaAddress(): Address {
    if (!config.arenaAddress) {
        throw new Error("ARENA_CONTRACT_ADDRESS not configured");
    }
    return config.arenaAddress;
}

function getGoalTokenAddress(): Address {
    if (!config.goalTokenAddress) {
        throw new Error("GOAL_TOKEN_ADDRESS not configured");
    }
    return config.goalTokenAddress;
}

// ─── Read Functions (Public Client) ─────────────────────────────────

/**
 * Get agent's $GOAL token balance
 */
export async function getGoalBalance(agentAddress: Address): Promise<bigint> {
    try {
        const result = await publicClient.readContract({
            address: getGoalTokenAddress(),
            abi: GoalTokenABI,
            functionName: "balanceOf",
            args: [agentAddress],
        });
        return result as bigint;
    } catch (err: any) {
        console.error(`[Chain] Error reading GOAL balance for ${agentAddress}:`, err.message);
        return 0n;
    }
}

/**
 * Get agent's support quota from arena contract
 */
export async function getSupportQuota(agentAddress: Address): Promise<bigint> {
    try {
        const result = await publicClient.readContract({
            address: getArenaAddress(),
            abi: GoalNadArenaABI,
            functionName: "supportQuota",
            args: [agentAddress],
        });
        return result as bigint;
    } catch (err: any) {
        console.error(`[Chain] Error reading support quota for ${agentAddress}:`, err.message);
        return 0n;
    }
}

/**
 * Get agent's bid amount for a specific match
 */
export async function getBidAmount(matchId: bigint, agentAddress: Address): Promise<bigint> {
    try {
        const result = await publicClient.readContract({
            address: getArenaAddress(),
            abi: GoalNadArenaABI,
            functionName: "bids",
            args: [matchId, agentAddress],
        });
        return result as bigint;
    } catch (err: any) {
        console.error(`[Chain] Error reading bid amount:`, err.message);
        return 0n;
    }
}

/**
 * Check if agent has already bid on a match
 */
export async function hasBid(matchId: bigint, agentAddress: Address): Promise<boolean> {
    try {
        const result = await publicClient.readContract({
            address: getArenaAddress(),
            abi: GoalNadArenaABI,
            functionName: "hasBid",
            args: [matchId, agentAddress],
        });
        return result as boolean;
    } catch (err: any) {
        console.error(`[Chain] Error checking hasBid:`, err.message);
        return false;
    }
}

/**
 * Check if agent has already supported a match
 */
export async function hasSupported(matchId: bigint, agentAddress: Address): Promise<boolean> {
    try {
        const result = await publicClient.readContract({
            address: getArenaAddress(),
            abi: GoalNadArenaABI,
            functionName: "hasSupported",
            args: [matchId, agentAddress],
        });
        return result as boolean;
    } catch (err: any) {
        console.error(`[Chain] Error checking hasSupported:`, err.message);
        return false;
    }
}

// ─── Write Functions (Agent Wallet Client) ──────────────────────────

/**
 * Place a challenge bid on-chain
 * @param agentPrivateKey Agent's private key (must have MON for gas + $GOAL for bid)
 * @param matchId Arena match ID (not API match ID)
 * @param amount Bid amount in $GOAL (will be converted to wei)
 * @returns Transaction hash
 */
export async function placeBidOnChain(
    agentPrivateKey: `0x${string}`,
    matchId: bigint,
    amount: bigint
): Promise<string> {
    const walletClient = createAgentWalletClient(agentPrivateKey);
    const account = walletClient.account!;

    // Step 1: Approve $GOAL token spending
    console.log(`[Chain] Approving ${formatEther(amount)} $GOAL for Arena contract...`);
    const approveHash = await walletClient.writeContract({
        account,
        chain: monadTestnet,
        address: getGoalTokenAddress(),
        abi: GoalTokenABI,
        functionName: "approve",
        args: [getArenaAddress(), amount],
    });

    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log(`[Chain] Approval confirmed: ${approveHash}`);

    // Step 2: Place bid on arena
    console.log(`[Chain] Placing bid of ${formatEther(amount)} $GOAL on match ${matchId}...`);
    const bidHash = await walletClient.writeContract({
        account,
        chain: monadTestnet,
        address: getArenaAddress(),
        abi: GoalNadArenaABI,
        functionName: "bid",
        args: [matchId, amount],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: bidHash });
    console.log(`[Chain] Bid confirmed in block ${receipt.blockNumber}: ${bidHash}`);

    return bidHash;
}

/**
 * Support the Oracle's prediction on-chain
 * @param agentPrivateKey Agent's private key (must have MON for gas + support quota)
 * @param matchId Arena match ID (not API match ID)
 * @returns Transaction hash
 */
export async function placeSupportOnChain(
    agentPrivateKey: `0x${string}`,
    matchId: bigint
): Promise<string> {
    const walletClient = createAgentWalletClient(agentPrivateKey);
    const account = walletClient.account!;

    console.log(`[Chain] Supporting Oracle on match ${matchId}...`);
    const hash = await walletClient.writeContract({
        account,
        chain: monadTestnet,
        address: getArenaAddress(),
        abi: GoalNadArenaABI,
        functionName: "support",
        args: [matchId],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[Chain] Support confirmed in block ${receipt.blockNumber}: ${hash}`);

    return hash;
}

// ─── Utility Functions ──────────────────────────────────────────────

/**
 * Check if on-chain mode is enabled and properly configured
 */
export function isChainEnabled(): boolean {
    return config.enableOnChain && !!config.arenaAddress && !!config.goalTokenAddress;
}

/**
 * Convert $GOAL amount to wei (18 decimals)
 */
export function goalToWei(amount: number): bigint {
    return parseEther(amount.toString());
}

/**
 * Convert wei to $GOAL amount (18 decimals)
 */
export function weiToGoal(amount: bigint): string {
    return formatEther(amount);
}

export { formatEther, parseEther };
