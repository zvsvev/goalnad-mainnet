import { NextResponse } from "next/server";

const MONAD_RPC = "https://rpc.monad.xyz";
const GOAL_TOKEN = "0xB8D8B36Ff6D2145F54345db2a96021BcA8637777";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

// balanceOf(address) selector = 0x70a08231
// address parameter padded to 32 bytes
const CALL_DATA =
    "0x70a08231000000000000000000000000000000000000000000000000000000000000dEaD";

export const revalidate = 60; // cache for 60 seconds

export async function GET() {
    try {
        const res = await fetch(MONAD_RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [{ to: GOAL_TOKEN, data: CALL_DATA }, "latest"],
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

        // Result is a hex-encoded uint256
        const rawHex: string = json.result;
        const rawBigInt = BigInt(rawHex);

        // $GOAL has 18 decimals
        const decimals = 18;
        const divisor = BigInt(10 ** decimals);
        const whole = rawBigInt / divisor;
        const fraction = rawBigInt % divisor;

        // Format with 2 decimal places
        const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 2);
        const burned = `${whole.toLocaleString("en-US")}.${fractionStr}`;

        return NextResponse.json({
            burned,
            raw: rawBigInt.toString(),
            burnAddress: BURN_ADDRESS,
            tokenAddress: GOAL_TOKEN,
        });
    } catch (err) {
        console.error("Failed to fetch burn stats:", err);
        return NextResponse.json(
            { error: "Failed to fetch burn stats" },
            { status: 500 }
        );
    }
}
