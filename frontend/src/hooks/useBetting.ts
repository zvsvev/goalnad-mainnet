"use client";

import { useState, useCallback } from "react";
import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useWallets } from "@privy-io/react-auth/solana";
import { showToast, updateToast } from "@/components/ui/toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("EPpsfGUp4Na92W6cYFz88X3AuxqsC8q6rveHn29iETrL");
const TREASURY = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "11111111111111111111111111111111");
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

const MIN_BET_SOL = 0.01;

// ─── PDA Helpers ──────────────────────────────────────────────────────────────

// Browser-safe BigInt to little-endian bytes (Buffer polyfill lacks writeBigUInt64LE)
function toBigUInt64LE(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
        buf[i] = Number(value & 0xffn);
        value >>= 8n;
    }
    return buf;
}

function getMarketPDA(matchId: number): [PublicKey, number] {
    const matchIdBuf = toBigUInt64LE(BigInt(matchId));
    return PublicKey.findProgramAddressSync(
        [Buffer.from("market"), matchIdBuf],
        PROGRAM_ID
    );
}

function getBetPDA(matchId: number, user: PublicKey): [PublicKey, number] {
    const matchIdBuf = toBigUInt64LE(BigInt(matchId));
    return PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), matchIdBuf, user.toBuffer()],
        PROGRAM_ID
    );
}

// ─── Anchor Discriminator Helpers ─────────────────────────────────────────────
// Pre-computed discriminators for our instructions (sha256("global:<method_name>")[0..8])
const PLACE_BET_DISC = Buffer.from([222, 62, 67, 220, 63, 166, 126, 33]);
const CLAIM_DISC = Buffer.from([62, 198, 214, 193, 213, 159, 108, 210]);
const REFUND_DISC = Buffer.from([2, 96, 183, 251, 63, 208, 46, 71]);

// ─── Instruction Builders ─────────────────────────────────────────────────────

function buildPlaceBetIx(
    matchId: number,
    outcome: number,
    amountLamports: bigint,
    user: PublicKey
): TransactionInstruction {
    const [marketPDA] = getMarketPDA(matchId);
    const [betPDA] = getBetPDA(matchId, user);

    const data = Buffer.alloc(8 + 8 + 1 + 8);
    PLACE_BET_DISC.copy(data, 0);
    toBigUInt64LE(BigInt(matchId)).copy(data, 8);
    data.writeUInt8(outcome, 16);
    toBigUInt64LE(amountLamports).copy(data, 17);

    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: marketPDA, isSigner: false, isWritable: true },
            { pubkey: betPDA, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    });
}

function buildClaimIx(matchId: number, user: PublicKey): TransactionInstruction {
    const [marketPDA] = getMarketPDA(matchId);
    const [betPDA] = getBetPDA(matchId, user);

    const data = Buffer.alloc(8 + 8);
    CLAIM_DISC.copy(data, 0);
    toBigUInt64LE(BigInt(matchId)).copy(data, 8);

    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: marketPDA, isSigner: false, isWritable: true },
            { pubkey: betPDA, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: TREASURY, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    });
}

function buildRefundIx(matchId: number, user: PublicKey): TransactionInstruction {
    const [marketPDA] = getMarketPDA(matchId);
    const [betPDA] = getBetPDA(matchId, user);

    const data = Buffer.alloc(8 + 8);
    REFUND_DISC.copy(data, 0);
    toBigUInt64LE(BigInt(matchId)).copy(data, 8);

    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: marketPDA, isSigner: false, isWritable: true },
            { pubkey: betPDA, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    });
}

// ─── Transaction Helper ───────────────────────────────────────────────────────

async function signAndSend(
    wallet: any,
    ix: TransactionInstruction
): Promise<string> {
    const connection = new Connection(RPC_URL, "confirmed");
    const userPk = new PublicKey(wallet.address);

    const tx = new Transaction().add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPk;

    // Use wallet standard signAndSendTransaction
    const result = await wallet.sendTransaction(tx, connection);

    // result is a transaction signature string
    const signature = typeof result === "string" ? result : result.signature;
    await connection.confirmTransaction(signature, "confirmed");
    return signature;
}

// ─── usePlaceBet Hook ─────────────────────────────────────────────────────────

export function usePlaceBet() {
    const { wallets } = useWallets();
    const wallet = wallets[0];
    const [loading, setLoading] = useState(false);

    const placeBet = useCallback(
        async (matchId: number, outcome: number, solAmount: number) => {
            if (!wallet) throw new Error("No wallet connected");
            if (solAmount < MIN_BET_SOL) throw new Error(`Minimum bet is ${MIN_BET_SOL} SOL`);

            setLoading(true);
            const toastId = showToast({ type: "loading", message: "Placing bet..." });

            try {
                const userPk = new PublicKey(wallet.address);
                const amountLamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
                const ix = buildPlaceBetIx(matchId, outcome, amountLamports, userPk);

                const signature = await signAndSend(wallet, ix);

                const outcomeLabel = outcome === 0 ? "Home" : outcome === 2 ? "Away" : "Draw";
                updateToast(toastId, {
                    type: "success",
                    message: `Bet placed! ${solAmount} SOL on ${outcomeLabel}`,
                    txHash: signature,
                });

                return signature;
            } catch (err: any) {
                const msg = err.message?.includes("User rejected") || err.message?.includes("cancelled")
                    ? "Transaction cancelled"
                    : err.message || "Failed to place bet";
                updateToast(toastId, { type: "error", message: msg });
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { placeBet, loading, walletAddress: wallet?.address ?? null };
}

// ─── useClaimRefund Hook ──────────────────────────────────────────────────────

export function useClaimRefund() {
    const { wallets } = useWallets();
    const wallet = wallets[0];
    const [loading, setLoading] = useState(false);

    const claim = useCallback(
        async (matchId: number) => {
            if (!wallet) throw new Error("No wallet connected");
            setLoading(true);
            const toastId = showToast({ type: "loading", message: "Claiming winnings..." });

            try {
                const userPk = new PublicKey(wallet.address);
                const ix = buildClaimIx(matchId, userPk);
                const signature = await signAndSend(wallet, ix);

                updateToast(toastId, {
                    type: "success",
                    message: "Winnings claimed!",
                    txHash: signature,
                });
                return signature;
            } catch (err: any) {
                const msg = err.message?.includes("User rejected") || err.message?.includes("cancelled")
                    ? "Transaction cancelled"
                    : err.message || "Failed to claim";
                updateToast(toastId, { type: "error", message: msg });
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    const refund = useCallback(
        async (matchId: number) => {
            if (!wallet) throw new Error("No wallet connected");
            setLoading(true);
            const toastId = showToast({ type: "loading", message: "Processing refund..." });

            try {
                const userPk = new PublicKey(wallet.address);
                const ix = buildRefundIx(matchId, userPk);
                const signature = await signAndSend(wallet, ix);

                updateToast(toastId, {
                    type: "success",
                    message: "Refund received!",
                    txHash: signature,
                });
                return signature;
            } catch (err: any) {
                const msg = err.message?.includes("User rejected") || err.message?.includes("cancelled")
                    ? "Transaction cancelled"
                    : err.message || "Failed to refund";
                updateToast(toastId, { type: "error", message: msg });
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { claim, refund, loading, walletAddress: wallet?.address ?? null };
}
