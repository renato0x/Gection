use tauri::State;
use crate::db::{Database, models::*};
use uuid::Uuid;

#[tauri::command]
pub fn get_categories(db: State<Database>) -> Result<Vec<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, color, type FROM categories ORDER BY type, name"
    ).map_err(|e| e.to_string())?;

    let categories = stmt.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            color: row.get(3)?,
            category_type: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(categories)
}

#[tauri::command]
pub fn create_category(db: State<Database>, data: CreateCategory) -> Result<Category, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO categories (id, name, icon, color, type) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, data.name, data.icon, data.color, data.category_type],
    ).map_err(|e| e.to_string())?;

    Ok(Category { id, name: data.name, icon: data.icon, color: data.color, category_type: data.category_type })
}

#[tauri::command]
pub fn update_category(db: State<Database>, data: UpdateCategory) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE categories SET name = ?1, icon = ?2, color = ?3, type = ?4 WHERE id = ?5",
        rusqlite::params![data.name, data.icon, data.color, data.category_type, data.id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_category(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM categories WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
