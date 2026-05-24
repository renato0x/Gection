export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  color: string;
  credit_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string | null;
  transaction_type: 'income' | 'expense' | 'transfer' | 'credit';
  amount: number;
  description: string;
  date: string;
  total_installments: number | null;
  created_at: string;
  account_name: string | null;
  category_name: string | null;
  category_color: string | null;
  subscription_id: string | null;
  tags: Tag[];
  installments: Installment[];
}

export interface Installment {
  id: string;
  transaction_id: string;
  total_installments: number;
  installment_number: number;
  installment_amount: number;
  due_month: number;
  due_year: number;
  paid: boolean;
  description?: string | null;
  category_name?: string | null;
  category_color?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Budget {
  id: string;
  category_id: string;
  month: number;
  year: number;
  limit_amount: number;
  spent: number;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number | null;
  entry_day: number;
  account_id: string;
  is_fixed: boolean;
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'yearly';
  category_id: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  account_name: string | null;
  category_name: string | null;
  category_color: string | null;
}

export interface CreateIncomeSourceData {
  name: string;
  amount: number | null;
  entry_day: number;
  account_id: string;
  is_fixed: boolean;
  frequency: string;
  category_id: string | null;
  notes: string | null;
  active: boolean;
}

export interface UpdateIncomeSourceData {
  id: string;
  name: string;
  amount: number | null;
  entry_day: number;
  account_id: string;
  is_fixed: boolean;
  frequency: string;
  category_id: string | null;
  notes: string | null;
  active: boolean;
}

export interface DashboardSummary {
  saldo_real: number;
  receitas_realizadas: number;
  despesas_debito: number;
  despesas_credito: number;
  fatura_aberta: number;
  total_credit_limit: number;
  renda_esperada: number;
}

export interface CategorySpending {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total: number;
  percentage: number;
}

export interface MonthlyComparison {
  month: number;
  year: number;
  income: number;
  expense: number;
}

export interface InvoiceData {
  month: number;
  year: number;
  account_id: string;
  account_name: string;
  total: number;
  pending_installments_total: number;
  limit: number;
  closing_day: number;
  due_day: number;
  transactions: Transaction[];
  current_installments: Installment[];
  installments_due: Installment[];
}

export interface CreditUsage {
  account_id: string;
  account_name: string;
  credit_limit: number;
  current_invoice_total: number;
  future_invoices_total: number;
  processing_total: number;
  total_used: number;
  available: number;
}

export interface FutureInvoiceGroup {
  due_month: number;
  due_year: number;
  total: number;
  installments: Installment[];
}

export interface CreateAccountData {
  name: string;
  account_type: string;
  balance: number;
  color: string;
  credit_limit?: number | null;
  closing_day?: number | null;
  due_day?: number | null;
}

export interface UpdateAccountData {
  id: string;
  name: string;
  account_type: string;
  balance: number;
  color: string;
  credit_limit?: number | null;
  closing_day?: number | null;
  due_day?: number | null;
}

export interface CreateCategoryData {
  name: string;
  icon: string;
  color: string;
  category_type: string;
}

export interface UpdateCategoryData {
  id: string;
  name: string;
  icon: string;
  color: string;
  category_type: string;
}

export interface CreateTransactionData {
  account_id: string;
  category_id: string | null;
  transaction_type: string;
  amount: number;
  description: string;
  date: string;
  tag_ids: string[];
  total_installments?: number | null;
  subscription_id?: string | null;
}

export interface UpdateTransactionData {
  id: string;
  account_id: string;
  category_id: string | null;
  transaction_type: string;
  amount: number;
  description: string;
  date: string;
  tag_ids: string[];
  total_installments?: number | null;
  subscription_id?: string | null;
}

export interface BudgetOverview {
  monthly_income: number;
  total_allocated: number;
  budgets: Budget[];
}

export interface CreateBudgetData {
  category_id: string;
  month: number;
  year: number;
  limit_amount: number;
}

export interface CreateTagData {
  name: string;
  color: string;
}

export interface UpdateTagData {
  id: string;
  name: string;
  color: string;
}

export interface TransactionFilter {
  month?: number | null;
  year?: number | null;
  account_id?: string | null;
  category_id?: string | null;
  search?: string | null;
  filter_type?: string | null;
  tag_id?: string | null;
}

export interface Subscription {
  id: string;
  description: string;
  amount: number;
  charge_day: number;
  frequency: 'monthly' | 'yearly' | 'biweekly' | 'weekly';
  account_id: string;
  category_id: string | null;
  next_charge: string;
  active: boolean;
  created_at: string;
  account_name: string | null;
  category_name: string | null;
  category_color: string | null;
}

export interface CreateSubscriptionData {
  description: string;
  amount: number;
  charge_day: number;
  frequency: string;
  account_id: string;
  category_id: string | null;
  next_charge: string;
  active: boolean;
}

export interface UpdateSubscriptionData {
  id: string;
  description: string;
  amount: number;
  charge_day: number;
  frequency: string;
  account_id: string;
  category_id: string | null;
  next_charge: string;
  active: boolean;
}

export interface TagStats {
  total_spent: number;
  total_received: number;
  transaction_count: number;
  first_used: string;
  last_used: string;
}

export interface Person {
  id: string;
  name: string;
  created_at: string;
}

export interface PersonSettlement {
  id: string;
  person_id: string;
  person_name: string;
  account_id: string | null;
  account_name: string | null;
  settlement_type: 'lent' | 'borrowed';
  original_amount: number;
  current_amount: number;
  description: string;
  date: string;
  status: 'open' | 'resolved';
  notes: string | null;
  created_at: string;
}

export interface SettlementWriteoff {
  id: string;
  settlement_id: string;
  amount: number;
  date: string;
  description: string | null;
  transaction_id: string | null;
  created_at: string;
}

export interface CreatePersonSettlementData {
  person_id?: string;
  person_name: string;
  account_id: string;
  settlement_type: string;
  original_amount: number;
  description: string;
  date: string;
  notes: string | null;
}

export interface UpdatePersonSettlementData {
  id: string;
  person_id: string;
  account_id: string;
  settlement_type: string;
  description: string;
  date: string;
  notes: string | null;
}

export interface CreateWriteoffData {
  settlement_id: string;
  amount: number;
  date: string;
  description: string | null;
}

export interface UpdateWriteoffData {
  id: string;
  amount: number;
  date: string;
  description: string | null;
}

export interface TagSpending {
  tag_id: string;
  tag_name: string;
  tag_color: string;
  total: number;
  percentage: number;
}
