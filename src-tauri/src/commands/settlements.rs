use tauri::State;
use crate::db::{Database, models::*};
use uuid::Uuid;

fn row_to_settlement(row: &rusqlite::Row) -> rusqlite::Result<PersonSettlement> {
    Ok(PersonSettlement {
        id: row.get(0)?,
        person_id: row.get(1)?,
        person_name: row.get(2)?,
        account_id: row.get(3)?,
        account_name: row.get(4)?,
        settlement_type: row.get(5)?,
        original_amount: row.get(6)?,
        current_amount: row.get(7)?,
        description: row.get(8)?,
        date: row.get(9)?,
        status: row.get(10)?,
        notes: row.get(11)?,
        created_at: row.get(12)?,
    })
}

const SETTLEMENT_COLS: &str = "ps.id, ps.person_id, ps.person_name, ps.account_id, a.name as account_name, \
    ps.settlement_type, ps.original_amount, ps.current_amount, \
    ps.description, ps.date, ps.status, ps.notes, ps.created_at";

const SETTLEMENT_JOIN: &str = "FROM person_settlements ps LEFT JOIN accounts a ON a.id = ps.account_id";

#[tauri::command]
pub fn get_persons(db: State<Database>) -> Result<Vec<Person>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, created_at FROM persons ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Person { id: row.get(0)?, name: row.get(1)?, created_at: row.get(2)? })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(rows)
}

#[tauri::command]
pub fn create_person(db: State<Database>, name: String) -> Result<Person, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute("INSERT OR IGNORE INTO persons (id, name) VALUES (?1, ?2)",
        rusqlite::params![id, name]).map_err(|e| e.to_string())?;
    // Return existing if already present
    let person = conn.query_row("SELECT id, name, created_at FROM persons WHERE name = ?1",
        rusqlite::params![name], |row| {
            Ok(Person { id: row.get(0)?, name: row.get(1)?, created_at: row.get(2)? })
        }).map_err(|e| e.to_string())?;
    Ok(person)
}

#[tauri::command]
pub fn get_person_settlements(db: State<Database>, person_id: String) -> Result<Vec<PersonSettlement>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {} {} WHERE ps.person_id = ?1 ORDER BY ps.created_at DESC", SETTLEMENT_COLS, SETTLEMENT_JOIN);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![person_id], row_to_settlement)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn get_settlements(db: State<Database>) -> Result<Vec<PersonSettlement>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {} {} ORDER BY ps.created_at DESC", SETTLEMENT_COLS, SETTLEMENT_JOIN);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_settlement)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn get_settlement(db: State<Database>, id: String) -> Result<PersonSettlement, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {} {} WHERE ps.id = ?1", SETTLEMENT_COLS, SETTLEMENT_JOIN);
    conn.query_row(&sql, rusqlite::params![id], row_to_settlement)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_settlement(db: State<Database>, data: CreatePersonSettlement) -> Result<PersonSettlement, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    // Resolve person: use provided person_id or create from person_name
    let person_id = if let Some(pid) = &data.person_id {
        if pid.is_empty() {
            create_person_from_name(&conn, &data.person_name)?
        } else {
            pid.clone()
        }
    } else {
        create_person_from_name(&conn, &data.person_name)?
    };

    conn.execute(
        "INSERT INTO person_settlements (id, person_id, person_name, account_id, settlement_type, original_amount, current_amount, description, date, status, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'open', ?10)",
        rusqlite::params![id, person_id, data.person_name, data.account_id, data.settlement_type, data.original_amount, data.original_amount, data.description, data.date, data.notes],
    ).map_err(|e| e.to_string())?;

    let sql = format!("SELECT {} {} WHERE ps.id = ?1", SETTLEMENT_COLS, SETTLEMENT_JOIN);
    conn.query_row(&sql, rusqlite::params![id], row_to_settlement)
        .map_err(|e| e.to_string())
}

fn create_person_from_name(conn: &rusqlite::Connection, name: &str) -> Result<String, String> {
    let pid = Uuid::new_v4().to_string();
    conn.execute("INSERT OR IGNORE INTO persons (id, name) VALUES (?1, ?2)",
        rusqlite::params![pid, name]).map_err(|e| e.to_string())?;
    conn.query_row("SELECT id FROM persons WHERE name = ?1",
        rusqlite::params![name], |row| row.get(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settlement(db: State<Database>, data: UpdatePersonSettlement) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let person_name: String = conn.query_row(
        "SELECT name FROM persons WHERE id = ?1",
        rusqlite::params![data.person_id], |row| row.get(0),
    ).map_err(|_| "Pessoa não encontrada".to_string())?;

    conn.execute(
        "UPDATE person_settlements SET person_id=?1, person_name=?2, account_id=?3, settlement_type=?4, description=?5, date=?6, notes=?7 WHERE id=?8",
        rusqlite::params![data.person_id, person_name, data.account_id, data.settlement_type, data.description, data.date, data.notes, data.id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_settlement(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM person_settlements WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn writeoff_settlement(db: State<Database>, data: CreateWriteoff) -> Result<PersonSettlement, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let writeoff_id = Uuid::new_v4().to_string();

    // Get settlement info
    let (current, account_id, person_name, settlement_type): (f64, Option<String>, String, String) = conn.query_row(
        "SELECT current_amount, account_id, person_name, settlement_type FROM person_settlements WHERE id = ?1",
        rusqlite::params![data.settlement_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| e.to_string())?;

    if data.amount > current {
        return Err(format!("Valor do abatimento (R$ {:.2}) não pode ser maior que o saldo atual (R$ {:.2})", data.amount, current));
    }

    // Create linked transaction if account_id is set
    let transaction_id: Option<String> = if let Some(aid) = &account_id {
        if !aid.is_empty() {
            let txn_id = Uuid::new_v4().to_string();
            let txn_type = if settlement_type == "lent" { "income" } else { "expense" };
            let desc = format!("Acerto: {} {}", if settlement_type == "lent" { "recebido de" } else { "pago a" }, person_name);
            let desc = if let Some(ref d) = data.description {
                format!("{} - {}", desc, d)
            } else {
                desc
            };
            conn.execute(
                "INSERT INTO transactions (id, account_id, category_id, type, amount, description, date)
                 VALUES (?1, ?2, NULL, ?3, ?4, ?5, ?6)",
                rusqlite::params![txn_id, aid, txn_type, data.amount, desc, data.date],
            ).map_err(|e| e.to_string())?;
            Some(txn_id)
        } else { None }
    } else { None };

    conn.execute(
        "INSERT INTO settlement_writeoffs (id, settlement_id, amount, date, description, transaction_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![writeoff_id, data.settlement_id, data.amount, data.date, data.description, transaction_id],
    ).map_err(|e| e.to_string())?;

    let new_amount = current - data.amount;
    let new_status = if new_amount == 0.0 { "resolved" } else { "open" };
    conn.execute(
        "UPDATE person_settlements SET current_amount = ?1, status = ?2 WHERE id = ?3",
        rusqlite::params![new_amount, new_status, data.settlement_id],
    ).map_err(|e| e.to_string())?;

    let sql = format!("SELECT {} {} WHERE ps.id = ?1", SETTLEMENT_COLS, SETTLEMENT_JOIN);
    conn.query_row(&sql, rusqlite::params![data.settlement_id], row_to_settlement)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resolve_settlement(db: State<Database>, id: String) -> Result<PersonSettlement, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let (current, account_id, person_name, settlement_type): (f64, Option<String>, String, String) = conn.query_row(
        "SELECT current_amount, account_id, person_name, settlement_type FROM person_settlements WHERE id = ?1",
        rusqlite::params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| e.to_string())?;

    if current > 0.0 {
        let aid = account_id.as_deref().unwrap_or("");
        if aid.is_empty() {
            return Err("Defina uma conta na edição do acerto para gerar a transação automática.".to_string());
        }

        let writeoff_id = Uuid::new_v4().to_string();
        let txn_id = Uuid::new_v4().to_string();
        let txn_type = if settlement_type == "lent" { "income" } else { "expense" };
        let desc = format!("Acerto: {} {} (resolvido manualmente)",
            if settlement_type == "lent" { "recebido de" } else { "pago a" }, person_name);

        conn.execute(
            "INSERT INTO transactions (id, account_id, category_id, type, amount, description, date)
             VALUES (?1, ?2, NULL, ?3, ?4, ?5, date('now'))",
            rusqlite::params![txn_id, aid, txn_type, current, desc],
        ).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO settlement_writeoffs (id, settlement_id, amount, date, description, transaction_id)
             VALUES (?1, ?2, ?3, date('now'), 'Resolvido manualmente', ?4)",
            rusqlite::params![writeoff_id, id, current, txn_id],
        ).map_err(|e| e.to_string())?;
    }

    conn.execute("UPDATE person_settlements SET current_amount = 0, status = 'resolved' WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    let sql = format!("SELECT {} {} WHERE ps.id = ?1", SETTLEMENT_COLS, SETTLEMENT_JOIN);
    conn.query_row(&sql, rusqlite::params![id], row_to_settlement)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settlement_writeoffs(db: State<Database>, settlement_id: String) -> Result<Vec<SettlementWriteoff>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, settlement_id, amount, date, description, transaction_id, created_at
         FROM settlement_writeoffs WHERE settlement_id = ?1 ORDER BY date DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![settlement_id], |row| {
        Ok(SettlementWriteoff {
            id: row.get(0)?,
            settlement_id: row.get(1)?,
            amount: row.get(2)?,
            date: row.get(3)?,
            description: row.get(4)?,
            transaction_id: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(rows)
}

#[tauri::command]
pub fn update_writeoff(db: State<Database>, data: UpdateWriteoff) -> Result<PersonSettlement, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Get existing writeoff info
    let (settlement_id, _old_amount, transaction_id): (String, f64, Option<String>) = conn.query_row(
        "SELECT settlement_id, amount, transaction_id FROM settlement_writeoffs WHERE id = ?1",
        rusqlite::params![data.id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    // Update linked transaction
    if let Some(txn_id) = &transaction_id {
        let (person_name, settlement_type): (String, String) = conn.query_row(
            "SELECT person_name, settlement_type FROM person_settlements WHERE id = ?1",
            rusqlite::params![settlement_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|e| e.to_string())?;
        let txn_type = if settlement_type == "lent" { "income" } else { "expense" };
        let desc = format!("Acerto: {} {}", if settlement_type == "lent" { "recebido de" } else { "pago a" }, person_name);
        let desc = if let Some(ref d) = data.description {
            format!("{} - {}", desc, d)
        } else {
            desc
        };
        conn.execute(
            "UPDATE transactions SET amount=?1, date=?2, description=?3, type=?4 WHERE id=?5",
            rusqlite::params![data.amount, data.date, desc, txn_type, txn_id],
        ).map_err(|e| e.to_string())?;
    }

    // Update writeoff
    conn.execute(
        "UPDATE settlement_writeoffs SET amount=?1, date=?2, description=?3 WHERE id=?4",
        rusqlite::params![data.amount, data.date, data.description, data.id],
    ).map_err(|e| e.to_string())?;

    // Recalculate settlement current_amount
    recalc_settlement(&conn, &settlement_id)?;

    let sql = format!("SELECT {} {} WHERE ps.id = ?1", SETTLEMENT_COLS, SETTLEMENT_JOIN);
    conn.query_row(&sql, rusqlite::params![settlement_id], row_to_settlement)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_writeoff(db: State<Database>, id: String) -> Result<PersonSettlement, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let (settlement_id, transaction_id): (String, Option<String>) = conn.query_row(
        "SELECT settlement_id, transaction_id FROM settlement_writeoffs WHERE id = ?1",
        rusqlite::params![id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    // Delete linked transaction
    if let Some(txn_id) = transaction_id {
        conn.execute("DELETE FROM transactions WHERE id = ?1", rusqlite::params![txn_id])
            .map_err(|e| e.to_string())?;
    }

    conn.execute("DELETE FROM settlement_writeoffs WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    recalc_settlement(&conn, &settlement_id)?;

    let sql = format!("SELECT {} {} WHERE ps.id = ?1", SETTLEMENT_COLS, SETTLEMENT_JOIN);
    conn.query_row(&sql, rusqlite::params![settlement_id], row_to_settlement)
        .map_err(|e| e.to_string())
}

fn recalc_settlement(conn: &rusqlite::Connection, settlement_id: &str) -> Result<(), String> {
    let paid: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM settlement_writeoffs WHERE settlement_id = ?1",
        rusqlite::params![settlement_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let original: f64 = conn.query_row(
        "SELECT original_amount FROM person_settlements WHERE id = ?1",
        rusqlite::params![settlement_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let new_amount = original - paid;
    let new_status = if new_amount == 0.0 { "resolved" } else { "open" };

    conn.execute(
        "UPDATE person_settlements SET current_amount = ?1, status = ?2 WHERE id = ?3",
        rusqlite::params![new_amount, new_status, settlement_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
