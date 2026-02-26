import { db } from "./connection.js";

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_match_id INTEGER UNIQUE NOT NULL,
      league_id TEXT NOT NULL,
      league_name TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'NS',
      match_date TEXT NOT NULL,
      round TEXT,
      venue TEXT,
      home_logo TEXT,
      away_logo TEXT,
      oracle_prediction INTEGER,
      oracle_score TEXT,
      oracle_analysis TEXT,
      oracle_conviction INTEGER,
      oracle_tx_hash TEXT,
      lockdown_time TEXT,
      total_pot INTEGER DEFAULT 0,
      highest_bid INTEGER DEFAULT 0,
      highest_bidder TEXT,
      resolved INTEGER DEFAULT 0,
      result INTEGER,
      resolve_tx_hash TEXT,
      lucky_supporter TEXT,
      moltbook_post_id TEXT,
      onchain_match_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      agent_wallet TEXT NOT NULL,
      amount INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(agent_wallet) REFERENCES agents_metadata(agent_wallet)
    );

    CREATE TABLE IF NOT EXISTS agents_metadata (
      agent_wallet TEXT PRIMARY KEY,
      agent_name TEXT,
      balance INTEGER DEFAULT 100000,
      support_quota INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      persona_type TEXT
    );

    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_wallet TEXT NOT NULL,
      match_id INTEGER NOT NULL,
      amount INTEGER DEFAULT 0,
      type TEXT CHECK(type IN ('challenge','support')),
      comment TEXT,
      tx_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(agent_wallet, match_id),
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(agent_wallet) REFERENCES agents_metadata(agent_wallet)
    );

    CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
    CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id);
    CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
    CREATE INDEX IF NOT EXISTS idx_matches_api_id ON matches(api_match_id);
    CREATE INDEX IF NOT EXISTS idx_matches_onchain_id ON matches(onchain_match_id);
    CREATE INDEX IF NOT EXISTS idx_bids_match ON bids(match_id);
    CREATE INDEX IF NOT EXISTS idx_bids_agent ON bids(agent_wallet);
    CREATE INDEX IF NOT EXISTS idx_claims_match ON claims(match_id);
    CREATE INDEX IF NOT EXISTS idx_claims_agent ON claims(agent_wallet);
  `);

  // Migrate existing tables — add new columns if they don't exist yet
  const migrations = [
    "ALTER TABLE matches ADD COLUMN oracle_prediction INTEGER",
    "ALTER TABLE matches ADD COLUMN oracle_score TEXT",
    "ALTER TABLE matches ADD COLUMN lockdown_time TEXT",
    "ALTER TABLE matches ADD COLUMN total_pot INTEGER DEFAULT 0",
    "ALTER TABLE matches ADD COLUMN highest_bid INTEGER DEFAULT 0",
    "ALTER TABLE matches ADD COLUMN highest_bidder TEXT",
    "ALTER TABLE matches ADD COLUMN resolved INTEGER DEFAULT 0",
    "ALTER TABLE matches ADD COLUMN result INTEGER",
    "ALTER TABLE matches ADD COLUMN oracle_analysis TEXT",
    "ALTER TABLE matches ADD COLUMN oracle_conviction INTEGER",
    "ALTER TABLE matches ADD COLUMN oracle_tx_hash TEXT",
    "ALTER TABLE agents_metadata ADD COLUMN agent_name TEXT",
    "ALTER TABLE agents_metadata ADD COLUMN balance INTEGER DEFAULT 100000",
    "ALTER TABLE agents_metadata ADD COLUMN wins INTEGER DEFAULT 0",
    "ALTER TABLE agents_metadata ADD COLUMN losses INTEGER DEFAULT 0",
    "ALTER TABLE matches ADD COLUMN moltbook_post_id TEXT",
    "ALTER TABLE matches ADD COLUMN onchain_match_id INTEGER",
    "ALTER TABLE bids ADD COLUMN tx_hash TEXT",
    "ALTER TABLE matches ADD COLUMN resolve_tx_hash TEXT",
    "ALTER TABLE matches ADD COLUMN lucky_supporter TEXT",
    "ALTER TABLE matches ADD COLUMN onchain_closed INTEGER",
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch (_err) {
      // Column already exists — safe to ignore
    }
  }

  // One-time data fix: clear hardcoded 85% conviction values that were
  // incorrectly written by the indexer (it no longer touches conviction).
  // Safe to run on every startup — once cleared, this updates 0 rows.
  try {
    const result = db.prepare(
      "UPDATE matches SET oracle_conviction = NULL WHERE oracle_conviction = 85"
    ).run();
    if (result.changes > 0) {
      console.log(`[Schema] 🧹 Cleared ${result.changes} stale oracle_conviction=85 values`);
    }
  } catch (_err) {
    // Ignore if column doesn't exist yet
  }
}
