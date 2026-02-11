// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/GoalNadArena.sol";

/// @notice Redeploys only GoalNadArena (GoalToken stays unchanged)
contract DeployArenaScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Existing GoalToken address (already deployed)
        address goalToken = 0x041C51Eaa209E70A53d15FC317fD4dA6B92BD7B6;

        // Oracle and treasury default to deployer
        address oracleAddress = vm.envOr("ORACLE_ADDRESS", deployer);
        address treasuryAddress = vm.envOr("TREASURY_ADDRESS", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new Arena pointing to existing GoalToken
        GoalNadArena arena = new GoalNadArena(
            goalToken,
            oracleAddress,
            treasuryAddress,
            deployer
        );
        console.log("New GoalNadArena deployed at:", address(arena));
        console.log("Linked to GoalToken:", goalToken);
        console.log("Oracle:", oracleAddress);
        console.log("Treasury:", treasuryAddress);

        vm.stopBroadcast();

        console.log("");
        console.log("--- Next Steps ---");
        console.log("1. Call GoalToken.setArena(newArenaAddress)");
        console.log("2. Update ARENA_ADDRESS in Railway backend .env");
    }
}
