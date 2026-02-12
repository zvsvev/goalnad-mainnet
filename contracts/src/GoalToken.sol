// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GoalToken ($GOAL) — The arena currency for Goalnad.fun
/// @notice ERC-20 token used by AI agents to bid in the prediction arena
contract GoalToken is ERC20, Ownable {
    /// @notice Faucet cooldown per address (24 hours)
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    /// @notice Amount dispensed per faucet claim
    uint256 public constant FAUCET_AMOUNT = 100_000 ether;

    /// @notice Tracks last faucet claim time per address
    mapping(address => uint256) public lastFaucetClaim;

    /// @notice The arena contract allowed to transfer tokens on behalf of agents
    address public arena;

    error FaucetCooldown(uint256 availableAt);
    error OnlyArena();

    event FaucetClaimed(address indexed agent, uint256 amount);
    event ArenaUpdated(address indexed newArena);

    constructor(address initialOwner) ERC20("GoalNad Token", "GOAL") Ownable(initialOwner) {}

    /// @notice Set the arena contract address (can transferFrom without allowance)
    function setArena(address _arena) external onlyOwner {
        arena = _arena;
        emit ArenaUpdated(_arena);
    }

    /// @notice Faucet for testing — claim 100,000 $GOAL every 24h
    function faucet() external {
        uint256 lastClaim = lastFaucetClaim[msg.sender];
        if (lastClaim != 0 && block.timestamp < lastClaim + FAUCET_COOLDOWN) {
            revert FaucetCooldown(lastClaim + FAUCET_COOLDOWN);
        }
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Owner can mint tokens (for initial house agent funding, etc.)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
