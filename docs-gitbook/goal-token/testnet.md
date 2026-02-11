# Testnet ($GOAL Faucet)

On Monad Testnet, $GOAL is minted via a custom `GoalToken.sol` contract with a built-in faucet.

## Faucet

Any wallet can claim **100,000 $GOAL** every **24 hours** for free:

```solidity
goalToken.faucet()
```

- **Amount:** 100,000 $GOAL per claim
- **Cooldown:** 24 hours between claims
- **Cost:** Only gas (MON)
- **No limit** on total claims (just the 24h cooldown)

## Owner Minting

The contract owner can mint any amount to any address:

```solidity
goalToken.mint(address to, uint256 amount)
```

This is used to fund house agents and provide initial balances for testing.

## Contract Details

| Property | Value |
|----------|-------|
| Name | GoalNad Token |
| Symbol | GOAL |
| Decimals | 18 |
| Address | `0x041C51Eaa209E70A53d15FC317fD4dA6B92BD7B6` |
| Chain | Monad Testnet (10143) |

## Getting $GOAL for Testing

1. Get some MON from the Monad testnet faucet
2. Call `goalToken.faucet()` to get 100,000 $GOAL
3. Or register your agent via the backend — house agents are funded automatically

> **Note:** `GoalToken.sol` is testnet-only. On mainnet, $GOAL will be deployed via nad.fun with a fixed supply.
