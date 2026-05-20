use tauri::State;
use crate::db::{Database, models::*};
use uuid::Uuid;
use chrono::Datelike;

fn row_to_subscription(row: &rusqlite::Row) -> rusqlite::Result<Subscription> {
    Ok(Subscription {
        id: row.get(0)?,
        description: row.get(1)?,
        amount: row.get(2)?,
        charge_day: row.get(3)?,
        frequency: row.get(4)?,
        account_id: row.get(5)?,
        category_id: row.get(6)?,
        next_charge: row.get(7)?,
        active: row.get::<_, i32>(8)? != 0,
        created_at: row.get(9)?,
        account_name: row.get(10)?,
        category_name: row.get(11)?,
        category_color: row.get(12)?,
    })
}

#[tauri::command]
pub fn get_subscriptions(db: State<Database>) -> Result<Vec<Subscription>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT s.id, s.description, s.amount, s.charge_day, s.frequency,
                s.account_id, s.category_id, s.next_charge, s.active, s.created_at,
                a.name, c.name, c.color
         FROM subscriptions s
         LEFT JOIN accounts a ON a.id = s.account_id
         LEFT JOIN categories c ON c.id = s.category_id
         ORDER BY s.next_charge"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], row_to_subscription)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(items)
}

#[tauri::command]
pub fn create_subscription(db: State<Database>, data: CreateSubscription) -> Result<Subscription, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO subscriptions (id, description, amount, charge_day, frequency, account_id, category_id, next_charge, active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, data.description, data.amount, data.charge_day, data.frequency,
            data.account_id, data.category_id, data.next_charge, data.active as i32],
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT s.id, s.description, s.amount, s.charge_day, s.frequency,
                s.account_id, s.category_id, s.next_charge, s.active, s.created_at,
                a.name, c.name, c.color
         FROM subscriptions s
         LEFT JOIN accounts a ON a.id = s.account_id
         LEFT JOIN categories c ON c.id = s.category_id
         WHERE s.id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row(rusqlite::params![id], row_to_subscription)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_subscription(db: State<Database>, data: UpdateSubscription) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE subscriptions SET description=?1, amount=?2, charge_day=?3, frequency=?4,
         account_id=?5, category_id=?6, next_charge=?7, active=?8 WHERE id=?9",
        rusqlite::params![data.description, data.amount, data.charge_day, data.frequency,
            data.account_id, data.category_id, data.next_charge, data.active as i32, data.id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_subscription(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE subscriptions SET active = 0 WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn compute_next_charge(current: &str, frequency: &str, charge_day: i32) -> String {
    let parsed = chrono::NaiveDate::parse_from_str(current, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::Utc::now().date_naive());
    let next = match frequency {
        "weekly" => parsed.checked_add_days(chrono::Days::new(7)).unwrap_or(parsed),
        "biweekly" => parsed.checked_add_days(chrono::Days::new(14)).unwrap_or(parsed),
        "yearly" => {
            let m = parsed.month();
            let y = parsed.year() + 1;
            chrono::NaiveDate::from_ymd_opt(y, m, 1).unwrap_or(parsed)
        }
        _ => {
            let mut m = parsed.month() + 1;
            let mut y = parsed.year();
            if m > 12 { m = 1; y += 1; }
            chrono::NaiveDate::from_ymd_opt(y, m, 1).unwrap_or(parsed)
        }
    };
    let cd: u32 = charge_day.max(1).min(28) as u32;
    chrono::NaiveDate::from_ymd_opt(next.year(), next.month(), cd)
        .or_else(|| chrono::NaiveDate::from_ymd_opt(next.year(), next.month(), 28))
        .unwrap_or(next)
        .format("%Y-%m-%d")
        .to_string()
}

#[tauri::command]
pub fn check_and_generate_charges(db: State<Database>) -> Result<i32, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn.prepare(
        "SELECT s.id, s.description, s.amount, s.charge_day, s.frequency,
                s.account_id, s.category_id, s.next_charge,
                a.type as account_type
         FROM subscriptions s
         JOIN accounts a ON a.id = s.account_id
         WHERE s.active = 1 AND s.next_charge <= ?1"
    ).map_err(|e| e.to_string())?;

    let subs: Vec<(String, String, f64, i32, String, String, Option<String>, String, String)> = stmt.query_map(
        rusqlite::params![now],
        |row| Ok((
            row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?,
            row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?,
        ))
    ).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    let mut generated = 0;

    for (sub_id, description, amount, charge_day, frequency, account_id, category_id, next_charge, account_type) in &subs {
        let next_parsed = chrono::NaiveDate::parse_from_str(next_charge, "%Y-%m-%d").ok();
        let check_month = next_parsed.map(|d| d.month() as i32).unwrap_or_else(|| chrono::Utc::now().month() as i32);
        let check_year = next_parsed.map(|d| d.year()).unwrap_or_else(|| chrono::Utc::now().year());

        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM transactions
             WHERE subscription_id = ?1
             AND CAST(strftime('%m', date) AS INTEGER) = ?2
             AND CAST(strftime('%Y', date) AS INTEGER) = ?3",
            rusqlite::params![sub_id, check_month, check_year],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        if exists {
            let new_next = compute_next_charge(next_charge, frequency, *charge_day);
            conn.execute(
                "UPDATE subscriptions SET next_charge = ?1 WHERE id = ?2",
                rusqlite::params![new_next, sub_id],
            ).map_err(|e| e.to_string())?;
            continue;
        }

        let tx_type = if account_type == "credit" { "credit" } else { "expense" };
        let tx_id = Uuid::new_v4().to_string();
        let tx_date = next_charge.clone();
        conn.execute(
            "INSERT INTO transactions (id, account_id, category_id, type, amount, description, date, subscription_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))",
            rusqlite::params![tx_id, account_id, category_id, tx_type, amount, description, tx_date, sub_id],
        ).map_err(|e| e.to_string())?;

        if tx_type == "expense" {
            conn.execute(
                "UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
                rusqlite::params![amount, account_id],
            ).map_err(|e| e.to_string())?;
        }

        let new_next = compute_next_charge(next_charge, frequency, *charge_day);
        conn.execute(
            "UPDATE subscriptions SET next_charge = ?1 WHERE id = ?2",
            rusqlite::params![new_next, sub_id],
        ).map_err(|e| e.to_string())?;

        generated += 1;
    }

    Ok(generated)
}
