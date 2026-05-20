use tauri::State;
use crate::db::{Database, models::*};
use uuid::Uuid;

fn row_to_account(row: &rusqlite::Row) -> rusqlite::Result<Account> {
    Ok(Account {
        id: row.get(0)?,
        name: row.get(1)?,
        account_type: row.get(2)?,
        balance: row.get(3)?,
        color: row.get(4)?,
        credit_limit: row.get(5)?,
        closing_day: row.get(6)?,
        due_day: row.get(7)?,
        created_at: row.get(8)?,
    })
}

#[tauri::command]
pub fn get_accounts(db: State<Database>) -> Result<Vec<Account>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, type, balance, color, credit_limit, closing_day, due_day, created_at FROM accounts ORDER BY created_at"
    ).map_err(|e| e.to_string())?;

    let accounts = stmt.query_map([], row_to_account)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(accounts)
}

#[tauri::command]
pub fn create_account(db: State<Database>, data: CreateAccount) -> Result<Account, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO accounts (id, name, type, balance, color, credit_limit, closing_day, due_day, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, data.name, data.account_type, data.balance, data.color, data.credit_limit, data.closing_day, data.due_day, now],
    ).map_err(|e| e.to_string())?;

    Ok(Account { id, name: data.name, account_type: data.account_type, balance: data.balance, color: data.color, credit_limit: data.credit_limit, closing_day: data.closing_day, due_day: data.due_day, created_at: now })
}

#[tauri::command]
pub fn update_account(db: State<Database>, data: UpdateAccount) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE accounts SET name = ?1, type = ?2, balance = ?3, color = ?4, credit_limit = ?5, closing_day = ?6, due_day = ?7 WHERE id = ?8",
        rusqlite::params![data.name, data.account_type, data.balance, data.color, data.credit_limit, data.closing_day, data.due_day, data.id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_account(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM accounts WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
