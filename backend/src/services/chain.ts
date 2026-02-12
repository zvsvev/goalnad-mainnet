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
import { config } from "../config.js";
import GoalTokenABI from "../contracts/GoalToken.abi.json";
import GoalNadArenaABI from "../contracts/GoalNadArena.abi.json";

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

// ─── Clients ────────────────────────────────────────────────────────
const transport = http(config.monadRpcUrl);

export const publicClient: PublicClient = createPublicClient({
    chain: monadTestnet,
    transport,
}) as PublicClient;

let walletClient: WalletClient | null = null;
let adminAccount: ReturnType<typeof privateKeyToAccount> | null = null;

function getAdminAccount() {
    if (!adminAccount) {
        if (!config.adminPrivateKey) {
            throw new Error("ADMIN_PRIVATE_KEY not configured — on-chain writes disabled");
        }
        adminAccount = privateKeyToAccount(config.adminPrivateKey as `0x${string}`);
    }
    return adminAccount;
}

function getWalletClient(): WalletClient {
    if (!walletClient) {
        walletClient = createWalletClient({
            account: getAdminAccount(),
            chain: monadTestnet,
            transport,
        });
    }
    return walletClient;
}

// ─── Contract Addresses ─────────────────────────────────────────────
const GOAL_TOKEN = config.goalTokenAddress as Address;
const ARENA = config.arenaAddress as Address;

// ─── Read Functions (Public Client) ─────────────────────────────────

export async function getMatchOnChain(matchId: bigint) {
    try {
        const result = await publicClient.readContract({
            address: ARENA,
            abi: GoalNadArenaABI,
            functionName: "getMatchFull",
            args: [matchId],
        });
        return result;
    } catch (err: any) {
        console.error(`Chain read error (getMatchFull ${matchId}):`, err.message);
        return null;
    }
}

export async function getSupporters(matchId: bigint): Promise<Address[]> {
    try {
        const result = await publicClient.readContract({
            address: ARENA,
            abi: GoalNadArenaABI,
            functionName: "getSupporters",
            args: [matchId],
        });
        return result as Address[];
    } catch {
        return [];
    }
}

export async function getBidAmount(matchId: bigint, agent: Address): Promise<bigint> {
    try {
        const result = await publicClient.readContract({
            address: ARENA,
            abi: GoalNadArenaABI,
            functionName: "bids",
            args: [matchId, agent],
        });
        return result as bigint;
    } catch {
        return 0n;
    }
}

export async function getSupportQuota(agent: Address): Promise<bigint> {
    try {
        const result = await publicClient.readContract({
            address: ARENA,
            abi: GoalNadArenaABI,
            functionName: "supportQuota",
            args: [agent],
        });
        return result as bigint;
    } catch {
        return 0n;
    }
}

export async function getGoalBalance(agent: Address): Promise<string> {
    try {
        const result = await publicClient.readContract({
            address: GOAL_TOKEN,
            abi: GoalTokenABI,
            functionName: "balanceOf",
            args: [agent],
        });
        return formatEther(result as bigint);
    } catch {
        return "0";
    }
}

export async function getNextMatchId(): Promise<bigint> {
    try {
        const result = await publicClient.readContract({
            address: ARENA,
            abi: GoalNadArenaABI,
            functionName: "nextMatchId",
        });
        return result as bigint;
    } catch {
        return 0n;
    }
}

// ─── Write Functions (Admin Wallet Client) ──────────────────────────

export async function publishPredictionOnChain(
    apiMatchId: number,
    prediction: number,
    exactScore: string,
    comment: string,
    lockdownTime: number
): Promise<{ txHash: string; onchainMatchId: bigint }> {
    const client = getWalletClient();
    const account = getAdminAccount();

    // Read nextMatchId BEFORE the tx to know which ID will be assigned
    const onchainMatchId = await getNextMatchId();

    const hash = await client.writeContract({
        account,
        chain: monadTestnet,
        address: ARENA,
        abi: GoalNadArenaABI,
        functionName: "publishPrediction",
        args: [BigInt(apiMatchId), prediction, exactScore, comment, BigInt(lockdownTime)],
    });

    console.log(`[Chain] publishPrediction tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
        throw new Error(`Transaction reverted: ${hash}`);
    }

    console.log(`[Chain] publishPrediction confirmed in block ${receipt.blockNumber}, onchainMatchId=${onchainMatchId}`);
    return { txHash: hash, onchainMatchId };
}

export async function resolveMatchOnChain(
    matchId: bigint,
    result: number,
    luckySupporter: Address
): Promise<string> {
    const client = getWalletClient();
    const account = getAdminAccount();

    const hash = await client.writeContract({
        account,
        chain: monadTestnet,
        address: ARENA,
        abi: GoalNadArenaABI,
        functionName: "resolveMatch",
        args: [matchId, result, luckySupporter],
    });

    console.log(`[Chain] resolveMatch tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[Chain] resolveMatch confirmed in block ${receipt.blockNumber}`);
    return hash;
}

export async function cancelMatchOnChain(matchId: bigint): Promise<string> {
    const client = getWalletClient();
    const account = getAdminAccount();

    const hash = await client.writeContract({
        account,
        chain: monadTestnet,
        address: ARENA,
        abi: GoalNadArenaABI,
        functionName: "cancelMatch",
        args: [matchId],
    });

    console.log(`[Chain] cancelMatch tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[Chain] cancelMatch confirmed in block ${receipt.blockNumber}`);
    return hash;
}

// NOTE: bidOnBehalf / supportOnBehalf relay functions removed.
// Agents now sign their own bid() / support() transactions directly.
// On-chain events are synced to DB by the indexer.


// ─── Utility ────────────────────────────────────────────────────────

export function isChainEnabled(): boolean {
    return !!(config.goalTokenAddress && config.arenaAddress && config.adminPrivateKey);
}

export { GOAL_TOKEN, ARENA, formatEther, parseEther };
