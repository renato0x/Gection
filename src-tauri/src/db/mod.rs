pub mod models;

use rusqlite::Connection;
use std::sync::Mutex;
use std::path::Path;

const MIGRATIONS: &str = "
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('checking','savings','credit','cash','investment')),
    balance REAL NOT NULL DEFAULT 0.0,
    color TEXT NOT NULL DEFAULT '#6366f1',
    credit_limit REAL DEFAULT 0.0,
    closing_day INTEGER DEFAULT 1,
    due_day INTEGER DEFAULT 10,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'tag',
    color TEXT NOT NULL DEFAULT '#6366f1',
    type TEXT NOT NULL CHECK(type IN ('income','expense'))
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK(type IN ('income','expense','transfer','credit')),
    amount REAL NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    total_installments INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS installments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    total_installments INTEGER NOT NULL CHECK(total_installments > 0),
    installment_number INTEGER NOT NULL CHECK(installment_number > 0),
    installment_amount REAL NOT NULL,
    due_month INTEGER NOT NULL CHECK(due_month BETWEEN 1 AND 12),
    due_year INTEGER NOT NULL,
    paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    limit_amount REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(category_id, month, year)
);

CREATE TABLE IF NOT EXISTS income_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL,
    entry_day INTEGER NOT NULL CHECK(entry_day BETWEEN 1 AND 31),
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    is_fixed INTEGER NOT NULL DEFAULT 1,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK(frequency IN ('monthly','biweekly','weekly','yearly')),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    charge_day INTEGER NOT NULL CHECK(charge_day BETWEEN 1 AND 31),
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK(frequency IN ('monthly','yearly','biweekly','weekly')),
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    next_charge TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
";

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| e.to_string())?;
        Ok(Database { conn: Mutex::new(conn) })
    }

    pub fn migrate(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(MIGRATIONS).map_err(|e| e.to_string())?;
        // Add subscription_id column if not exists (safe for existing DBs)
        let _ = conn.execute("ALTER TABLE transactions ADD COLUMN subscription_id TEXT", []);
        let _ = conn.execute_batch("
            CREATE TABLE IF NOT EXISTS person_settlements (
                id TEXT PRIMARY KEY,
                person_name TEXT NOT NULL,
                settlement_type TEXT NOT NULL CHECK(settlement_type IN ('lent','borrowed')),
                original_amount REAL NOT NULL,
                current_amount REAL NOT NULL,
                description TEXT DEFAULT '',
                date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS settlement_writeoffs (
                id TEXT PRIMARY KEY,
                settlement_id TEXT NOT NULL REFERENCES person_settlements(id) ON DELETE CASCADE,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                description TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ");

        // === Fix 1: Persons table (reusable persons) ===
        let _ = conn.execute_batch("
            CREATE TABLE IF NOT EXISTS persons (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ");
        let _ = conn.execute("ALTER TABLE person_settlements ADD COLUMN person_id TEXT REFERENCES persons(id)", []);
        let _ = conn.execute("ALTER TABLE person_settlements ADD COLUMN account_id TEXT REFERENCES accounts(id)", []);
        let _ = conn.execute("ALTER TABLE settlement_writeoffs ADD COLUMN transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL", []);

        // Backfill persons + person_id for existing settlements
        {
            let mut stmt = conn.prepare("SELECT DISTINCT person_name FROM person_settlements WHERE person_id IS NULL AND person_name != ''").map_err(|e| e.to_string())?;
            let names: Vec<String> = stmt.query_map([], |row| row.get(0)).map_err(|e| e.to_string())?
                .filter_map(|r| r.ok()).collect();
            for name in names {
                let pid: String = conn.query_row("SELECT lower(hex(randomblob(16)))", [], |row| row.get(0)).map_err(|e| e.to_string())?;
                let _ = conn.execute("INSERT OR IGNORE INTO persons (id, name) VALUES (?1, ?2)", rusqlite::params![pid, name]);
                if let Ok(found) = conn.query_row("SELECT id FROM persons WHERE name = ?1", rusqlite::params![name], |row| row.get::<_, String>(0)) {
                    let _ = conn.execute("UPDATE person_settlements SET person_id = ?1 WHERE person_name = ?2 AND person_id IS NULL", rusqlite::params![found, name]);
                }
            }
        }

        // Import dedup table
        let _ = conn.execute_batch("
            CREATE TABLE IF NOT EXISTS imported_ids (
                fit_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                imported_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (fit_id, account_id)
            );
        ");

        Ok(())
    }
}
