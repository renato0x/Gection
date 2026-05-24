mod commands;
mod db;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
            let db_path = app_dir.join("gection.db");
            let db = Database::new(&db_path).map_err(|e| e.to_string())?;
            db.migrate().map_err(|e| e.to_string())?;
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::accounts::get_accounts,
            commands::accounts::create_account,
            commands::accounts::update_account,
            commands::accounts::delete_account,
            commands::categories::get_categories,
            commands::categories::create_category,
            commands::categories::update_category,
            commands::categories::delete_category,
            commands::transactions::get_transactions,
            commands::transactions::create_transaction,
            commands::transactions::update_transaction,
            commands::transactions::delete_transaction,
            commands::transactions::mark_installment_paid,
            commands::budgets::get_budgets,
            commands::budgets::get_budget_overview,
            commands::budgets::create_budget,
            commands::budgets::update_budget,
            commands::budgets::delete_budget,
            commands::tags::get_tags,
            commands::tags::create_tag,
            commands::tags::update_tag,
            commands::tags::delete_tag,
            commands::dashboard::get_dashboard_summary,
            commands::dashboard::get_expenses_by_category,
            commands::dashboard::get_monthly_comparison,
            commands::dashboard::get_tag_spending,
            commands::invoice::get_invoice,
            commands::invoice::get_credit_usage,
            commands::invoice::get_future_invoices,
            commands::income::get_income_sources,
            commands::income::create_income_source,
            commands::income::update_income_source,
            commands::income::delete_income_source,
            commands::tags::get_tag,
            commands::tags::get_tag_stats,
            commands::subscriptions::get_subscriptions,
            commands::subscriptions::create_subscription,
            commands::subscriptions::update_subscription,
            commands::subscriptions::delete_subscription,
            commands::subscriptions::check_and_generate_charges,
            commands::settlements::get_settlements,
            commands::settlements::get_settlement,
            commands::settlements::create_settlement,
            commands::settlements::update_settlement,
            commands::settlements::delete_settlement,
            commands::settlements::writeoff_settlement,
            commands::settlements::resolve_settlement,
            commands::settlements::get_settlement_writeoffs,
            commands::settlements::get_persons,
            commands::settlements::create_person,
            commands::settlements::get_person_settlements,
            commands::settlements::update_writeoff,
            commands::settlements::delete_writeoff,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
