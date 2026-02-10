import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config.js";

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(config.dbPath);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
