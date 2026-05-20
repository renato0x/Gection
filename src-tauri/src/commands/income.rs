use tauri::State;
use crate::db::{Database, models::*};
use uuid::Uuid;

fn row_to_income(row: &rusqlite::Row) -> rusqlite::Result<IncomeSource> {
    Ok(IncomeSource {
        id: row.get(0)?,
        name: row.get(1)?,
        amount: row.get(2)?,
        entry_day: row.get(3)?,
        account_id: row.get(4)?,
        is_fixed: row.get::<_, i32>(5)? != 0,
        frequency: row.get(6)?,
        category_id: row.get(7)?,
        notes: row.get(8)?,
        active: row.get::<_, i32>(9)? != 0,
        created_at: row.get(10)?,
        account_name: row.get(11)?,
        category_name: row.get(12)?,
        category_color: row.get(13)?,
    })
}

#[tauri::command]
pub fn get_income_sources(db: State<Database>) -> Result<Vec<IncomeSource>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.amount, s.entry_day, s.account_id,
                s.is_fixed, s.frequency, s.category_id, s.notes, s.active, s.created_at,
                a.name, c.name, c.color
         FROM income_sources s
         LEFT JOIN accounts a ON a.id = s.account_id
         LEFT JOIN categories c ON c.id = s.category_id
         ORDER BY s.entry_day"
    ).map_err(|e| e.to_string())?;

    let sources = stmt.query_map([], row_to_income)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(sources)
}

#[tauri::command]
pub fn create_income_source(db: State<Database>, data: CreateIncomeSource) -> Result<IncomeSource, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO income_sources (id, name, amount, entry_day, account_id, is_fixed, frequency, category_id, notes, active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id, data.name, data.amount, data.entry_day, data.account_id,
            data.is_fixed as i32, data.frequency, data.category_id, data.notes, data.active as i32
        ],
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.amount, s.entry_day, s.account_id,
                s.is_fixed, s.frequency, s.category_id, s.notes, s.active, s.created_at,
                a.name, c.name, c.color
         FROM income_sources s
         LEFT JOIN accounts a ON a.id = s.account_id
         LEFT JOIN categories c ON c.id = s.category_id
         WHERE s.id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row(rusqlite::params![id], row_to_income)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_income_source(db: State<Database>, data: UpdateIncomeSource) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE income_sources SET name=?1, amount=?2, entry_day=?3, account_id=?4,
         is_fixed=?5, frequency=?6, category_id=?7, notes=?8, active=?9
         WHERE id=?10",
        rusqlite::params![
            data.name, data.amount, data.entry_day, data.account_id,
            data.is_fixed as i32, data.frequency, data.category_id, data.notes, data.active as i32,
            data.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_income_source(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM income_sources WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
