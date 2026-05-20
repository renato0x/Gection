use tauri::State;
use crate::db::{Database, models::*};
use uuid::Uuid;

#[tauri::command]
pub fn get_budgets(db: State<Database>, month: i32, year: i32) -> Result<Vec<Budget>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT b.id, b.category_id, b.month, b.year, b.limit_amount,
                COALESCE((SELECT SUM(t.amount) FROM transactions t
                 WHERE t.category_id = b.category_id AND t.type = 'expense'
                 AND CAST(strftime('%m', t.date) AS INTEGER) = ?1
                 AND CAST(strftime('%Y', t.date) AS INTEGER) = ?2), 0) as spent,
                c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM budgets b
         LEFT JOIN categories c ON c.id = b.category_id
         WHERE b.month = ?1 AND b.year = ?2
         ORDER BY c.name"
    ).map_err(|e| e.to_string())?;

    let budgets = stmt.query_map(rusqlite::params![month, year], |row| {
        Ok(Budget {
            id: row.get(0)?,
            category_id: row.get(1)?,
            month: row.get(2)?,
            year: row.get(3)?,
            limit_amount: row.get(4)?,
            spent: row.get(5)?,
            category_name: row.get(6)?,
            category_color: row.get(7)?,
            category_icon: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(budgets)
}

#[tauri::command]
pub fn get_budget_overview(db: State<Database>, month: i32, year: i32) -> Result<BudgetOverview, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let monthly_income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM income_sources
         WHERE active = 1 AND frequency = 'monthly' AND amount IS NOT NULL",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let total_allocated: f64 = conn.query_row(
        "SELECT COALESCE(SUM(limit_amount), 0) FROM budgets WHERE month = ?1 AND year = ?2",
        rusqlite::params![month, year],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT b.id, b.category_id, b.month, b.year, b.limit_amount,
                COALESCE((SELECT SUM(t.amount) FROM transactions t
                 WHERE t.category_id = b.category_id AND t.type = 'expense'
                 AND CAST(strftime('%m', t.date) AS INTEGER) = ?1
                 AND CAST(strftime('%Y', t.date) AS INTEGER) = ?2), 0) as spent,
                c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM budgets b
         LEFT JOIN categories c ON c.id = b.category_id
         WHERE b.month = ?1 AND b.year = ?2
         ORDER BY c.name"
    ).map_err(|e| e.to_string())?;

    let budgets = stmt.query_map(rusqlite::params![month, year], |row| {
        Ok(Budget {
            id: row.get(0)?, category_id: row.get(1)?,
            month: row.get(2)?, year: row.get(3)?,
            limit_amount: row.get(4)?, spent: row.get(5)?,
            category_name: row.get(6)?, category_color: row.get(7)?, category_icon: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(BudgetOverview { monthly_income, total_allocated, budgets })
}

#[tauri::command]
pub fn create_budget(db: State<Database>, data: CreateBudget) -> Result<Budget, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO budgets (id, category_id, month, year, limit_amount) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, data.category_id, data.month, data.year, data.limit_amount],
    ).map_err(|e| e.to_string())?;

    Ok(Budget {
        id,
        category_id: data.category_id,
        month: data.month,
        year: data.year,
        limit_amount: data.limit_amount,
        spent: 0.0,
        category_name: None,
        category_color: None,
        category_icon: None,
    })
}

#[tauri::command]
pub fn update_budget(db: State<Database>, id: String, limit_amount: f64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE budgets SET limit_amount = ?1 WHERE id = ?2",
        rusqlite::params![limit_amount, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_budget(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM budgets WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
