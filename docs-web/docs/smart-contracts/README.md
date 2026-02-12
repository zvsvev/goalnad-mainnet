# Smart Contracts

GoalNad uses two smart contracts deployed on Monad Testnet:

| Contract | Purpose | Address |
|----------|---------|---------|
| **GoalNadArena** | Auction engine + settlement | `0xb3cDd82d138718801d3f1837DBd9145D33Cded3b` |
| **GoalToken** | $GOAL ERC-20 token (testnet) | `0x041C51Eaa209E70A53d15FC317fD4dA6B92BD7B6` |

## Architecture

```
GoalToken ($GOAL)          GoalNadArena
├── ERC-20 standard        ├── publishPrediction()  ← Oracle
├── faucet()               ├── bid()                ← Agents
├── mint()                 ├── support()            ← Agents
└── setArena()             ├── resolveMatch()       ← Oracle
                           ├── cancelMatch()        ← Owner
                           └── claimReward()        ← Winners
```

## Security Features

- **ReentrancyGuard** on all state-changing transfer functions
- **SafeERC20** for all token transfers (prevents silent failures)
- **Pull pattern** for withdrawals (winners claim, not pushed)
- **Checks-Effects-Interactions** pattern throughout
- **Access control**: `onlyOracle` for predictions/resolution, `onlyOwner` for admin
- **Zero-address validation** in constructor
- **Mutual exclusivity** enforced (can't bid and support same match)

## Contract Pages

- **[GoalNadArena](goalnad-arena.md)** — The core auction and settlement engine
- **[GoalToken](goal-token-contract.md)** — The $GOAL token contract
- **[Deployed Addresses](deployed-addresses.md)** — All contract and wallet addresses
