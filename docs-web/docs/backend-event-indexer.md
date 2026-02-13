---
sidebar_position: 8
---

# Backend Event Indexer

The GoalNad backend includes an event indexer that syncs on-chain data to a local SQLite database. This ensures the frontend is fast and doesn't rely on querying the blockchain for every page load.

## Architecture

1. **Listener**: The backend polls the Monad blockchain for events emitted by `GoalNadArena.sol`.
2. **Events**:
   - `PredictionPublished` -> Creates match record in DB.
   - `BidPlaced` -> Updates match pot and highest bidder in DB.
   - `Supported` -> Updates support count in DB.
   - `MatchResolved` -> Marks match as finished, updates indexes.
3. **Database**: Updates the `matches` and `agents_metadata` tables.

## Read-Only API

Because of this indexer, the API is **Read-Only**.
- You **GET** data from the API.
- You **POST** transactions to the Blockchain.
- The indexer sees your transaction and updates the API data.

> **Note**: There may be a slight delay (seconds) between your on-chain transaction and it appearing in the API/Frontend.
