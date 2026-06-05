import { useState, useEffect, useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Receipt, Download, Printer, Loader, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DonutChart } from '../components/DonutChart';
import * as api from '../lib/api';
import type {
  ReportFilter, ConsolidatedReport, Account, Category,
} from '../types';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const defaultFilter: ReportFilter = {
  month_from: currentMonth, year_from: currentYear,
  month_to: currentMonth, year_to: currentYear,
  account_id: null, category_id: null, transaction_type: null,
};

export function Reports() {
  const [filter, setFilter] = useState<ReportFilter>(defaultFilter);
  const [report, setReport] = useState<ConsolidatedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.getAccounts().then(setAccounts);
    api.getCategories().then(setCategories);
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.getConsolidatedReport(filter);
      setReport(r);
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Erro ao gerar relatório');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { generate(); }, [generate]);

  const handleExportCsv = async () => {
    try {
      const savePath = await save({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        defaultPath: `relatorio_${filter.month_from}-${filter.month_to}_${filter.year_from}.csv`,
      });
      if (!savePath) return;
      await api.exportReportCsv(filter, savePath);
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Erro ao exportar CSV');
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const updateFilter = (k: keyof ReportFilter, v: any) => setFilter((f) => ({ ...f, [k]: v }));

  const pctChange = (current: number, previous?: number | null): number | null => {
    if (previous == null || previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  };

  const ChangeBadge = ({ current, previous }: { current: number; previous?: number | null }) => {
    const pct = pctChange(current, previous);
    if (pct == null) return null;
    const isPos = pct >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPos ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
        {Math.abs(pct).toFixed(1)}%
      </span>
    );
  };

  const summary = report?.summary;
  const prev = report?.prev_summary;

  return (
    <>
      <style>{printStyles}</style>
      <div className="space-y-5 print:space-y-3">
        {/* Header */}
        <div className="print-hidden flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 size={22} className="text-indigo-500" />
            Relatório Consolidado
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="print-hidden flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="print-hidden">
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Mês início</label>
                <select value={filter.month_from} onChange={(e) => updateFilter('month_from', parseInt(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm">
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ano início</label>
                <input type="number" value={filter.year_from} onChange={(e) => updateFilter('year_from', parseInt(e.target.value) || currentYear)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div className="flex items-center justify-center text-slate-400 text-lg pb-1">→</div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Mês fim</label>
                <select value={filter.month_to} onChange={(e) => updateFilter('month_to', parseInt(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm">
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ano fim</label>
                <input type="number" value={filter.year_to} onChange={(e) => updateFilter('year_to', parseInt(e.target.value) || currentYear)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div className="flex gap-1">
                <select value={filter.transaction_type || ''} onChange={(e) => updateFilter('transaction_type', e.target.value || null)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm flex-1">
                  <option value="">Todos os tipos</option>
                  <option value="income">Receitas</option>
                  <option value="expense">Despesas</option>
                  <option value="debit_only">Débito</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <select value={filter.account_id || ''} onChange={(e) => updateFilter('account_id', e.target.value || null)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm">
                <option value="">Todas as contas</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={filter.category_id || ''} onChange={(e) => updateFilter('category_id', e.target.value || null)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm">
                <option value="">Todas as categorias</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button onClick={generate} disabled={loading} className="col-span-2 sm:col-span-1 flex items-center gap-1.5 justify-center">
                {loading ? <Loader size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                Gerar
              </Button>
            </div>
          </Card>
        </div>

        {/* Loading */}
        {loading && !report && (
          <div className="flex items-center justify-center py-16">
            <Loader size={24} className="animate-spin text-indigo-500" />
          </div>
        )}

        {report && summary && (
          <>
            {/* Period header for print */}
            <div className="hidden print:block text-center mb-4">
              <h1 className="text-lg font-bold">GECTION — Relatório Consolidado</h1>
              <p className="text-sm text-slate-500">{report.period.label}</p>
              <p className="text-xs text-slate-400">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard icon={<TrendingUp size={18} />} label="Receitas" value={summary.total_income} color="emerald">
                <ChangeBadge current={summary.total_income} previous={prev?.total_income} />
              </SummaryCard>
              <SummaryCard icon={<TrendingDown size={18} />} label="Despesas" value={summary.total_expense} color="red">
                <ChangeBadge current={summary.total_expense} previous={prev?.total_expense} />
              </SummaryCard>
              <SummaryCard icon={<DollarSign size={18} />} label="Saldo Líquido" value={summary.net} color={summary.net >= 0 ? 'emerald' : 'red'}>
                <ChangeBadge current={summary.net} previous={prev?.net} />
              </SummaryCard>
              <SummaryCard icon={<Receipt size={18} />} label="Transações" value={summary.tx_count} color="indigo" isCount>
                {prev && <span className="text-[11px] text-slate-400">{prev.tx_count} ant.</span>}
              </SummaryCard>
            </div>

            {/* Category charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Income categories */}
              <Card>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Receitas por Categoria</h3>
                {report.income_by_category.length === 0 ? (
                  <EmptyState title="Nenhuma receita no período" />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="shrink-0">
                      <DonutChart data={report.income_by_category.map((c) => ({ name: c.category_name, value: c.total, color: c.category_color }))} size={160} />
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      {report.income_by_category.map((c) => (
                        <div key={c.category_id || 'none'} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.category_color }} />
                            <span className="truncate text-slate-600 dark:text-slate-400">{c.category_name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-500 font-mono tabular-nums">{c.percentage.toFixed(1)}%</span>
                            <span className="text-slate-700 dark:text-slate-300 font-mono tabular-nums w-20 text-right">{api.formatCurrency(c.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Expense categories */}
              <Card>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Despesas por Categoria</h3>
                {report.expense_by_category.length === 0 ? (
                  <EmptyState title="Nenhuma despesa no período" />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="shrink-0">
                      <DonutChart data={report.expense_by_category.map((c) => ({ name: c.category_name, value: c.total, color: c.category_color }))} size={160} />
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      {report.expense_by_category.map((c) => (
                        <div key={c.category_id || 'none'} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.category_color }} />
                            <span className="truncate text-slate-600 dark:text-slate-400">{c.category_name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-500 font-mono tabular-nums">{c.percentage.toFixed(1)}%</span>
                            <span className="text-slate-700 dark:text-slate-300 font-mono tabular-nums w-20 text-right">{api.formatCurrency(c.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Account breakdown */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Movimentação por Conta</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                      <th className="text-left py-2 px-2 font-medium">Conta</th>
                      <th className="text-right py-2 px-2 font-medium">Receitas</th>
                      <th className="text-right py-2 px-2 font-medium">Despesas</th>
                      <th className="text-right py-2 px-2 font-medium">Saldo Atual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_account.map((a) => (
                      <tr key={a.account_id} className="border-b border-slate-100 dark:border-slate-800 text-xs">
                        <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300">{a.account_name}</td>
                        <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${a.income > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                          {api.formatCurrency(a.income)}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${a.expense > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                          {api.formatCurrency(a.expense)}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${a.account_type === 'credit' ? 'text-red-600 dark:text-red-400' : a.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                          {api.formatCurrency(a.account_type === 'credit' && a.balance < 0 ? Math.abs(a.balance) : a.balance)}
                          {a.account_type === 'credit' && a.balance < 0 ? ' (dívida)' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Transactions table */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Transações ({report.transactions.length})</h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/95">
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                      <th className="text-left py-2 px-2 font-medium">Data</th>
                      <th className="text-left py-2 px-2 font-medium">Descrição</th>
                      <th className="text-left py-2 px-2 font-medium">Categoria</th>
                      <th className="text-left py-2 px-2 font-medium">Conta</th>
                      <th className="text-right py-2 px-2 font-medium">Valor</th>
                      <th className="text-center py-2 px-2 font-medium">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.length === 0 ? (
                      <tr><td colSpan={6} className="py-8"><EmptyState title="Nenhuma transação" /></td></tr>
                    ) : (
                      report.transactions.map((t) => (
                        <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{api.parseDate(t.date)}</td>
                          <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{t.description}</td>
                          <td className="py-1.5 px-2">
                            {t.category_name && (
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.category_color || '#94a3b8' }} />
                                <span className="text-slate-500">{t.category_name}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-slate-500">{t.account_name}</td>
                          <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${t.transaction_type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {api.formatCurrency(t.amount)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              t.transaction_type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' :
                              t.transaction_type === 'credit' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700'
                            }`}>
                              {t.transaction_type === 'income' ? 'Receita' : t.transaction_type === 'credit' ? 'Crédito' : 'Despesa'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Export buttons */}
            <div className="print-hidden flex gap-2 pb-8">
              <Button onClick={handleExportCsv} className="flex items-center gap-1.5">
                <Download size={15} />
                Exportar CSV
              </Button>
              <Button onClick={handleExportPdf} variant="secondary" className="flex items-center gap-1.5">
                <Printer size={15} />
                Exportar PDF
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SummaryCard({ icon, label, value, color, isCount, children }: {
  icon: React.ReactNode; label: string; value: number; color: string; isCount?: boolean; children?: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500',
    red: 'from-red-500 to-red-600 dark:from-red-400 dark:to-red-500',
    indigo: 'from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500',
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[color] || colors.indigo} text-white`}>
          {icon}
        </div>
        {children && <div className="flex items-center gap-1">{children}</div>}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums mt-0.5">
        {isCount ? value : api.formatCurrency(value)}
      </p>
    </Card>
  );
}

const printStyles = `
@media print {
  body { background: white !important; }
  .print-hidden { display: none !important; }
  .hidden.print\\:block { display: block !important; }
  .dark\\:* { --print-bg: white !important; }
  .dark\\:bg-slate-800, .dark\\:bg-slate-900, .dark\\:bg-slate-800\\/95 {
    background-color: white !important;
  }
  .dark\\:text-slate-100, .dark\\:text-slate-300, .dark\\:text-slate-400 {
    color: #1e293b !important;
  }
  .dark\\:border-slate-700, .dark\\:border-slate-600 {
    border-color: #e2e8f0 !important;
  }
  .dark\\:border-slate-800 {
    border-color: #f1f5f9 !important;
  }
  .bg-slate-50 {
    background-color: white !important;
  }
  .dark\\:bg-slate-800\\/95 {
    background-color: white !important;
  }
  .max-h-80 { max-height: none !important; overflow: visible !important; }
  .overflow-y-auto { overflow: visible !important; }
  @page { margin: 1.5cm; }
  body { font-size: 10pt; }
}
`;
