import { invoke } from '@tauri-apps/api/core';
import type {
  Account, AccountMonthlyStats, Category, Transaction, Tag, Budget, BudgetOverview,
  DashboardSummary, CategorySpending, MonthlyComparison, InvoiceData,
  CreditUsage, FutureInvoiceGroup,
  IncomeSource, CreateIncomeSourceData, UpdateIncomeSourceData,
  Subscription, CreateSubscriptionData, UpdateSubscriptionData,
  TagStats, TagSpending,
  Person, PersonSettlement, SettlementWriteoff,
  CreatePersonSettlementData, UpdatePersonSettlementData, CreateWriteoffData, UpdateWriteoffData,
  CreateAccountData, UpdateAccountData,
  CreateCategoryData, UpdateCategoryData,
  CreateTransactionData, UpdateTransactionData,
  CreateBudgetData, UpdateTagData,
  TransactionFilter,
  ImportPreview, ImportRequest, ImportResult,
} from '../types';

export function getAccounts(): Promise<Account[]> {
  return invoke('get_accounts');
}
export function getAccountMonthlyStats(month: number, year: number): Promise<AccountMonthlyStats[]> {
  return invoke('get_account_monthly_stats', { month, year });
}
export function createAccount(data: CreateAccountData): Promise<Account> {
  return invoke('create_account', { data });
}
export function updateAccount(data: UpdateAccountData): Promise<void> {
  return invoke('update_account', { data });
}
export function deleteAccount(id: string): Promise<void> {
  return invoke('delete_account', { id });
}

export function getCategories(): Promise<Category[]> {
  return invoke('get_categories');
}
export function createCategory(data: CreateCategoryData): Promise<Category> {
  return invoke('create_category', { data });
}
export function updateCategory(data: UpdateCategoryData): Promise<void> {
  return invoke('update_category', { data });
}
export function deleteCategory(id: string): Promise<void> {
  return invoke('delete_category', { id });
}

export function getTransactions(filter: TransactionFilter): Promise<Transaction[]> {
  return invoke('get_transactions', { filter });
}
export function createTransaction(data: CreateTransactionData): Promise<Transaction> {
  return invoke('create_transaction', { data });
}
export function updateTransaction(data: UpdateTransactionData): Promise<void> {
  return invoke('update_transaction', { data });
}
export function deleteTransaction(id: string): Promise<void> {
  return invoke('delete_transaction', { id });
}
export function markInstallmentPaid(id: string, paid: boolean): Promise<void> {
  return invoke('mark_installment_paid', { id, paid });
}

export function getTags(): Promise<Tag[]> {
  return invoke('get_tags');
}
export function createTag(name: string, color: string): Promise<Tag> {
  return invoke('create_tag', { data: { name, color } });
}
export function updateTag(data: UpdateTagData): Promise<void> {
  return invoke('update_tag', { data });
}
export function deleteTag(id: string): Promise<void> {
  return invoke('delete_tag', { id });
}

export function getBudgets(month: number, year: number): Promise<Budget[]> {
  return invoke('get_budgets', { month, year });
}
export function getBudgetOverview(month: number, year: number): Promise<BudgetOverview> {
  return invoke('get_budget_overview', { month, year });
}
export function createBudget(data: CreateBudgetData): Promise<Budget> {
  return invoke('create_budget', { data });
}
export function updateBudget(id: string, limit_amount: number): Promise<void> {
  return invoke('update_budget', { id, limitAmount: limit_amount });
}
export function deleteBudget(id: string): Promise<void> {
  return invoke('delete_budget', { id });
}

export function getDashboardSummary(month: number, year: number): Promise<DashboardSummary> {
  return invoke('get_dashboard_summary', { month, year });
}
export function getExpensesByCategory(month: number, year: number): Promise<CategorySpending[]> {
  return invoke('get_expenses_by_category', { month, year });
}
export function getMonthlyComparison(year: number): Promise<MonthlyComparison[]> {
  return invoke('get_monthly_comparison', { year });
}

export function getInvoice(account_id: string, month: number, year: number): Promise<InvoiceData> {
  return invoke('get_invoice', { accountId: account_id, month, year });
}

export function getCreditUsage(): Promise<CreditUsage[]> {
  return invoke('get_credit_usage');
}

export function getFutureInvoices(account_id: string): Promise<FutureInvoiceGroup[]> {
  return invoke('get_future_invoices', { accountId: account_id });
}

export function getIncomeSources(): Promise<IncomeSource[]> {
  return invoke('get_income_sources');
}
export function createIncomeSource(data: CreateIncomeSourceData): Promise<IncomeSource> {
  return invoke('create_income_source', { data });
}
export function updateIncomeSource(data: UpdateIncomeSourceData): Promise<void> {
  return invoke('update_income_source', { data });
}
export function deleteIncomeSource(id: string): Promise<void> {
  return invoke('delete_income_source', { id });
}

export function getTag(id: string): Promise<Tag> {
  return invoke('get_tag', { id });
}
export function getTagStats(tag_id: string): Promise<TagStats> {
  return invoke('get_tag_stats', { tagId: tag_id });
}
export function getTagSpending(month: number, year: number): Promise<TagSpending[]> {
  return invoke('get_tag_spending', { month, year });
}

export function getSubscriptions(): Promise<Subscription[]> {
  return invoke('get_subscriptions');
}
export function createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
  return invoke('create_subscription', { data });
}
export function updateSubscription(data: UpdateSubscriptionData): Promise<void> {
  return invoke('update_subscription', { data });
}
export function deleteSubscription(id: string): Promise<void> {
  return invoke('delete_subscription', { id });
}
export function checkAndGenerateCharges(): Promise<number> {
  return invoke('check_and_generate_charges');
}

// Import
export function parseImportFile(path: string): Promise<ImportPreview> {
  return invoke('parse_import_file', { path });
}

export function parseCsvWithMapping(path: string, columnMap: string[]): Promise<ImportPreview> {
  return invoke('parse_csv_with_mapping', { path, columnMap });
}

export function importTransactions(request: ImportRequest): Promise<ImportResult> {
  return invoke('import_transactions', { request });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function parseDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function monthName(m: number): string {
  return MONTHS[m - 1] || '';
}

export function shortMonth(m: number): string {
  return (MONTHS[m - 1] || '').slice(0, 3);
}

export function monthOptions(): { value: number; label: string }[] {
  return MONTHS.map((label, i) => ({ value: i + 1, label }));
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month - 1, 1).getDay();
}

// Settlements
export function getPersons(): Promise<Person[]> {
  return invoke('get_persons');
}
export function createPerson(name: string): Promise<Person> {
  return invoke('create_person', { name });
}
export function getPersonSettlements(personId: string): Promise<PersonSettlement[]> {
  return invoke('get_person_settlements', { personId });
}
export function getSettlements(): Promise<PersonSettlement[]> {
  return invoke('get_settlements');
}
export function getSettlement(id: string): Promise<PersonSettlement> {
  return invoke('get_settlement', { id });
}
export function createSettlement(data: CreatePersonSettlementData): Promise<PersonSettlement> {
  return invoke('create_settlement', { data });
}
export function updateSettlement(data: UpdatePersonSettlementData): Promise<void> {
  return invoke('update_settlement', { data });
}
export function deleteSettlement(id: string): Promise<void> {
  return invoke('delete_settlement', { id });
}
export function writeoffSettlement(data: CreateWriteoffData): Promise<PersonSettlement> {
  return invoke('writeoff_settlement', { data });
}
export function resolveSettlement(id: string): Promise<PersonSettlement> {
  return invoke('resolve_settlement', { id });
}
export function getSettlementWriteoffs(settlementId: string): Promise<SettlementWriteoff[]> {
  return invoke('get_settlement_writeoffs', { settlementId });
}
export function updateWriteoff(data: UpdateWriteoffData): Promise<PersonSettlement> {
  return invoke('update_writeoff', { data });
}
export function deleteWriteoff(id: string): Promise<PersonSettlement> {
  return invoke('delete_writeoff', { id });
}
