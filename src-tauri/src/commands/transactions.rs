use tauri::State;
use crate::db::{Database, models::*};
use chrono::Datelike;
use uuid::Uuid;

fn row_to_transaction(row: &rusqlite::Row) -> rusqlite::Result<Transaction> {
    Ok(Transaction {
        id: row.get(0)?,
        account_id: row.get(1)?,
        category_id: row.get(2)?,
        transaction_type: row.get(3)?,
        amount: row.get(4)?,
        description: row.get(5)?,
        date: row.get(6)?,
        total_installments: row.get(7)?,
        created_at: row.get(8)?,
        account_name: row.get(9)?,
        category_name: row.get(10)?,
        category_color: row.get(11)?,
        subscription_id: row.get(12)?,
        tags: Vec::new(),
        installments: Vec::new(),
    })
}

fn load_tags(conn: &rusqlite::Connection, transaction_id: &str) -> Result<Vec<Tag>, String> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color FROM tags t
         JOIN transaction_tags tt ON tt.tag_id = t.id
         WHERE tt.transaction_id = ?1"
    ).map_err(|e| e.to_string())?;

    let tags = stmt.query_map(rusqlite::params![transaction_id], |row| {
        Ok(Tag { id: row.get(0)?, name: row.get(1)?, color: row.get(2)? })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(tags)
}

fn load_installments(conn: &rusqlite::Connection, transaction_id: &str) -> Result<Vec<Installment>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, transaction_id, total_installments, installment_number, installment_amount, due_month, due_year, paid
         FROM installments WHERE transaction_id = ?1 ORDER BY installment_number"
    ).map_err(|e| e.to_string())?;

    let installments = stmt.query_map(rusqlite::params![transaction_id], |row| {
        Ok(Installment {
            id: row.get(0)?,
            transaction_id: row.get(1)?,
            total_installments: row.get(2)?,
            installment_number: row.get(3)?,
            installment_amount: row.get(4)?,
            due_month: row.get(5)?,
            due_year: row.get(6)?,
            paid: row.get::<_, i32>(7)? != 0,
            description: None,
            category_name: None,
            category_color: None,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(installments)
}

fn build_where_clause(filter: &TransactionFilter) -> (String, Vec<rusqlite::types::Value>) {
    let mut conditions = Vec::new();
    let mut params: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(m) = filter.month {
        conditions.push(format!("CAST(strftime('%m', t.date) AS INTEGER) = ?{}", params.len() + 1));
        params.push(rusqlite::types::Value::Integer(m as i64));
    }
    if let Some(y) = filter.year {
        conditions.push(format!("CAST(strftime('%Y', t.date) AS INTEGER) = ?{}", params.len() + 1));
        params.push(rusqlite::types::Value::Integer(y as i64));
    }
    if let Some(ref aid) = filter.account_id {
        conditions.push(format!("t.account_id = ?{}", params.len() + 1));
        params.push(rusqlite::types::Value::Text(aid.clone()));
    }
    if let Some(ref cid) = filter.category_id {
        conditions.push(format!("t.category_id = ?{}", params.len() + 1));
        params.push(rusqlite::types::Value::Text(cid.clone()));
    }
    if let Some(ref s) = filter.search {
        conditions.push(format!("t.description LIKE ?{}", params.len() + 1));
        params.push(rusqlite::types::Value::Text(format!("%{}%", s)));
    }
    if let Some(ref ft) = filter.filter_type {
        conditions.push(format!("t.type = ?{}", params.len() + 1));
        params.push(rusqlite::types::Value::Text(ft.clone()));
    }
    if let Some(ref tid) = filter.tag_id {
        conditions.push(format!("t.id IN (SELECT transaction_id FROM transaction_tags WHERE tag_id = ?{})", params.len() + 1));
        params.push(rusqlite::types::Value::Text(tid.clone()));
    }

    let where_clause = if conditions.is_empty() { String::new() } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    (where_clause, params)
}

#[tauri::command]
pub fn get_transactions(db: State<Database>, filter: TransactionFilter) -> Result<Vec<Transaction>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let (where_clause, params) = build_where_clause(&filter);

    let sql = format!(
        "SELECT t.id, t.account_id, t.category_id, t.type, t.amount, t.description, t.date, t.total_installments, t.created_at,
                a.name as account_name, c.name as category_name, c.color as category_color,
                t.subscription_id
         FROM transactions t
         LEFT JOIN accounts a ON a.id = t.account_id
         LEFT JOIN categories c ON c.id = t.category_id
         {}
         ORDER BY t.date DESC, t.created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p as &dyn rusqlite::types::ToSql).collect();

    let mut transactions: Vec<Transaction> = stmt.query_map(param_refs.as_slice(), row_to_transaction)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for t in &mut transactions {
        t.tags = load_tags(&conn, &t.id).unwrap_or_default();
        t.installments = load_installments(&conn, &t.id).unwrap_or_default();
    }

    Ok(transactions)
}

fn create_installments(conn: &rusqlite::Connection, transaction_id: &str, total: i32, amount: f64, date: &str, closing_day: Option<i32>) -> Result<Vec<Installment>, String> {
    let parsed = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").map_err(|e| e.to_string())?;
    let mut month = parsed.month() as i32;
    let mut year = parsed.year();

    // Step 1: compute closing month (cycle where purchase date falls)
    if let Some(cd) = closing_day {
        if parsed.day() as i32 > cd {
            month += 1;
            if month > 12 { month = 1; year += 1; }
        }
    }

    // Step 2: due_month = invoice due month (closing month + 1)
    month += 1;
    if month > 12 { month = 1; year += 1; }

    let mut installments = Vec::new();

    for i in 1..=total {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        conn.execute(
            "INSERT INTO installments (id, transaction_id, total_installments, installment_number, installment_amount, due_month, due_year, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, transaction_id, total, i, amount, month, year, now],
        ).map_err(|e| e.to_string())?;
        installments.push(Installment { id, transaction_id: transaction_id.to_string(), total_installments: total, installment_number: i, installment_amount: amount, due_month: month, due_year: year, paid: false, description: None, category_name: None, category_color: None });
        month += 1;
        if month > 12 { month = 1; year += 1; }
    }
    Ok(installments)
}

#[tauri::command]
pub fn create_transaction(db: State<Database>, data: CreateTransaction) -> Result<Transaction, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let inst = data.total_installments.unwrap_or(0);

    conn.execute(
        "INSERT INTO transactions (id, account_id, category_id, type, amount, description, date, total_installments, subscription_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![id, data.account_id, data.category_id, data.transaction_type, data.amount, data.description, data.date, inst, data.subscription_id, now],
    ).map_err(|e| e.to_string())?;

    if data.transaction_type == "expense" || data.transaction_type == "credit" {
        conn.execute(
            "UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
            rusqlite::params![data.amount, data.account_id],
        ).map_err(|e| e.to_string())?;
    } else if data.transaction_type == "income" {
        conn.execute(
            "UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
            rusqlite::params![data.amount, data.account_id],
        ).map_err(|e| e.to_string())?;
    }

    for tag_id in &data.tag_ids {
        conn.execute(
            "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![id, tag_id],
        ).map_err(|e| e.to_string())?;
    }

    let tags = load_tags(&conn, &id)?;
    let closing_day = if data.transaction_type == "credit" && inst > 1 {
        conn.query_row(
            "SELECT closing_day FROM accounts WHERE id = ?1",
            rusqlite::params![data.account_id],
            |row| row.get::<_, Option<i32>>(0),
        ).ok().flatten()
    } else { None };
    let installments = if inst > 1 {
        let inst_amount = data.amount / inst as f64;
        create_installments(&conn, &id, inst, inst_amount, &data.date, closing_day)?
    } else {
        Vec::new()
    };

    Ok(Transaction {
        id,
        account_id: data.account_id,
        category_id: data.category_id,
        transaction_type: data.transaction_type,
        amount: data.amount,
        description: data.description,
        date: data.date,
        total_installments: Some(inst),
        created_at: now,
        account_name: None,
        category_name: None,
        category_color: None,
        subscription_id: data.subscription_id,
        tags,
        installments,
    })
}

#[tauri::command]
pub fn update_transaction(db: State<Database>, data: UpdateTransaction) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let old: (String, f64, String) = conn.query_row(
        "SELECT type, amount, account_id FROM transactions WHERE id = ?1",
        rusqlite::params![data.id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    if old.0 == "expense" || old.0 == "credit" {
        conn.execute("UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
            rusqlite::params![old.1, old.2]).map_err(|e| e.to_string())?;
    } else if old.0 == "income" {
        conn.execute("UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
            rusqlite::params![old.1, old.2]).map_err(|e| e.to_string())?;
    }

    let inst = data.total_installments.unwrap_or(0);
    conn.execute(
        "UPDATE transactions SET account_id = ?1, category_id = ?2, type = ?3, amount = ?4, description = ?5, date = ?6, total_installments = ?7, subscription_id = ?8 WHERE id = ?9",
        rusqlite::params![data.account_id, data.category_id, data.transaction_type, data.amount, data.description, data.date, inst, data.subscription_id, data.id],
    ).map_err(|e| e.to_string())?;

    if data.transaction_type == "expense" || data.transaction_type == "credit" {
        conn.execute("UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
            rusqlite::params![data.amount, data.account_id]).map_err(|e| e.to_string())?;
    } else if data.transaction_type == "income" {
        conn.execute("UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
            rusqlite::params![data.amount, data.account_id]).map_err(|e| e.to_string())?;
    }

    conn.execute("DELETE FROM transaction_tags WHERE transaction_id = ?1", rusqlite::params![data.id])
        .map_err(|e| e.to_string())?;
    for tag_id in &data.tag_ids {
        conn.execute(
            "INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![data.id, tag_id],
        ).map_err(|e| e.to_string())?;
    }

    conn.execute("DELETE FROM installments WHERE transaction_id = ?1", rusqlite::params![data.id])
        .map_err(|e| e.to_string())?;
    let closing_day = if data.transaction_type == "credit" && inst > 1 {
        conn.query_row(
            "SELECT closing_day FROM accounts WHERE id = ?1",
            rusqlite::params![data.account_id],
            |row| row.get::<_, Option<i32>>(0),
        ).ok().flatten()
    } else { None };
    if inst > 0 {
        let inst_amount = data.amount / inst as f64;
        create_installments(&conn, &data.id, inst, inst_amount, &data.date, closing_day)?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_transaction(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let tx: (String, f64, String, Option<String>) = conn.query_row(
        "SELECT type, amount, account_id, subscription_id FROM transactions WHERE id = ?1",
        rusqlite::params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM transaction_tags WHERE transaction_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM installments WHERE transaction_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM transactions WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    if tx.0 == "expense" || tx.0 == "credit" {
        conn.execute("UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
            rusqlite::params![tx.1, tx.2]).map_err(|e| e.to_string())?;
    } else if tx.0 == "income" {
        conn.execute("UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
            rusqlite::params![tx.1, tx.2]).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn mark_installment_paid(db: State<Database>, id: String, paid: bool) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE installments SET paid = ?1 WHERE id = ?2",
        rusqlite::params![paid as i32, id]).map_err(|e| e.to_string())?;
    Ok(())
}
