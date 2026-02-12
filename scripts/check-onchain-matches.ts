// Check on-chain match state
import { createPublicClient, http, formatEther } from 'viem';
import { monadDevnet } from 'viem/chains';

const client = createPublicClient({
    chain: monadDevnet,
    transport: http(process.env.MONAD_RPC_URL || 'https://testnet.monad.xyz'),
});

const ARENA_ADDRESS = '0x9433318CCF0d6f36a29B1Eb6604bA7cE832632db';

// Minimal ABI for reading match data
const ABI = [
    {
        inputs: [{ name: 'matchId', type: 'uint256' }],
        name: 'matches',
        outputs: [
            { name: 'apiMatchId', type: 'uint256' },
            { name: 'prediction', type: 'uint8' },
            { name: 'exactScore', type: 'string' },
            { name: 'lockdownTime', type: 'uint256' },
            { name: 'totalPot', type: 'uint256' },
            { name: 'highestBid', type: 'uint256' },
            { name: 'highestBidder', type: 'address' },
            { name: 'resolved', type: 'bool' },
            { name: 'cancelled', type: 'bool' },
            { name: 'result', type: 'uint8' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
];

async function checkMatch(matchId: number) {
    try {
        const data = await client.readContract({
            address: ARENA_ADDRESS as `0x${string}`,
            abi: ABI,
            functionName: 'matches',
            args: [BigInt(matchId)],
        });

        const [apiMatchId, prediction, exactScore, lockdownTime, totalPot, highestBid, highestBidder, resolved, cancelled, result] = data as any[];

        if (lockdownTime === 0n) {
            console.log(`Match ${matchId}: ❌ NOT CREATED (lockdownTime = 0)`);
            return false;
        }

        console.log(`Match ${matchId}: ✅ EXISTS`);
        console.log(`  API Match ID: ${apiMatchId}`);
        console.log(`  Prediction: ${prediction}`);
        console.log(`  Exact Score: ${exactScore}`);
        console.log(`  Lockdown: ${new Date(Number(lockdownTime) * 1000).toISOString()}`);
        console.log(`  Total Pot: ${formatEther(totalPot)} GOAL`);
        console.log(`  Highest Bid: ${formatEther(highestBid)} GOAL`);
        console.log(`  Resolved: ${resolved}`);
        console.log(`  Cancelled: ${cancelled}`);
        console.log('');
        return true;
    } catch (err: any) {
        console.log(`Match ${matchId}: ❌ ERROR - ${err.message}`);
        return false;
    }
}

async function main() {
    console.log('Checking on-chain match state...\n');

    for (let i = 0; i <= 10; i++) {
        await checkMatch(i);
    }
}

main();
