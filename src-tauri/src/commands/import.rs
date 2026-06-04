use std::fs;
use std::collections::HashMap;
use tauri::State;
use regex::Regex;
use quick_xml::Reader;
use quick_xml::events::Event;
use uuid::Uuid;
use chrono::Datelike;
use crate::db::Database;
use crate::db::models::{
    ParsedTransaction, ImportPreview,
    ImportRequest, ImportResult,
};

fn map_trntype(trntype: &str) -> &str {
    match trntype.to_uppercase().as_str() {
        "CREDIT" | "DEP" | "DEPOSIT" | "INT" | "INTEREST" | "DIV" => "income",
        "DEBIT" | "CHECK" | "ATM" | "FEE" | "SRVCHG" => "expense",
        "XFER" => "transfer",
        _ => {
            if trntype.to_uppercase().contains("CREDIT") { "income" }
            else { "expense" }
        }
    }
}

fn ofx_date_to_iso(ofx_date: &str) -> String {
    let cleaned = ofx_date.trim();
    if cleaned.len() >= 8 {
        let y = &cleaned[0..4];
        let m = &cleaned[4..6];
        let d = &cleaned[6..8];
        format!("{}-{}-{}", y, m, d)
    } else {
        cleaned.to_string()
    }
}

fn parse_ofx(content: &str) -> Result<Vec<ParsedTransaction>, String> {
    let xml_start = content.find("<OFX>")
        .or_else(|| content.find("<ofx>"))
        .ok_or_else(|| "Arquivo OFX inválido: tag <OFX> não encontrada".to_string())?;

    let xml_content = &content[xml_start..];

    let mut reader = Reader::from_str(xml_content);
    reader.config_mut().check_end_names = false;
    reader.config_mut().trim_text(true);

    let mut transactions: Vec<ParsedTransaction> = Vec::new();
    let mut tag_stack: Vec<String> = Vec::new();
    let mut in_stmttrn = false;
    let mut is_credit_card = false;
    let mut line_num: i32 = 0;

    let mut date = String::new();
    let mut amount = 0.0_f64;
    let mut description = String::new();
    let mut txn_type = String::new();
    let mut fit_id: Option<String> = None;

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_uppercase();
                tag_stack.push(name.clone());

                match name.as_str() {
                    "CCACCTFROM" | "CCSTMTRS" | "CREDITCARDMSGSRSV1" => is_credit_card = true,
                    "STMTTRN" => {
                        if in_stmttrn {
                            let parsed = ParsedTransaction {
                                line: line_num, date: date.clone(), amount,
                                description: description.clone(),
                                transaction_type: txn_type.clone(),
                                fit_id: fit_id.take(),
                                source: String::new(),
                                category_name: None,
                                installment_group_key: None,
                                installment_total: None,
                            };
                            transactions.push(parsed);
                        }
                        in_stmttrn = true;
                        date.clear(); amount = 0.0; description.clear();
                        txn_type.clear(); fit_id = None;
                        line_num += 1;
                    }
                    _ => {}
                }
            }

            Ok(Event::End(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_uppercase();
                if name == "STMTTRN" && in_stmttrn {
                    let parsed = ParsedTransaction {
                        line: line_num, date: date.clone(), amount,
                        description: description.clone(),
                        transaction_type: txn_type.clone(),
                        fit_id: fit_id.take(),
                        source: String::new(),
                        category_name: None,
                        installment_group_key: None,
                        installment_total: None,
                    };
                    transactions.push(parsed);
                    in_stmttrn = false;
                    date.clear(); amount = 0.0; description.clear();
                    txn_type.clear();
                }
                tag_stack.pop();
            }

            Ok(Event::Text(ref e)) => {
                if !in_stmttrn { buf.clear(); continue; }
                let text = String::from_utf8_lossy(e.as_ref()).to_string();
                let text = text.trim().to_string();
                if text.is_empty() { buf.clear(); continue; }

                if let Some(parent) = tag_stack.last() {
                    match parent.as_str() {
                        "TRNTYPE" => txn_type = map_trntype(&text).to_string(),
                        "DTPOSTED" => date = ofx_date_to_iso(&text),
                        "TRNAMT" => {
                            if let Ok(v) = text.replace(',', ".").parse::<f64>() {
                                amount = v.abs();
                                if v < 0.0 && txn_type.is_empty() {
                                    txn_type = "expense".to_string();
                                }
                            }
                        }
                        "FITID" => fit_id = Some(text),
                        "NAME" => description = text,
                        "MEMO" => if description.is_empty() { description = text; },
                        _ => {}
                    }
                }
            }

            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("Erro ao processar OFX: {}", e)),
            _ => {}
        }
        buf.clear();
    }

    if in_stmttrn && !date.is_empty() {
        let parsed = ParsedTransaction {
            line: line_num, date, amount,
            description: description.clone(),
            transaction_type: txn_type,
            fit_id,
            source: String::new(),
            category_name: None,
            installment_group_key: None,
            installment_total: None,
        };
        transactions.push(parsed);
    }

    for t in &mut transactions {
        if is_credit_card {
            if t.transaction_type == "expense" {
                t.transaction_type = "credit".to_string();
            }
            t.source = if is_credit_card { "credit_card".to_string() } else { "checking".to_string() };
        }
    }

    Ok(transactions)
}

fn parse_csv_auto(_content: &str, columns: &[String], rows: &[Vec<String>]) -> Vec<ParsedTransaction> {
    let lower: Vec<String> = columns.iter().map(|c| {
        c.to_lowercase().chars().filter(|ch| ch.is_alphanumeric()).collect()
    }).collect();

    let idx_date = lower.iter().position(|c| matches!(c.as_str(), "data" | "date"));
    let idx_amount = lower.iter().position(|c| matches!(c.as_str(), "valor" | "amount" | "valor(r$)" | "valorr$"));
    let idx_desc = lower.iter().position(|c| matches!(c.as_str(), "descricao" | "description" | "descrição" | "nome" | "name"));
    let idx_fitid = lower.iter().position(|c| matches!(c.as_str(), "identificador" | "id" | "fitid"));
    let idx_type = lower.iter().position(|c| matches!(c.as_str(), "tipo" | "type" | "trntype"));

    let mut transactions = Vec::new();

    for (i, row) in rows.iter().enumerate() {
        let date = idx_date.and_then(|i| row.get(i).map(|s| s.trim().to_string())).unwrap_or_default();
        let desc = idx_desc.and_then(|i| row.get(i).map(|s| s.trim().to_string())).unwrap_or_default();
        let fit_id = idx_fitid.and_then(|i| row.get(i).map(|s| if s.trim().is_empty() { String::new() } else { s.trim().to_string() }));
        let fit_id = fit_id.filter(|s| !s.is_empty());

        let raw_amount = idx_amount.and_then(|i| row.get(i).map(|s| s.trim().replace(',', ".").replace("R$", "").replace(" ", ""))).unwrap_or_default();
        let amount = raw_amount.parse::<f64>().unwrap_or(0.0).abs();

        let raw_type = idx_type.and_then(|i| row.get(i).map(|s| s.trim().to_lowercase())).unwrap_or_default();
        let txn_type = if raw_type.contains("credito") || raw_type.contains("credit") || raw_type.contains("receita") || raw_type.contains("income") {
            "income"
        } else if raw_type.contains("debito") || raw_type.contains("debit") || raw_type.contains("despesa") || raw_type.contains("expense") {
            "expense"
        } else {
            ""
        };

        transactions.push(ParsedTransaction {
            line: (i + 1) as i32,
            date: normalize_date(&date),
            amount,
            description: desc,
            transaction_type: txn_type.to_string(),
            fit_id,
            source: String::new(),
            category_name: None,
            installment_group_key: None,
            installment_total: None,
        });
    }

    transactions
}

fn normalize_date(date: &str) -> String {
    let d = date.trim();
    if d.contains('-') && d.len() == 10 { return d.to_string(); }
    if d.contains('/') {
        let parts: Vec<&str> = d.split('/').collect();
        if parts.len() == 3 {
            if parts[2].len() == 4 {
                return format!("{}-{:0>2}-{:0>2}", parts[2], parts[0], parts[1]);
            }
        }
    }
    d.to_string()
}

fn detect_installments(transactions: &[ParsedTransaction]) -> Vec<ParsedTransaction> {
    let re = Regex::new(r"(?i)\s*[-–—]\s*Parc(?:ela)?\.?\s*\d+\s*/\s*(\d+)\s*$").unwrap();
    let mut groups: HashMap<String, Vec<(usize, ParsedTransaction)>> = HashMap::new();

    for (idx, txn) in transactions.iter().enumerate() {
        if let Some(caps) = re.captures(&txn.description) {
            let total: i32 = caps.get(1).unwrap().as_str().parse().unwrap_or(1);
            let start = caps.get(0).unwrap().start();
            let base = txn.description[..start].trim().to_string();
            let key = format!("{}||{}", base, total);
            let mut item = txn.clone();
            item.installment_group_key = Some(key.clone());
            item.installment_total = Some(total);
            groups.entry(key).or_default().push((idx, item));
        }
    }

    let mut result: Vec<ParsedTransaction> = Vec::new();
    let mut used: std::collections::HashSet<usize> = std::collections::HashSet::new();

    for (_key, group) in groups {
        if group.len() < 2 { continue; }
        let total_amt: f64 = group.iter().map(|(_, t)| t.amount).sum();
        let total_inst = group[0].1.installment_total.unwrap_or(group.len() as i32);

        let first = &group[0].1;
        result.push(ParsedTransaction {
            line: first.line,
            date: first.date.clone(),
            amount: total_amt,
            description: group[0].1.description.split(" - Parc").next().unwrap_or(&first.description).trim().to_string(),
            transaction_type: first.transaction_type.clone(),
            fit_id: None,
            source: first.source.clone(),
            category_name: first.category_name.clone(),
            installment_group_key: first.installment_group_key.clone(),
            installment_total: Some(total_inst),
        });

        for (idx, _) in &group { used.insert(*idx); }
    }

    for (idx, txn) in transactions.iter().enumerate() {
        if !used.contains(&idx) {
            result.push(txn.clone());
        }
    }

    result
}

#[tauri::command]
pub fn parse_import_file(path: String) -> Result<ImportPreview, String> {
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Erro ao ler arquivo: {}", e))?;

    let lower = path.to_lowercase();
    let format = if lower.ends_with(".ofx") || lower.ends_with(".ofc") { "ofx" }
                 else if lower.ends_with(".csv") { "csv" }
                 else { return Err("Formato não suportado. Use .csv, .ofx ou .ofc".to_string()); };

    match format {
        "ofx" => {
            let mut transactions = parse_ofx(&content)?;
            transactions = detect_installments(&transactions);
            Ok(ImportPreview {
                format: "ofx".to_string(),
                columns: vec![],
                auto_parsed: true,
                transactions,
            })
        }
        "csv" => {
            let mut reader = csv::ReaderBuilder::new()
                .has_headers(true)
                .flexible(true)
                .from_reader(content.as_bytes());

            let headers: Vec<String> = reader.headers()
                .map_err(|e| format!("Erro ao ler cabeçalho CSV: {}", e))?
                .iter().map(|h| h.to_string()).collect();

            let rows: Vec<Vec<String>> = reader.records()
                .filter_map(|r| r.ok())
                .map(|r| r.iter().map(|f| f.to_string()).collect())
                .collect();

            let transactions = parse_csv_auto(&content, &headers, &rows);

            if transactions.is_empty() || transactions.iter().all(|t| t.date.is_empty() || t.amount == 0.0) {
                Ok(ImportPreview {
                    format: "csv".to_string(),
                    columns: headers,
                    auto_parsed: false,
                    transactions,
                })
            } else {
                let mut parsed = transactions;
                parsed = detect_installments(&parsed);
                let has_fitid = parsed.iter().any(|t| t.fit_id.is_some());
                if !has_fitid {
                    for t in &mut parsed {
                        t.fit_id = Some(format!("csv-{}-{}", t.date, t.amount));
                    }
                }
                Ok(ImportPreview {
                    format: "csv".to_string(),
                    columns: headers,
                    auto_parsed: true,
                    transactions: parsed,
                })
            }
        }
        _ => Err("Formato não suportado".to_string())
    }
}

#[tauri::command]
pub fn parse_csv_with_mapping(path: String, column_map: Vec<String>) -> Result<ImportPreview, String> {
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Erro ao ler arquivo: {}", e))?;

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(content.as_bytes());

    let headers: Vec<String> = reader.headers()
        .map_err(|e| format!("Erro ao ler cabeçalho CSV: {}", e))?
        .iter().map(|h| h.to_string()).collect();

    let rows: Vec<Vec<String>> = reader.records()
        .filter_map(|r| r.ok())
        .map(|r| r.iter().map(|f| f.to_string()).collect())
        .collect();

    let mut idx_date: Option<usize> = None;
    let mut idx_amount: Option<usize> = None;
    let mut idx_desc: Option<usize> = None;
    let mut idx_fitid: Option<usize> = None;
    let mut idx_type: Option<usize> = None;

    for (col_idx, field) in column_map.iter().enumerate() {
        match field.as_str() {
            "date" => idx_date = Some(col_idx),
            "amount" => idx_amount = Some(col_idx),
            "description" => idx_desc = Some(col_idx),
            "fit_id" => idx_fitid = Some(col_idx),
            "txn_type" => idx_type = Some(col_idx),
            _ => {}
        }
    }

    let mut transactions = Vec::new();
    for (i, row) in rows.iter().enumerate() {
        let date = idx_date.and_then(|i| row.get(i)).map(|s| normalize_date(s)).unwrap_or_default();
        let desc = idx_desc.and_then(|i| row.get(i)).map(|s| s.trim().to_string()).unwrap_or_default();
        let fit_id = idx_fitid.and_then(|i| row.get(i)).map(|s| {
            let s = s.trim().to_string();
            if s.is_empty() { format!("csv-{}-{}", date, i) } else { s }
        });
        let raw = idx_amount.and_then(|i| row.get(i)).map(|s| {
            s.trim().replace(',', ".").replace("R$", "").replace(" ", "")
        }).unwrap_or_default();
        let amount = raw.parse::<f64>().unwrap_or(0.0).abs();
        let raw_type = idx_type.and_then(|i| row.get(i)).map(|s| s.trim().to_lowercase()).unwrap_or_default();
        let txn_type = if raw_type.contains("credito") || raw_type.contains("credit") { "income" }
                       else if raw_type.contains("debito") || raw_type.contains("debit") { "expense" }
                       else { "" };

        transactions.push(ParsedTransaction {
            line: (i + 1) as i32,
            date, amount, description: desc,
            transaction_type: txn_type.to_string(),
            fit_id,
            source: String::new(),
            category_name: None,
            installment_group_key: None,
            installment_total: None,
        });
    }

    transactions = detect_installments(&transactions);

    Ok(ImportPreview {
        format: "csv".to_string(),
        columns: headers,
        auto_parsed: true,
        transactions,
    })
}

#[tauri::command]
pub fn import_transactions(db: State<Database>, request: ImportRequest) -> Result<ImportResult, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut imported = 0i32;
    let mut skipped = 0i32;
    let mut errors: Vec<String> = Vec::new();

    for txn in &request.transactions {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let inst = txn.total_installments.unwrap_or(0);

        if request.skip_duplicates {
            if let Some(ref fid) = txn.fit_id {
                let exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM imported_ids WHERE fit_id = ?1 AND account_id = ?2",
                    rusqlite::params![fid, request.account_id],
                    |row| row.get::<_, i32>(0),
                ).map(|c| c > 0).unwrap_or(false);
                if exists {
                    skipped += 1;
                    continue;
                }
            }
        }

        let category_id = txn.category_id.as_ref()
            .or(request.default_category_id.as_ref());

        let txn_type = if txn.transaction_type == "credit"
            || txn.transaction_type == "expense"
            || txn.transaction_type == "income"
            || txn.transaction_type == "transfer"
        { txn.transaction_type.clone() }
        else { String::new() };

        if txn_type.is_empty() {
            errors.push(format!("Linha {}: tipo inválido '{}'", txn.line, txn.transaction_type));
            continue;
        }

        if txn.amount <= 0.0 {
            errors.push(format!("Linha {}: valor inválido {}", txn.line, txn.amount));
            continue;
        }

        if let Err(e) = conn.execute(
            "INSERT INTO transactions (id, account_id, category_id, type, amount, description, date, total_installments, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![id, request.account_id, category_id, txn_type, txn.amount, txn.description, txn.date, inst, now],
        ) {
            errors.push(format!("Linha {}: erro ao criar transação: {}", txn.line, e));
            continue;
        }

        if txn_type == "expense" || txn_type == "credit" {
            let _ = conn.execute(
                "UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
                rusqlite::params![txn.amount, request.account_id],
            );
        } else if txn_type == "income" {
            let _ = conn.execute(
                "UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
                rusqlite::params![txn.amount, request.account_id],
            );
        }

        if inst > 1 {
            if txn_type == "credit" {
                if let Some(closing_day) = conn.query_row(
                    "SELECT closing_day FROM accounts WHERE id = ?1",
                    rusqlite::params![request.account_id],
                    |row| row.get::<_, Option<i32>>(0),
                ).ok().flatten() {
                    let parsed = chrono::NaiveDate::parse_from_str(&txn.date, "%Y-%m-%d")
                        .map_err(|e| e.to_string())?;
                    let mut month = parsed.month() as i32;
                    let mut year = parsed.year();
                    if parsed.day() as i32 > closing_day {
                        month += 1;
                        if month > 12 { month = 1; year += 1; }
                    }
                    month += 1;
                    if month > 12 { month = 1; year += 1; }
                    let inst_amount = txn.amount / inst as f64;
                    for i in 1..=inst {
                        let inst_id = Uuid::new_v4().to_string();
                        let _ = conn.execute(
                            "INSERT INTO installments (id, transaction_id, total_installments, installment_number, installment_amount, due_month, due_year, created_at)
                             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                            rusqlite::params![inst_id, id, inst, i, inst_amount, month, year, now],
                        );
                        month += 1;
                        if month > 12 { month = 1; year += 1; }
                    }
                }
            } else {
                let inst_amount = txn.amount / inst as f64;
                let parsed = chrono::NaiveDate::parse_from_str(&txn.date, "%Y-%m-%d")
                    .map_err(|e| e.to_string())?;
                let mut month = parsed.month() as i32;
                let mut year = parsed.year();
                for i in 1..=inst {
                    let inst_id = Uuid::new_v4().to_string();
                    let _ = conn.execute(
                        "INSERT INTO installments (id, transaction_id, total_installments, installment_number, installment_amount, due_month, due_year, created_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        rusqlite::params![inst_id, id, inst, i, inst_amount, month, year, now],
                    );
                    month += 1;
                    if month > 12 { month = 1; year += 1; }
                }
            }
        }

        if let Some(ref fid) = txn.fit_id {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO imported_ids (fit_id, account_id) VALUES (?1, ?2)",
                rusqlite::params![fid, request.account_id],
            );
        }

        imported += 1;
    }

    Ok(ImportResult { imported, skipped, errors })
}
