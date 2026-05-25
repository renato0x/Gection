use tauri::State;
use crate::db::{Database, models::*};
use chrono::Datelike;

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
pub fn get_credit_usage(db: State<Database>) -> Result<Vec<CreditUsage>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, name, credit_limit, closing_day FROM accounts WHERE type = 'credit'"
    ).map_err(|e| e.to_string())?;

    let accounts: Vec<(String, String, Option<f64>, Option<i32>)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    let today = chrono::Local::now();
    let today_day = today.day() as i32;
    let today_month = today.month() as i32;
    let today_year = today.year();

    let mut results = Vec::new();

    for (account_id, account_name, credit_limit, closing_day) in accounts {
        let cd = closing_day.unwrap_or(1);
        let limit = credit_limit.unwrap_or(0.0);

        let (curr_due_month, curr_due_year) = if today_day > cd {
            if today_month == 12 { (1, today_year + 1) } else { (today_month + 1, today_year) }
        } else {
            (today_month, today_year)
        };

        let (curr_month, curr_year, prev_month, prev_year) = invoice_period(curr_due_month, curr_due_year, cd);

        // 1. Current invoice: single-pay transactions in the current closing cycle
        let single_pay_total: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions
             WHERE account_id = ?1 AND type = 'credit'
             AND (total_installments IS NULL OR total_installments <= 1)
             AND (
               (CAST(strftime('%d', date) AS INTEGER) <= ?4 AND CAST(strftime('%m', date) AS INTEGER) = ?2 AND CAST(strftime('%Y', date) AS INTEGER) = ?3)
               OR
               (CAST(strftime('%d', date) AS INTEGER) > ?4 AND CAST(strftime('%m', date) AS INTEGER) = ?5 AND CAST(strftime('%Y', date) AS INTEGER) = ?6)
             )",
            rusqlite::params![account_id, curr_month, curr_year, cd, prev_month, prev_year],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        // 2. Installments due THIS month
        let current_inst_total: f64 = conn.query_row(
            "SELECT COALESCE(SUM(i.installment_amount), 0) FROM installments i
             JOIN transactions t ON t.id = i.transaction_id
             WHERE t.account_id = ?1 AND i.due_month = ?2 AND i.due_year = ?3 AND i.paid = 0",
            rusqlite::params![account_id, curr_due_month, curr_due_year],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        let current_invoice_total = single_pay_total + current_inst_total;

        // 3. Future installments (due after current invoice month)
        let future_inst_total: f64 = conn.query_row(
            "SELECT COALESCE(SUM(i.installment_amount), 0) FROM installments i
             JOIN transactions t ON t.id = i.transaction_id
             WHERE t.account_id = ?1 AND i.paid = 0
             AND (i.due_year > ?3 OR (i.due_year = ?3 AND i.due_month > ?2))",
            rusqlite::params![account_id, curr_due_month, curr_due_year],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        // 4. Next-cycle single-pay: purchases that will appear on the next invoice
        let (next_due_month, next_due_year) = if curr_due_month == 12 {
            (1, curr_due_year + 1)
        } else {
            (curr_due_month + 1, curr_due_year)
        };
        let (next_curr_month, next_curr_year, next_prev_month, next_prev_year) = invoice_period(next_due_month, next_due_year, cd);

        let next_cycle_single_pay: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions
             WHERE account_id = ?1 AND type = 'credit'
             AND (total_installments IS NULL OR total_installments <= 1)
             AND (
               (CAST(strftime('%d', date) AS INTEGER) <= ?4 AND CAST(strftime('%m', date) AS INTEGER) = ?2 AND CAST(strftime('%Y', date) AS INTEGER) = ?3)
               OR
               (CAST(strftime('%d', date) AS INTEGER) > ?4 AND CAST(strftime('%m', date) AS INTEGER) = ?5 AND CAST(strftime('%Y', date) AS INTEGER) = ?6)
             )",
            rusqlite::params![account_id, next_curr_month, next_curr_year, cd, next_prev_month, next_prev_year],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        // 5. Processing: not used — every transaction is immediately assigned to a cycle
        // (current or future), so there is no "authorized but not posted" state.
        let processing_total: f64 = 0.0;

        let future_invoices_total = future_inst_total + next_cycle_single_pay;
        let total_used = current_invoice_total + future_invoices_total + processing_total;
        let available = (limit - total_used).max(0.0);

        results.push(CreditUsage {
            account_id,
            account_name,
            credit_limit: limit,
            current_invoice_total,
            future_invoices_total,
            processing_total,
            total_used,
            available,
        });
    }

    Ok(results)
}

#[tauri::command]
pub fn get_future_invoices(db: State<Database>, account_id: String) -> Result<Vec<FutureInvoiceGroup>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let closing_day: Option<i32> = conn.query_row(
        "SELECT closing_day FROM accounts WHERE id = ?1",
        rusqlite::params![account_id],
        |row| row.get(0),
    ).ok().flatten();

    let today = chrono::Local::now();
    let today_day = today.day() as i32;
    let today_month = today.month() as i32;
    let today_year = today.year();

    let (curr_due_month, curr_due_year) = match closing_day {
        Some(cd) if today_day > cd => {
            if today_month == 12 { (1, today_year + 1) } else { (today_month + 1, today_year) }
        }
        _ => (today_month, today_year),
    };

    let mut stmt = conn.prepare(
        "SELECT i.id, i.transaction_id, i.total_installments, i.installment_number, i.installment_amount,
                i.due_month, i.due_year, i.paid,
                t.description, c.name, c.color
         FROM installments i
         JOIN transactions t ON t.id = i.transaction_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.account_id = ?1 AND i.paid = 0
         AND (i.due_year > ?3 OR (i.due_year = ?3 AND i.due_month > ?2))
         ORDER BY i.due_year, i.due_month, i.installment_number"
    ).map_err(|e| e.to_string())?;

    let installments: Vec<Installment> = stmt.query_map(
        rusqlite::params![account_id, curr_due_month, curr_due_year],
        |row| {
            Ok(Installment {
                id: row.get(0)?, transaction_id: row.get(1)?, total_installments: row.get(2)?,
                installment_number: row.get(3)?, installment_amount: row.get(4)?,
                due_month: row.get(5)?, due_year: row.get(6)?, paid: row.get::<_, i32>(7)? != 0,
                description: row.get(8)?, category_name: row.get(9)?, category_color: row.get(10)?,
            })
        }
    ).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    // Group by due_month/due_year in Rust
    let mut groups: std::collections::BTreeMap<(i32, i32), Vec<Installment>> = std::collections::BTreeMap::new();
    for i in installments {
        groups.entry((i.due_month, i.due_year)).or_default().push(i);
    }

    let result = groups.into_iter().map(|((dm, dy), insts)| {
        let total: f64 = insts.iter().map(|i| i.installment_amount).sum();
        FutureInvoiceGroup { due_month: dm, due_year: dy, total, installments: insts }
    }).collect();

    Ok(result)
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
