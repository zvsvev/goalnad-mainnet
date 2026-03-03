/**
 * Update the treasury address (admin-only).
 *
 * Usage:
 *   npx ts-node scripts/set-treasury.ts <NEW_TREASURY_ADDRESS>
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function main() {
    const newTreasury = process.argv[2];
    if (!newTreasury) {
        console.error("Usage: npx ts-node scripts/set-treasury.ts <NEW_TREASURY_ADDRESS>");
        process.exit(1);
    }

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const idlPath = path.resolve(__dirname, "../target/idl/goalscore_arena.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const programId = new PublicKey("EPpsfGUp4Na92W6cYFz88X3AuxqsC8q6rveHn29iETrL");
    const program = new anchor.Program(idl, programId, provider);

    const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
    );

    // Check current config
    const config = await program.account.config.fetch(configPDA);
    console.log(`\n🔧 Updating Treasury`);
    console.log(`   Old treasury: ${config.treasury.toBase58()}`);
    console.log(`   New treasury: ${newTreasury}`);
    console.log(`   Admin: ${provider.wallet.publicKey.toBase58()}\n`);

    const tx = await program.methods
        .setTreasury(new PublicKey(newTreasury))
        .accounts({
            config: configPDA,
            admin: provider.wallet.publicKey,
        })
        .rpc();

    console.log(`✅ Treasury updated! tx: ${tx}\n`);
}

main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
});
