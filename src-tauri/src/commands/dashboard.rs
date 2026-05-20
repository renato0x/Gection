use tauri::State;
use crate::db::{Database, models::*};

#[tauri::command]
pub fn get_dashboard_summary(db: State<Database>, month: i32, year: i32) -> Result<DashboardSummary, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let saldo_real: f64 = conn.query_row(
        "SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN 0 ELSE balance END), 0) FROM accounts",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let receitas_realizadas: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions
         WHERE type = 'income'
         AND CAST(strftime('%m', date) AS INTEGER) = ?1
         AND CAST(strftime('%Y', date) AS INTEGER) = ?2",
        rusqlite::params![month, year],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let despesas_debito: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions
         WHERE type = 'expense'
         AND CAST(strftime('%m', date) AS INTEGER) = ?1
         AND CAST(strftime('%Y', date) AS INTEGER) = ?2",
        rusqlite::params![month, year],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let despesas_credito: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions
         WHERE type = 'credit'
         AND CAST(strftime('%m', date) AS INTEGER) = ?1
         AND CAST(strftime('%Y', date) AS INTEGER) = ?2",
        rusqlite::params![month, year],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let fatura_aberta: f64 = conn.query_row(
        "SELECT COALESCE(SUM(balance * -1), 0) FROM accounts WHERE type = 'credit' AND balance < 0",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let total_credit_limit: f64 = conn.query_row(
        "SELECT COALESCE(SUM(credit_limit), 0) FROM accounts WHERE type = 'credit'",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let renda_esperada: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM income_sources
         WHERE active = 1 AND is_fixed = 1 AND amount IS NOT NULL",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(DashboardSummary {
        saldo_real,
        receitas_realizadas,
        despesas_debito,
        despesas_credito,
        fatura_aberta,
        total_credit_limit,
        renda_esperada,
    })
}

#[tauri::command]
pub fn get_expenses_by_category(db: State<Database>, month: i32, year: i32) -> Result<Vec<CategorySpending>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let total_expense: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions
         WHERE (type = 'expense' OR type = 'credit')
         AND CAST(strftime('%m', date) AS INTEGER) = ?1
         AND CAST(strftime('%Y', date) AS INTEGER) = ?2",
        rusqlite::params![month, year],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.color, c.icon, COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE (t.type = 'expense' OR t.type = 'credit')
         AND CAST(strftime('%m', t.date) AS INTEGER) = ?1
         AND CAST(strftime('%Y', t.date) AS INTEGER) = ?2
         GROUP BY c.id
         ORDER BY total DESC"
    ).map_err(|e| e.to_string())?;

    let spending = stmt.query_map(rusqlite::params![month, year], |row| {
        let cat_total: f64 = row.get(4)?;
        Ok(CategorySpending {
            category_id: row.get::<_, Option<String>>(0)?.unwrap_or_default(),
            category_name: row.get::<_, Option<String>>(1)?.unwrap_or_else(|| "Sem categoria".to_string()),
            category_color: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "#94a3b8".to_string()),
            category_icon: row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "tag".to_string()),
            total: cat_total,
            percentage: if total_expense > 0.0 { cat_total / total_expense * 100.0 } else { 0.0 },
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(spending)
}

#[tauri::command]
pub fn get_tag_spending(db: State<Database>, month: i32, year: i32) -> Result<Vec<TagSpending>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let total: f64 = conn.query_row(
        "SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
         JOIN transaction_tags tt ON tt.transaction_id = t.id
         WHERE (t.type = 'expense' OR t.type = 'credit')
         AND CAST(strftime('%m', t.date) AS INTEGER) = ?1
         AND CAST(strftime('%Y', t.date) AS INTEGER) = ?2",
        rusqlite::params![month, year],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT tg.id, tg.name, tg.color, COALESCE(SUM(t.amount), 0)
         FROM tags tg
         JOIN transaction_tags tt ON tt.tag_id = tg.id
         JOIN transactions t ON t.id = tt.transaction_id
         WHERE (t.type = 'expense' OR t.type = 'credit')
         AND CAST(strftime('%m', t.date) AS INTEGER) = ?1
         AND CAST(strftime('%Y', t.date) AS INTEGER) = ?2
         GROUP BY tg.id
         ORDER BY SUM(t.amount) DESC"
    ).map_err(|e| e.to_string())?;

    let spending = stmt.query_map(rusqlite::params![month, year], |row| {
        let tag_total: f64 = row.get(3)?;
        Ok(TagSpending {
            tag_id: row.get(0)?,
            tag_name: row.get(1)?,
            tag_color: row.get(2)?,
            total: tag_total,
            percentage: if total > 0.0 { tag_total / total * 100.0 } else { 0.0 },
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(spending)
}

#[tauri::command]
pub fn get_monthly_comparison(db: State<Database>, year: i32) -> Result<Vec<MonthlyComparison>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT CAST(strftime('%m', date) AS INTEGER) as m,
                CAST(strftime('%Y', date) AS INTEGER) as y,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' OR type = 'credit' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         WHERE CAST(strftime('%Y', date) AS INTEGER) = ?1
         GROUP BY y, m
         ORDER BY y, m"
    ).map_err(|e| e.to_string())?;

    let months = stmt.query_map(rusqlite::params![year], |row| {
        Ok(MonthlyComparison {
            month: row.get(0)?,
            year: row.get(1)?,
            income: row.get(2)?,
            expense: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(months)
}
