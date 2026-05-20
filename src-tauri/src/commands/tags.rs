use tauri::State;
use crate::db::{Database, models::*};
use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[tauri::command]
pub fn get_tags(db: State<Database>) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, color FROM tags ORDER BY name")
        .map_err(|e| e.to_string())?;

    let tags = stmt.query_map([], |row| {
        Ok(Tag { id: row.get(0)?, name: row.get(1)?, color: row.get(2)? })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(tags)
}

#[tauri::command]
pub fn create_tag(db: State<Database>, data: CreateTag) -> Result<Tag, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, data.name, data.color],
    ).map_err(|e| e.to_string())?;

    Ok(Tag { id, name: data.name, color: data.color })
}

#[tauri::command]
pub fn update_tag(db: State<Database>, data: UpdateTag) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
        rusqlite::params![data.name, data.color, data.id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_tag(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM transaction_tags WHERE tag_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_tag(db: State<Database>, id: String) -> Result<Tag, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT id, name, color FROM tags WHERE id = ?1", rusqlite::params![id], |row| {
        Ok(Tag { id: row.get(0)?, name: row.get(1)?, color: row.get(2)? })
    }).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TagStats {
    pub total_spent: f64,
    pub total_received: f64,
    pub transaction_count: i32,
    pub first_used: String,
    pub last_used: String,
}

#[tauri::command]
pub fn get_tag_stats(db: State<Database>, tag_id: String) -> Result<TagStats, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let (total_spent, total_received): (f64, f64) = conn.query_row(
        "SELECT
            COALESCE(SUM(CASE WHEN t.type IN ('expense','credit') THEN t.amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)
         FROM transactions t
         JOIN transaction_tags tt ON tt.transaction_id = t.id
         WHERE tt.tag_id = ?1",
        rusqlite::params![tag_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    let transaction_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM transaction_tags WHERE tag_id = ?1",
        rusqlite::params![tag_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let first_used: String = conn.query_row(
        "SELECT COALESCE(MIN(t.date), '') FROM transactions t
         JOIN transaction_tags tt ON tt.transaction_id = t.id
         WHERE tt.tag_id = ?1",
        rusqlite::params![tag_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let last_used: String = conn.query_row(
        "SELECT COALESCE(MAX(t.date), '') FROM transactions t
         JOIN transaction_tags tt ON tt.transaction_id = t.id
         WHERE tt.tag_id = ?1",
        rusqlite::params![tag_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(TagStats { total_spent, total_received, transaction_count, first_used, last_used })
}
