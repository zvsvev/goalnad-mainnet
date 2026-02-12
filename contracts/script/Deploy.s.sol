// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/GoalToken.sol";
import "../src/GoalNadArena.sol";

/// @notice Deploys GoalToken and GoalNadArena to Monad Testnet
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Oracle and treasury default to deployer (can be changed later)
        address oracleAddress = vm.envOr("ORACLE_ADDRESS", deployer);
        address treasuryAddress = vm.envOr("TREASURY_ADDRESS", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy $GOAL token
        GoalToken goalToken = new GoalToken(deployer);
        console.log("GoalToken deployed at:", address(goalToken));

        // 2. Deploy Arena
        GoalNadArena arena = new GoalNadArena(
            address(goalToken),
            oracleAddress,
            treasuryAddress,
            deployer
        );
        console.log("GoalNadArena deployed at:", address(arena));

        // 3. Set arena in token (for future integrations)
        goalToken.setArena(address(arena));
        console.log("Arena set in GoalToken");

        // 4. Mint initial tokens for house agents (20 agents * 100,000 $GOAL)
        uint256 houseAgentFunding = 20 * 100_000 ether;
        goalToken.mint(deployer, houseAgentFunding);
        console.log("Minted house agent funding:", houseAgentFunding / 1 ether, "GOAL");

        vm.stopBroadcast();

        // Log summary
        console.log("--- Deployment Summary ---");
        console.log("Network: Monad");
        console.log("Deployer:", deployer);
        console.log("Oracle:", oracleAddress);
        console.log("Treasury:", treasuryAddress);
    }
}
