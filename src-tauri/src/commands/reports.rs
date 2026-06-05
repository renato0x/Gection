use std::fs;
use tauri::State;
use crate::db::Database;
use crate::db::models::{
    Transaction, Installment, Tag,
    ReportFilter, ConsolidatedReport, PeriodInfo, ReportSummary,
    CategoryBreakdown, AccountBreakdown,
};

fn last_day_of_month(year: i32, month: i32) -> i32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 { 29 } else { 28 },
        _ => 30,
    }
}

fn period_label(m1: i32, y1: i32, m2: i32, y2: i32) -> String {
    let months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    if y1 == y2 && m1 == m2 {
        format!("{} de {}", months[(m1 - 1) as usize], y1)
    } else if y1 == y2 {
        format!("{} a {} de {}", months[(m1 - 1) as usize], months[(m2 - 1) as usize], y1)
    } else {
        format!("{} {} a {} {}", months[(m1 - 1) as usize], y1, months[(m2 - 1) as usize], y2)
    }
}

fn shift_period(m: i32, y: i32, months_back: i32) -> (i32, i32) {
    let total = y * 12 + m - 1 - months_back;
    ((total % 12) + 1, total / 12)
}

fn date_start(m: i32, y: i32) -> String {
    format!("{:04}-{:02}-01", y, m)
}

fn date_end(m: i32, y: i32) -> String {
    format!("{:04}-{:02}-{:02}", y, m, last_day_of_month(y, m))
}

fn load_tags(conn: &rusqlite::Connection, tx_id: &str) -> Result<Vec<Tag>, String> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color FROM tags t
         JOIN transaction_tags tt ON tt.tag_id = t.id
         WHERE tt.transaction_id = ?1"
    ).map_err(|e| e.to_string())?;
    let tags = stmt.query_map(rusqlite::params![tx_id], |row| {
        Ok(Tag { id: row.get(0)?, name: row.get(1)?, color: row.get(2)? })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(tags)
}

fn load_installments(conn: &rusqlite::Connection, tx_id: &str) -> Result<Vec<Installment>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, transaction_id, total_installments, installment_number, installment_amount, due_month, due_year, paid
         FROM installments WHERE transaction_id = ?1 ORDER BY installment_number"
    ).map_err(|e| e.to_string())?;
    let insts = stmt.query_map(rusqlite::params![tx_id], |row| {
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
    Ok(insts)
}

fn build_report(filter: &ReportFilter, conn: &rusqlite::Connection) -> Result<ConsolidatedReport, String> {
    let date_from = date_start(filter.month_from, filter.year_from);
    let date_to = date_end(filter.month_to, filter.year_to);

    let (extra_where, _extra_params_sql) = {
        let mut conds = Vec::new();
        let mut ph = 3;
        if filter.account_id.is_some() { conds.push(format!("t.account_id = ?{}", ph)); ph += 1; }
        if filter.category_id.is_some() { conds.push(format!("t.category_id = ?{}", ph)); ph += 1; }
        if let Some(ref tt) = filter.transaction_type {
            match tt.as_str() {
                "income" => conds.push("t.type = 'income'".to_string()),
                "expense" => conds.push("t.type IN ('expense','credit')".to_string()),
                "debit_only" => conds.push("t.type = 'expense'".to_string()),
                _ => {}
            }
        }
        (conds, ph)
    };

    let extra_clause = if extra_where.is_empty() {
        String::new()
    } else {
        format!(" AND {}", extra_where.join(" AND "))
    };

    // Build params vec with date_from, date_to + optional filters
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(date_from.clone()),
        Box::new(date_to.clone()),
    ];
    if let Some(ref aid) = filter.account_id {
        params.push(Box::new(aid.clone()));
    }
    if let Some(ref cid) = filter.category_id {
        params.push(Box::new(cid.clone()));
    }

    let summary_sql = format!(
        "SELECT
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0),
            COUNT(*)
         FROM transactions t
         WHERE t.date >= ?1 AND t.date <= ?2{}", extra_clause
    );

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let (total_income, total_expense_debit, total_expense_credit, tx_count): (f64, f64, f64, i32) = conn.query_row(
        &summary_sql, params_refs.as_slice(),
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| e.to_string())?;

    let total_expense = total_expense_debit + total_expense_credit;
    let net = total_income - total_expense;

    let balance_current: f64 = conn.query_row(
        "SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN 0 ELSE balance END), 0) FROM accounts",
        [], |row| row.get(0),
    ).unwrap_or(0.0);

    let summary = ReportSummary { total_income, total_expense, total_expense_debit, total_expense_credit, net, balance_current, tx_count };

    // Previous period
    let period_len = (filter.year_to - filter.year_from) * 12 + (filter.month_to - filter.month_from) + 1;
    let (pm_from, py_from) = shift_period(filter.month_from, filter.year_from, period_len);
    let (pm_to, py_to) = shift_period(filter.month_to, filter.year_to, period_len);

    let prev_summary = if py_from >= 2000 {
        let prev_from = date_start(pm_from, py_from);
        let prev_to = date_end(pm_to, py_to);
        let psql = format!(
            "SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0),
                    COUNT(*)
             FROM transactions t WHERE t.date >= ?1 AND t.date <= ?2{}", extra_clause
        );
        let mut pparams: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
            Box::new(prev_from), Box::new(prev_to),
        ];
        if let Some(ref aid) = filter.account_id { pparams.push(Box::new(aid.clone())); }
        if let Some(ref cid) = filter.category_id { pparams.push(Box::new(cid.clone())); }
        let pref: Vec<&dyn rusqlite::types::ToSql> = pparams.iter().map(|p| p.as_ref()).collect();

        conn.query_row(&psql, pref.as_slice(), |row| {
            let pi: f64 = row.get(0)?;
            let pd: f64 = row.get(1)?;
            let pc: f64 = row.get(2)?;
            let pt: i32 = row.get(3)?;
            Ok(ReportSummary {
                total_income: pi,
                total_expense: pd + pc,
                total_expense_debit: pd,
                total_expense_credit: pc,
                net: pi - (pd + pc),
                balance_current: 0.0,
                tx_count: pt,
            })
        }).ok()
    } else { None };

    // Category breakdowns
    let cat_sql = |type_clause: &str| format!(
        "SELECT c.id, c.name, c.color, c.icon, COALESCE(SUM(t.amount), 0), COUNT(*)
         FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.date >= ?1 AND t.date <= ?2{} AND t.type IN ({})
         GROUP BY c.id ORDER BY SUM(t.amount) DESC", extra_clause, type_clause
    );

    let build_cats = |sql: &str| -> Result<Vec<CategoryBreakdown>, String> {
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(CategoryBreakdown {
                category_id: row.get(0)?,
                category_name: row.get::<_, Option<String>>(1)?.unwrap_or_else(|| "Sem categoria".to_string()),
                category_color: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "#94a3b8".to_string()),
                category_icon: row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "tag".to_string()),
                total: row.get(4)?,
                percentage: 0.0,
                count: row.get(5)?,
            })
        }).map_err(|e| e.to_string())?;
        let mut cats: Vec<CategoryBreakdown> = rows.filter_map(|r| r.ok()).collect();
        let grand = cats.iter().map(|c| c.total).sum::<f64>();
        for c in &mut cats { c.percentage = if grand > 0.0 { (c.total / grand) * 100.0 } else { 0.0 }; }
        Ok(cats)
    };

    let income_by_category = build_cats(&cat_sql("'income'"))?;
    let expense_by_category = build_cats(&cat_sql("'expense','credit'"))?;

    // Account breakdown
    let a_sql = format!(
        "SELECT a.id, a.name, a.type,
                COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN t.type IN ('expense','credit') THEN t.amount ELSE 0 END), 0),
                a.balance
         FROM accounts a
         LEFT JOIN transactions t ON t.account_id = a.id AND t.date >= ?1 AND t.date <= ?2
         GROUP BY a.id ORDER BY a.type, a.name"
    );
    let by_account: Vec<AccountBreakdown> = {
        let mut stmt = conn.prepare(&a_sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(rusqlite::params![date_from, date_to], |row| {
            Ok(AccountBreakdown {
                account_id: row.get(0)?,
                account_name: row.get(1)?,
                account_type: row.get(2)?,
                income: row.get(3)?,
                expense: row.get(4)?,
                balance: row.get(5)?,
            })
        }).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    // Transactions
    let tx_sql = format!(
        "SELECT t.id, t.account_id, t.category_id, t.type, t.amount, t.description,
                t.date, t.total_installments, t.created_at,
                a.name, c.name, c.color, t.subscription_id
         FROM transactions t
         LEFT JOIN accounts a ON a.id = t.account_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.date >= ?1 AND t.date <= ?2{}
         ORDER BY t.date DESC, t.created_at DESC LIMIT 200", extra_clause
    );

    let transactions: Vec<Transaction> = {
        let mut stmt = conn.prepare(&tx_sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(Transaction {
                id: row.get(0)?, account_id: row.get(1)?, category_id: row.get(2)?,
                transaction_type: row.get(3)?, amount: row.get(4)?, description: row.get(5)?,
                date: row.get(6)?, total_installments: row.get(7)?, created_at: row.get(8)?,
                account_name: row.get(9)?, category_name: row.get(10)?, category_color: row.get(11)?,
                subscription_id: row.get(12)?,
                tags: vec![], installments: vec![],
            })
        }).map_err(|e| e.to_string())?;
        let mut txs: Vec<Transaction> = rows.filter_map(|r| r.ok()).collect();
        for tx in &mut txs {
            tx.tags = load_tags(conn, &tx.id).unwrap_or_default();
            tx.installments = load_installments(conn, &tx.id).unwrap_or_default();
        }
        txs
    };

    let label = period_label(filter.month_from, filter.year_from, filter.month_to, filter.year_to);
    let prev_label = period_label(pm_from, py_from, pm_to, py_to);

    Ok(ConsolidatedReport {
        period: PeriodInfo { month_from: filter.month_from, year_from: filter.year_from, month_to: filter.month_to, year_to: filter.year_to, label, prev_label },
        summary, prev_summary, income_by_category, expense_by_category, by_account, transactions,
    })
}

#[tauri::command]
pub fn get_consolidated_report(db: State<Database>, filter: ReportFilter) -> Result<ConsolidatedReport, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    build_report(&filter, &conn)
}

#[tauri::command]
pub fn export_report_csv(db: State<Database>, filter: ReportFilter, save_path: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let report = build_report(&filter, &conn)?;
    drop(conn);

    let mut wtr = csv::WriterBuilder::new()
        .flexible(true)
        .from_writer(Vec::new());

    let header = format!("Relatório Consolidado - GECTION - {}", report.period.label);
    wtr.write_record(&[&header]).map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%d/%m/%Y %H:%M").to_string();
    wtr.write_record(&["Gerado em:", &now]).map_err(|e| e.to_string())?;
    wtr.write_record(&[] as &[&str]).map_err(|e| e.to_string())?;

    // Summary
    wtr.write_record(&["=== RESUMO ==="]).map_err(|e| e.to_string())?;
    wtr.write_record(&["Receitas", &fmt_cash(report.summary.total_income)]).map_err(|e| e.to_string())?;
    wtr.write_record(&["Despesas", &fmt_cash(report.summary.total_expense)]).map_err(|e| e.to_string())?;
    wtr.write_record(&["  Débito", &fmt_cash(report.summary.total_expense_debit)]).map_err(|e| e.to_string())?;
    wtr.write_record(&["  Crédito", &fmt_cash(report.summary.total_expense_credit)]).map_err(|e| e.to_string())?;
    wtr.write_record(&["Saldo Líquido", &fmt_cash(report.summary.net)]).map_err(|e| e.to_string())?;
    wtr.write_record(&["Saldo Atual", &fmt_cash(report.summary.balance_current)]).map_err(|e| e.to_string())?;
    wtr.write_record(&["Transações", &report.summary.tx_count.to_string()]).map_err(|e| e.to_string())?;

    if let Some(ref p) = report.prev_summary {
        wtr.write_record(&["--- Período Anterior: ", &report.period.prev_label]).map_err(|e| e.to_string())?;
        wtr.write_record(&["Receitas (ant.)", &fmt_cash(p.total_income)]).map_err(|e| e.to_string())?;
        wtr.write_record(&["Despesas (ant.)", &fmt_cash(p.total_expense)]).map_err(|e| e.to_string())?;
    }

    wtr.write_record(&[] as &[&str]).map_err(|e| e.to_string())?;

    // Income categories
    wtr.write_record(&["=== RECEITAS POR CATEGORIA ==="]).map_err(|e| e.to_string())?;
    wtr.write_record(&["Categoria", "Valor", "%", "Qtd"]).map_err(|e| e.to_string())?;
    for c in &report.income_by_category {
        wtr.write_record(&[&c.category_name, &fmt_cash(c.total), &fmt_pct(c.percentage), &c.count.to_string()])
            .map_err(|e| e.to_string())?;
    }
    wtr.write_record(&[] as &[&str]).map_err(|e| e.to_string())?;

    // Expense categories
    wtr.write_record(&["=== DESPESAS POR CATEGORIA ==="]).map_err(|e| e.to_string())?;
    wtr.write_record(&["Categoria", "Valor", "%", "Qtd"]).map_err(|e| e.to_string())?;
    for c in &report.expense_by_category {
        wtr.write_record(&[&c.category_name, &fmt_cash(c.total), &fmt_pct(c.percentage), &c.count.to_string()])
            .map_err(|e| e.to_string())?;
    }
    wtr.write_record(&[] as &[&str]).map_err(|e| e.to_string())?;

    // Transactions
    wtr.write_record(&["=== TRANSAÇÕES ==="]).map_err(|e| e.to_string())?;
    wtr.write_record(&["Data", "Descrição", "Categoria", "Conta", "Valor", "Tipo"]).map_err(|e| e.to_string())?;
    for t in &report.transactions {
        wtr.write_record(&[
            &t.date, &t.description,
            t.category_name.as_deref().unwrap_or("-"),
            t.account_name.as_deref().unwrap_or("-"),
            &fmt_cash(t.amount), &t.transaction_type,
        ]).map_err(|e| e.to_string())?;
    }

    let data = wtr.into_inner().map_err(|e| e.to_string())?;
    fs::write(&save_path, &data).map_err(|e| format!("Erro ao salvar CSV: {}", e))?;

    Ok(())
}

fn fmt_cash(v: f64) -> String {
    format!("R$ {:.2}", v)
}

fn fmt_pct(v: f64) -> String {
    format!("{:.1}%", v)
}
