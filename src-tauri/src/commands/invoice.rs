use tauri::State;
use crate::db::{Database, models::*};

/// Given a due month/year (invoice name) and closing_day,
/// returns (curr_month, curr_year) = closing month, and (prev_month, prev_year) = previous closing month.
fn invoice_period(due_month: i32, due_year: i32, _closing_day: i32) -> (i32, i32, i32, i32) {
    let (curr_month, curr_year) = if due_month == 1 { (12, due_year - 1) } else { (due_month - 1, due_year) };
    let (prev_month, prev_year) = if curr_month == 1 { (12, curr_year - 1) } else { (curr_month - 1, curr_year) };
    (curr_month, curr_year, prev_month, prev_year)
}

/// Query single-pay credit transactions whose purchase date falls within the invoice cycle.
/// Cycle: from (prev_closing_day+1) to (curr_closing_day), i.e.:
///   (day <= closing_day AND month = curr_month) OR (day > closing_day AND month = prev_month)
fn query_single_pay(
    conn: &rusqlite::Connection,
    account_id: &str,
    curr_month: i32, curr_year: i32,
    prev_month: i32, prev_year: i32,
    closing_day: i32,
) -> Result<Vec<Transaction>, String> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.account_id, t.category_id, t.type, t.amount, t.description, t.date,
                t.total_installments, t.created_at,
                a.name, c.name, c.color
         FROM transactions t
         LEFT JOIN accounts a ON a.id = t.account_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.account_id = ?1 AND t.type = 'credit'
         AND (t.total_installments IS NULL OR t.total_installments <= 1)
         AND (
           (CAST(strftime('%d', t.date) AS INTEGER) <= ?4 AND CAST(strftime('%m', t.date) AS INTEGER) = ?2 AND CAST(strftime('%Y', t.date) AS INTEGER) = ?3)
           OR
           (CAST(strftime('%d', t.date) AS INTEGER) > ?4 AND CAST(strftime('%m', t.date) AS INTEGER) = ?5 AND CAST(strftime('%Y', t.date) AS INTEGER) = ?6)
         )
         ORDER BY t.date DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(
        rusqlite::params![account_id, curr_month, curr_year, closing_day, prev_month, prev_year],
        |row| Ok(Transaction {
            id: row.get(0)?, account_id: row.get(1)?, category_id: row.get(2)?,
            transaction_type: row.get(3)?, amount: row.get(4)?, description: row.get(5)?,
            date: row.get(6)?, total_installments: row.get(7)?, created_at: row.get(8)?,
            account_name: row.get(9)?, category_name: row.get(10)?, category_color: row.get(11)?,
            subscription_id: None, tags: Vec::new(), installments: Vec::new(),
        })
    ).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

/// Query installments whose due month matches the invoice month (already debited in this invoice).
/// due_month now stores the invoice due month directly.
fn query_current_installments(
    conn: &rusqlite::Connection,
    account_id: &str,
    due_month: i32, due_year: i32,
) -> Result<Vec<Installment>, String> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.transaction_id, i.total_installments, i.installment_number, i.installment_amount,
                i.due_month, i.due_year, i.paid,
                t.description, c.name, c.color
         FROM installments i
         JOIN transactions t ON t.id = i.transaction_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.account_id = ?1 AND i.due_month = ?2 AND i.due_year = ?3
         AND t.total_installments > 1
         ORDER BY i.installment_number"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![account_id, due_month, due_year], |row| {
        Ok(Installment {
            id: row.get(0)?, transaction_id: row.get(1)?, total_installments: row.get(2)?,
            installment_number: row.get(3)?, installment_amount: row.get(4)?,
            due_month: row.get(5)?, due_year: row.get(6)?, paid: row.get::<_, i32>(7)? != 0,
            description: row.get(8)?, category_name: row.get(9)?, category_color: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

/// Query installments due in invoices AFTER the current one.
/// due_month > invoice month means future invoice.
fn query_future_installments(
    conn: &rusqlite::Connection,
    account_id: &str,
    due_month: i32, due_year: i32,
) -> Result<Vec<Installment>, String> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.transaction_id, i.total_installments, i.installment_number, i.installment_amount,
                i.due_month, i.due_year, i.paid,
                t.description, c.name, c.color
         FROM installments i
         JOIN transactions t ON t.id = i.transaction_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.account_id = ?1 AND t.total_installments > 1 AND i.paid = 0
         AND (i.due_year > ?3 OR (i.due_year = ?3 AND i.due_month > ?2))
         ORDER BY i.due_year, i.due_month, i.installment_number"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![account_id, due_month, due_year], |row| {
        Ok(Installment {
            id: row.get(0)?, transaction_id: row.get(1)?, total_installments: row.get(2)?,
            installment_number: row.get(3)?, installment_amount: row.get(4)?,
            due_month: row.get(5)?, due_year: row.get(6)?, paid: row.get::<_, i32>(7)? != 0,
            description: row.get(8)?, category_name: row.get(9)?, category_color: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_invoice(db: State<Database>, account_id: String, month: i32, year: i32) -> Result<InvoiceData, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let account = conn.query_row(
        "SELECT id, name, balance, credit_limit, closing_day, due_day FROM accounts WHERE id = ?1",
        rusqlite::params![account_id],
        |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?,
                row.get::<_, Option<f64>>(3)?, row.get::<_, Option<i32>>(4)?, row.get::<_, Option<i32>>(5)?))
        }
    ).map_err(|e| e.to_string())?;

    let closing_day = account.4.unwrap_or(1);
    let due_day = account.5.unwrap_or(10);

    // month/year = invoice due month (e.g., 6/2026 = "Fatura de Junho", vence 05/06)
    let (curr_month, curr_year, prev_month, prev_year) = invoice_period(month, year, closing_day);

    let transactions = query_single_pay(&conn, &account_id, curr_month, curr_year, prev_month, prev_year, closing_day)?;
    let current_installments = query_current_installments(&conn, &account_id, month, year)?;
    let installments_due = query_future_installments(&conn, &account_id, month, year)?;

    let tx_total: f64 = transactions.iter().map(|t| t.amount).sum();
    let current_inst_total: f64 = current_installments.iter().map(|i| i.installment_amount).sum();
    let future_inst_total: f64 = installments_due.iter().map(|i| i.installment_amount).sum();

    Ok(InvoiceData {
        month, year, account_id,
        account_name: account.1,
        total: tx_total + current_inst_total,
        pending_installments_total: future_inst_total,
        limit: account.3.unwrap_or(0.0),
        closing_day,
        due_day,
        transactions,
        current_installments,
        installments_due,
    })
}
