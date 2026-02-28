import { NextResponse } from "next/server";

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
// Goal Token Mint (update when deployed on mainnet)
const GOAL_MINT = process.env.NEXT_PUBLIC_GOAL_TOKEN_MINT || "AinZf6mvHp2eoJq2WQZc5UEUAMfTkqRVkkiFE3DF9uPV";
// Standard Solana burn address / incinerator
const BURN_ADDRESS = "1nc1nerator11111111111111111111111111111111";

export const revalidate = 60; // cache for 60 seconds

export async function GET() {
    try {
        const res = await fetch(SOLANA_RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getTokenAccountsByOwner",
                params: [
                    BURN_ADDRESS,
                    { mint: GOAL_MINT },
                    { encoding: "jsonParsed" },
                ],
            }),
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: "RPC request failed" },
                { status: 502 }
            );
        }

        const json = await res.json();

        if (json.error) {
            return NextResponse.json(
                { error: json.error.message || "RPC error" },
                { status: 502 }
            );
        }

        const accounts = json.result?.value || [];

        let totalBurned = 0;
        let decimals = 6; // Standard SPL decimals, often 6 or 9

        for (const account of accounts) {
            const tokenAmount = account.account.data.parsed.info.tokenAmount;
            totalBurned += Number(tokenAmount.uiAmount || 0);
            decimals = tokenAmount.decimals;
        }

        return NextResponse.json({
            burned: totalBurned.toLocaleString("en-US", { maximumFractionDigits: 2 }),
            raw: totalBurned.toString(),
            burnAddress: BURN_ADDRESS,
            tokenMint: GOAL_MINT,
        });
    } catch (err) {
        console.error("Failed to fetch burn stats:", err);
        return NextResponse.json(
            { error: "Failed to fetch burn stats" },
            { status: 500 }
        );
    }
}
