"use client";

import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { Connection, PublicKey } from "@solana/web3.js";

// ─── Config ─────────────────────────────────────────────────────────────────

/** Minimum $GOAL balance required to view oracle predictions */
export const GOAL_HOLDER_THRESHOLD = 1_000_000;

/** $GOAL SPL Token mint address — update once deployed */
const GOAL_TOKEN_MINT = process.env.NEXT_PUBLIC_GOAL_TOKEN_MINT || "";

/** Solana RPC endpoint */
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

// SPL Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useGoalBalance() {
    const { wallets } = useWallets();
    const walletAddress = wallets[0]?.address ?? null;

    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!walletAddress || !GOAL_TOKEN_MINT) {
            setBalance(0);
            return;
        }

        let cancelled = false;
        setLoading(true);

        async function fetchBalance() {
            try {
                const connection = new Connection(RPC_URL, "confirmed");
                const ownerPk = new PublicKey(walletAddress!);
                const mintPk = new PublicKey(GOAL_TOKEN_MINT);

                // Derive Associated Token Account (ATA)
                const [ata] = PublicKey.findProgramAddressSync(
                    [
                        ownerPk.toBuffer(),
                        TOKEN_PROGRAM_ID.toBuffer(),
                        mintPk.toBuffer(),
                    ],
                    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL") // Associated Token Program
                );

                const accountInfo = await connection.getAccountInfo(ata);
                if (!accountInfo || !cancelled === false) {
                    // No token account = 0 balance
                    if (!cancelled) setBalance(0);
                    return;
                }

                // SPL Token account data: offset 64, 8 bytes LE = token amount
                const data = accountInfo.data;
                const amount = Number(data.readBigUInt64LE(64));

                // Assuming $GOAL has 6 decimals (standard Solana SPL), adjust if different
                const decimals = 6;
                const humanBalance = amount / 10 ** decimals;

                if (!cancelled) setBalance(humanBalance);
            } catch (err) {
                console.error("[useGoalBalance] Error fetching balance:", err);
                if (!cancelled) setBalance(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchBalance();
        return () => { cancelled = true; };
    }, [walletAddress]);

    return {
        balance,
        loading,
        isHolder: balance >= GOAL_HOLDER_THRESHOLD,
        walletAddress,
    };
}
