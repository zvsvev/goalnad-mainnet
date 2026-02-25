/**
 * chain.ts — Solana / Anchor integration for GoalScore
 * Replaces the old viem/Monad chain.ts
 *
 * Program: GoalScoreArena (Anchor 0.32.0)
 * Program ID: EPpsfGUp4Na92W6cYFz88X3AuxqsC8q6rveHn29iETrL
 * Network: Solana devnet (Helius RPC) → mainnet after testing
 */

import {
    Connection,
    Keypair,
    PublicKey,
    LAMPORTS_PER_SOL,
    Transaction,
    SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN, setProvider, web3, Wallet } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { config } from "../config.js";

// ─── Constants ───────────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey("EPpsfGUp4Na92W6cYFz88X3AuxqsC8q6rveHn29iETrL");

// Outcomes (must match contract)
export const OUTCOME_HOME = 0;
export const OUTCOME_DRAW = 1;
export const OUTCOME_AWAY = 2;

// ─── Connection ───────────────────────────────────────────────────────────────
const RPC_URL = config.solanaRpcUrl || "https://api.devnet.solana.com";

export const connection = new Connection(RPC_URL, "confirmed");

// ─── Oracle Keypair (deployer / oracle authority) ─────────────────────────────
function loadOracleKeypair(): Keypair {
    const keypairPath = config.oracleKeypairPath;
    if (!keypairPath) {
        throw new Error("ORACLE_KEYPAIR_PATH not set in config");
    }
    const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ─── Treasury PublicKey ───────────────────────────────────────────────────────
function getTreasuryKey(): PublicKey {
    const addr = config.treasuryAddress;
    if (!addr) throw new Error("TREASURY_ADDRESS not set in config");
    return new PublicKey(addr);
}

// ─── Anchor Program ───────────────────────────────────────────────────────────
let _program: Program | null = null;

function getProgram(): Program {
    if (_program) return _program;

    const oracleKeypair = loadOracleKeypair();
    const wallet = new Wallet(oracleKeypair);
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });
    setProvider(provider);

    // Load IDL from build artifacts
    const idlPath = path.resolve(
        __dirname,
        "../../../goalscore-arena/target/idl/goalscore_arena.json"
    );
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

    _program = new Program(idl, provider);
    return _program;
}

// ─── PDA Helpers ──────────────────────────────────────────────────────────────

export function getMarketPDA(matchId: number): [PublicKey, number] {
    const matchIdBuf = Buffer.alloc(8);
    matchIdBuf.writeBigUInt64LE(BigInt(matchId));
    return PublicKey.findProgramAddressSync(
        [Buffer.from("market"), matchIdBuf],
        PROGRAM_ID
    );
}

export function getBetPDA(matchId: number, userPubkey: PublicKey): [PublicKey, number] {
    const matchIdBuf = Buffer.alloc(8);
    matchIdBuf.writeBigUInt64LE(BigInt(matchId));
    return PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), matchIdBuf, userPubkey.toBuffer()],
        PROGRAM_ID
    );
}

// ─── Read Functions ───────────────────────────────────────────────────────────

export async function getMarketOnChain(matchId: number) {
    try {
        const program = getProgram();
        const [marketPDA] = getMarketPDA(matchId);
        const market = await (program.account as any).market.fetch(marketPDA);
        return market;
    } catch (err: any) {
        if (!err.message?.includes("Account does not exist")) {
            console.error(`[Chain] getMarketOnChain(${matchId}) error:`, err.message);
        }
        return null;
    }
}

export async function getBetOnChain(matchId: number, userAddress: string) {
    try {
        const program = getProgram();
        const userKey = new PublicKey(userAddress);
        const [betPDA] = getBetPDA(matchId, userKey);
        const bet = await (program.account as any).bet.fetch(betPDA);
        return bet;
    } catch {
        return null;
    }
}

/**
 * Get $GOAL token balance for a wallet.
 * Uses SPL token account lookup. Returns 0 if no account exists.
 */
export async function getGoalTokenBalance(walletAddress: string): Promise<number> {
    try {
        const goalMint = config.goalTokenMint;
        if (!goalMint) return 0;

        const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount } = await import("@solana/spl-token");
        const wallet = new PublicKey(walletAddress);
        const mint = new PublicKey(goalMint);
        const ata = await getAssociatedTokenAddress(mint, wallet);
        const account = await getAccount(connection, ata);
        return Number(account.amount);
    } catch {
        return 0;
    }
}

// ─── Write Functions (Oracle Authority) ──────────────────────────────────────

/**
 * Create a match market on-chain.
 * Called by oracle when publishing a prediction.
 */
export async function createMatchOnChain(
    matchId: number,
    kickoffTimestamp: number  // unix seconds
): Promise<string> {
    const program = getProgram();
    const oracleKeypair = loadOracleKeypair();
    const treasury = getTreasuryKey();
    const [marketPDA] = getMarketPDA(matchId);

    const tx = await program.methods
        .createMatch(new BN(matchId), new BN(kickoffTimestamp))
        .accounts({
            market: marketPDA,
            oracle: oracleKeypair.publicKey,
            treasury,
            systemProgram: SystemProgram.programId,
        })
        .signers([oracleKeypair])
        .rpc();

    console.log(`[Chain] createMatch(${matchId}) tx: ${tx}`);
    await connection.confirmTransaction(tx, "confirmed");
    return tx;
}

/**
 * Resolve a match on-chain after it finishes.
 * result: 0 = Home, 1 = Draw, 2 = Away
 */
export async function resolveMatchOnChain(
    matchId: number,
    result: number   // OUTCOME_HOME | OUTCOME_DRAW | OUTCOME_AWAY
): Promise<string> {
    const program = getProgram();
    const oracleKeypair = loadOracleKeypair();
    const [marketPDA] = getMarketPDA(matchId);

    const tx = await program.methods
        .resolveMatch(new BN(matchId), result)
        .accounts({
            market: marketPDA,
            oracle: oracleKeypair.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .signers([oracleKeypair])
        .rpc();

    console.log(`[Chain] resolveMatch(${matchId}, result=${result}) tx: ${tx}`);
    await connection.confirmTransaction(tx, "confirmed");
    return tx;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function lamportsToSol(lamports: number | bigint): number {
    return Number(lamports) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function isChainEnabled(): boolean {
    return !!(config.oracleKeypairPath && config.treasuryAddress && config.solanaRpcUrl);
}

export { PROGRAM_ID as ARENA };
