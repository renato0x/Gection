import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, Tag, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DonutChart } from '../components/DonutChart';
import { useUI } from '../stores/useUI';
import * as api from '../lib/api';
import type { DashboardSummary, CategorySpending, MonthlyComparison, Transaction, TagSpending, CreditUsage } from '../types';

function sign(tx: Transaction): string {
  if (tx.transaction_type === 'income') return '+';
  if (tx.transaction_type === 'credit') return '↻';
  return '-';
}
function color(tx: Transaction): string {
  if (tx.transaction_type === 'income') return 'text-emerald-400';
  if (tx.transaction_type === 'credit') return 'text-violet-400';
  return 'text-rose-400';
}

export function Dashboard() {
  const { selectedMonth, selectedYear } = useUI();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [tagSpending, setTagSpending] = useState<TagSpending[]>([]);
  const [chargesGenerated, setChargesGenerated] = useState(0);
  const [creditUsage, setCreditUsage] = useState<CreditUsage[]>([]);

  useEffect(() => {
    api.getDashboardSummary(selectedMonth, selectedYear).then(setSummary);
    api.getExpensesByCategory(selectedMonth, selectedYear).then(setCategorySpending);
    api.getMonthlyComparison(selectedYear).then(setMonthlyComparison);
    api.getTransactions({ month: selectedMonth, year: selectedYear }).then((tx) => setRecentTx(tx.slice(0, 5)));
    api.getTagSpending(selectedMonth, selectedYear).then(setTagSpending);
    api.getCreditUsage().then(setCreditUsage);
    api.checkAndGenerateCharges().then(setChargesGenerated);
  }, [selectedMonth, selectedYear]);

  if (!summary) return null;

  const balanco_mes = summary.receitas_realizadas - summary.despesas_debito;
  const renda_faltante = Math.max(0, summary.renda_esperada - summary.receitas_realizadas);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Dashboard</h1>
        {chargesGenerated > 0 && (
          <span className="text-xs text-emerald-400 bg-emerald-900/30 px-3 py-1.5 rounded-full">
            {chargesGenerated} cobrança(s) de assinatura gerada(s)
          </span>
        )}
      </div>

      {/* Row 1: Core indicators */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-indigo-900/30"><Wallet size={20} className="text-indigo-400" /></div>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Real</p>
          <p className="text-lg font-bold text-indigo-400 mt-0.5">{api.formatCurrency(summary.saldo_real)}</p>
        </Card>
        <Card className="animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-emerald-900/30"><TrendingUp size={20} className="text-emerald-400" /></div>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Receitas Realizadas</p>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">{api.formatCurrency(summary.receitas_realizadas)}</p>
        </Card>
        <Card className="animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-rose-900/30"><TrendingDown size={20} className="text-rose-400" /></div>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Despesas à Vista</p>
          <p className="text-lg font-bold text-rose-400 mt-0.5">{api.formatCurrency(summary.despesas_debito)}</p>
        </Card>
        <Card className="animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-violet-900/30"><CreditCard size={20} className="text-violet-400" /></div>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gastos no Crédito</p>
          <p className="text-lg font-bold text-violet-400 mt-0.5">{api.formatCurrency(summary.despesas_credito)}</p>
        </Card>
      </div>

      {/* Row 2: Balance + Credit usage breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="animate-slideUp">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Balanço do Mês</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 p-2.5 rounded-lg bg-emerald-900/15">
              <div className="flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-400">{api.formatCurrency(summary.receitas_realizadas)}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">Receitas</p>
            </div>
            <div className="flex-1 p-2.5 rounded-lg bg-rose-900/15">
              <div className="flex items-center gap-1">
                <TrendingDown size={12} className="text-rose-400" />
                <span className="text-[10px] font-semibold text-rose-400">{api.formatCurrency(summary.despesas_debito)}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">Despesas</p>
            </div>
          </div>
          <div className={`mt-3 p-2.5 rounded-lg text-center ${balanco_mes >= 0 ? 'bg-emerald-900/20' : 'bg-rose-900/20'}`}>
            <p className={`text-sm font-bold ${balanco_mes >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {api.formatCurrency(balanco_mes)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              <span className="text-[9px] text-slate-600">Receitas - Despesas à Vista</span>
              {summary.despesas_credito > 0 && (
                <span className="ml-2">💳 crédito: {api.formatCurrency(summary.despesas_credito)}</span>
              )}
            </p>
          </div>
        </Card>

        {creditUsage.length > 0 && creditUsage[0].credit_limit > 0 && (
          <Card className="animate-slideUp">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Limite de Crédito</p>
            {creditUsage.map((cu) => (
              <div key={cu.account_id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">{cu.account_name}</span>
                  <span className="text-slate-300 font-medium">{api.formatCurrency(cu.total_used)} / {api.formatCurrency(cu.credit_limit)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((cu.total_used / cu.credit_limit) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, #818cf8, #c084fc)',
                    }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-800/60 rounded-lg p-2">
                    <p className="text-slate-500">Fatura atual</p>
                    <p className="text-slate-200 font-medium">{api.formatCurrency(cu.current_invoice_total)}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2">
                    <p className="text-slate-500">Próx. faturas</p>
                    <p className="text-amber-400 font-medium">{api.formatCurrency(cu.future_invoices_total)}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2">
                    <p className="text-slate-500">Em processamento</p>
                    <p className="text-cyan-400 font-medium">{api.formatCurrency(cu.processing_total)}</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-700/50">
                  <span className="text-slate-500">Disponível</span>
                  <span className="text-emerald-400 font-semibold">{api.formatCurrency(cu.available)}</span>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Row 3: Expected income (previsão) */}
      {summary.renda_esperada > 0 && (
        <Card className="animate-slideUp">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-emerald-900/30"><PiggyBank size={20} className="text-emerald-400" /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Renda Esperada</p>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-700/50">
                  Previsto
                </span>
              </div>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">{api.formatCurrency(summary.renda_esperada)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Realizado este mês</p>
              <p className="text-sm font-semibold text-slate-300">{api.formatCurrency(summary.receitas_realizadas)}</p>
              {renda_faltante > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle size={12} className="text-amber-400" />
                  <span className="text-xs text-amber-400">Faltam {api.formatCurrency(renda_faltante)}</span>
                </div>
              )}
              {renda_faltante === 0 && summary.receitas_realizadas > 0 && (
                <p className="text-xs text-emerald-500 mt-1">100% realizado</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Row 4: Tag spending */}
      {tagSpending.length > 0 && (
        <Card className="animate-slideUp">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-300">Gastos por Tag</h2>
          </div>
          <div className="flex gap-8 items-start">
            <DonutChart
              data={tagSpending.map((t) => ({ name: t.tag_name, value: t.total, color: t.tag_color }))}
            />
            <div className="flex-1 space-y-1 min-w-0">
              {tagSpending.slice(0, 6).map((e) => (
                <div key={e.tag_id} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded shrink-0" style={{ backgroundColor: e.tag_color }} />
                    <span className="text-slate-400 truncate">{e.tag_name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium text-slate-300 w-14 text-right text-[11px]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(e.total)}</span>
                    <span className="text-slate-500 w-8 text-right text-[11px]">{e.percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Row 5: Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="animate-slideUp">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Gastos por Categoria</h2>
          {categorySpending.length === 0 ? (
            <EmptyState title="Nenhum gasto no período" />
          ) : (
            <div className="flex gap-6 items-start">
              <DonutChart
                data={categorySpending.map((c) => ({ name: c.category_name, value: c.total, color: c.category_color }))}
              />
              <div className="flex-1 space-y-1 min-w-0">
                {categorySpending.slice(0, 6).map((e) => (
                  <div key={e.category_id} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.category_color }} />
                      <span className="text-slate-400 truncate">{e.category_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium text-slate-300 w-8 text-right text-[11px]">{e.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="animate-slideUp">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Comparativo Mensal</h2>
          {monthlyComparison.length === 0 ? (
            <EmptyState title="Sem dados no ano" />
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(m: number) => api.shortMonth(m)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `R$${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => api.formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #1e293b', backgroundColor: '#0b1120' }} />
                  <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="animate-slideUp">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Transações Recentes</h2>
        {recentTx.length === 0 ? (
          <EmptyState title="Nenhuma transação neste mês" description="Adicione transações na página de Transações" />
        ) : (
          <div className="space-y-1">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl shrink-0"
                    style={{ backgroundColor: tx.category_color || '#1e293b' }} />
                  <div>
                    <p className="text-sm font-medium text-slate-300">{tx.description || tx.category_name || 'Sem descrição'}</p>
                    <p className="text-xs text-slate-500">{tx.account_name} &middot; {api.parseDate(tx.date)}
                      {tx.total_installments && tx.total_installments > 0 && <span> &middot; {tx.total_installments}x</span>}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${color(tx)}`}>{sign(tx)}{api.formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
