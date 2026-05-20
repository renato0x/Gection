use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub balance: f64,
    pub color: String,
    pub credit_limit: Option<f64>,
    pub closing_day: Option<i32>,
    pub due_day: Option<i32>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    #[serde(rename = "type")]
    pub category_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: String,
    pub account_id: String,
    pub category_id: Option<String>,
    pub transaction_type: String,
    pub amount: f64,
    pub description: String,
    pub date: String,
    pub total_installments: Option<i32>,
    pub created_at: String,
    pub account_name: Option<String>,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
    pub subscription_id: Option<String>,
    pub tags: Vec<Tag>,
    pub installments: Vec<Installment>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Installment {
    pub id: String,
    pub transaction_id: String,
    pub total_installments: i32,
    pub installment_number: i32,
    pub installment_amount: f64,
    pub due_month: i32,
    pub due_year: i32,
    pub paid: bool,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category_name: Option<String>,
    #[serde(default)]
    pub category_color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Budget {
    pub id: String,
    pub category_id: String,
    pub month: i32,
    pub year: i32,
    pub limit_amount: f64,
    pub spent: f64,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
    pub category_icon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAccount {
    pub name: String,
    pub account_type: String,
    pub balance: f64,
    pub color: String,
    pub credit_limit: Option<f64>,
    pub closing_day: Option<i32>,
    pub due_day: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAccount {
    pub id: String,
    pub name: String,
    pub account_type: String,
    pub balance: f64,
    pub color: String,
    pub credit_limit: Option<f64>,
    pub closing_day: Option<i32>,
    pub due_day: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategory {
    pub name: String,
    pub icon: String,
    pub color: String,
    pub category_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCategory {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub category_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTransaction {
    pub account_id: String,
    pub category_id: Option<String>,
    pub transaction_type: String,
    pub amount: f64,
    pub description: String,
    pub date: String,
    pub tag_ids: Vec<String>,
    pub total_installments: Option<i32>,
    pub subscription_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTransaction {
    pub id: String,
    pub account_id: String,
    pub category_id: Option<String>,
    pub transaction_type: String,
    pub amount: f64,
    pub description: String,
    pub date: String,
    pub tag_ids: Vec<String>,
    pub total_installments: Option<i32>,
    pub subscription_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBudget {
    pub category_id: String,
    pub month: i32,
    pub year: i32,
    pub limit_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BudgetOverview {
    pub monthly_income: f64,
    pub total_allocated: f64,
    pub budgets: Vec<Budget>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTag {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTag {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub saldo_real: f64,
    pub receitas_realizadas: f64,
    pub despesas_debito: f64,
    pub despesas_credito: f64,
    pub fatura_aberta: f64,
    pub total_credit_limit: f64,
    pub renda_esperada: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategorySpending {
    pub category_id: String,
    pub category_name: String,
    pub category_color: String,
    pub category_icon: String,
    pub total: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyComparison {
    pub month: i32,
    pub year: i32,
    pub income: f64,
    pub expense: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IncomeSource {
    pub id: String,
    pub name: String,
    pub amount: Option<f64>,
    pub entry_day: i32,
    pub account_id: String,
    pub is_fixed: bool,
    pub frequency: String,
    pub category_id: Option<String>,
    pub notes: Option<String>,
    pub active: bool,
    pub created_at: String,
    pub account_name: Option<String>,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateIncomeSource {
    pub name: String,
    pub amount: Option<f64>,
    pub entry_day: i32,
    pub account_id: String,
    pub is_fixed: bool,
    pub frequency: String,
    pub category_id: Option<String>,
    pub notes: Option<String>,
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateIncomeSource {
    pub id: String,
    pub name: String,
    pub amount: Option<f64>,
    pub entry_day: i32,
    pub account_id: String,
    pub is_fixed: bool,
    pub frequency: String,
    pub category_id: Option<String>,
    pub notes: Option<String>,
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subscription {
    pub id: String,
    pub description: String,
    pub amount: f64,
    pub charge_day: i32,
    pub frequency: String,
    pub account_id: String,
    pub category_id: Option<String>,
    pub next_charge: String,
    pub active: bool,
    pub created_at: String,
    pub account_name: Option<String>,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubscription {
    pub description: String,
    pub amount: f64,
    pub charge_day: i32,
    pub frequency: String,
    pub account_id: String,
    pub category_id: Option<String>,
    pub next_charge: String,
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSubscription {
    pub id: String,
    pub description: String,
    pub amount: f64,
    pub charge_day: i32,
    pub frequency: String,
    pub account_id: String,
    pub category_id: Option<String>,
    pub next_charge: String,
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionFilter {
    pub month: Option<i32>,
    pub year: Option<i32>,
    pub account_id: Option<String>,
    pub category_id: Option<String>,
    pub search: Option<String>,
    pub filter_type: Option<String>,
    pub tag_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TagSpending {
    pub tag_id: String,
    pub tag_name: String,
    pub tag_color: String,
    pub total: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Person {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonSettlement {
    pub id: String,
    pub person_id: String,
    pub person_name: String,
    pub account_id: Option<String>,
    pub account_name: Option<String>,
    pub settlement_type: String,
    pub original_amount: f64,
    pub current_amount: f64,
    pub description: String,
    pub date: String,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SettlementWriteoff {
    pub id: String,
    pub settlement_id: String,
    pub amount: f64,
    pub date: String,
    pub description: Option<String>,
    pub transaction_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePersonSettlement {
    pub person_name: String,
    pub person_id: Option<String>,
    pub account_id: String,
    pub settlement_type: String,
    pub original_amount: f64,
    pub description: String,
    pub date: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePersonSettlement {
    pub id: String,
    pub person_id: String,
    pub account_id: String,
    pub settlement_type: String,
    pub description: String,
    pub date: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWriteoff {
    pub settlement_id: String,
    pub amount: f64,
    pub date: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateWriteoff {
    pub id: String,
    pub amount: f64,
    pub date: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceData {
    pub month: i32,
    pub year: i32,
    pub account_id: String,
    pub account_name: String,
    pub total: f64,
    pub pending_installments_total: f64,
    pub limit: f64,
    pub closing_day: i32,
    pub due_day: i32,
    pub transactions: Vec<Transaction>,
    pub current_installments: Vec<Installment>,
    pub installments_due: Vec<Installment>,
}
