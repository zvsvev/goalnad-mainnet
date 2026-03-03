/**
 * One-time setup script: Initialize the Config PDA after deploying the contract.
 *
 * Usage:
 *   npx ts-node scripts/initialize-config.ts <TREASURY_WALLET_ADDRESS>
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function main() {
    const treasuryArg = process.argv[2];
    if (!treasuryArg) {
        console.error("Usage: npx ts-node scripts/initialize-config.ts <TREASURY_ADDRESS>");
        process.exit(1);
    }

    const treasury = new PublicKey(treasuryArg);
    console.log(`\n🔧 Initializing GoalScore Arena Config`);
    console.log(`   Treasury: ${treasury.toBase58()}`);

    // Load provider from Anchor.toml
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Load program from workspace
    const program = anchor.workspace.GoalscoreArena as anchor.Program;
    const programId = program.programId;

    // Derive Config PDA
    const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
    );
    console.log(`   Config PDA: ${configPDA.toBase58()}`);
    console.log(`   Admin: ${provider.wallet.publicKey.toBase58()}\n`);

    // Check if already initialized
    try {
        const existing = await (program.account as any).config.fetch(configPDA);
        console.log(`⚠️  Config already initialized!`);
        console.log(`   Current admin: ${existing.admin.toBase58()}`);
        console.log(`   Current treasury: ${existing.treasury.toBase58()}`);
        console.log(`\nTo update treasury, use: npx ts-node scripts/set-treasury.ts <NEW_ADDRESS>`);
        process.exit(0);
    } catch {
        // Not initialized yet — proceed
    }

    // Initialize
    const tx = await program.methods
        .initializeConfig(treasury)
        .accounts({
            config: configPDA,
            admin: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .rpc();

    console.log(`✅ Config initialized!`);
    console.log(`   tx: ${tx}`);
    console.log(`\n   Admin:    ${provider.wallet.publicKey.toBase58()}`);
    console.log(`   Treasury: ${treasury.toBase58()}`);
    console.log(`   Config:   ${configPDA.toBase58()}\n`);
}

main().catch((err) => {
    console.error("Error:", err.message || err);
    process.exit(1);
});
