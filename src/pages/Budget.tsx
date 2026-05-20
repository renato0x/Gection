import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, AlertTriangle, TrendingUp, PiggyBank, Wallet, Percent, Lightbulb, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useUI } from '../stores/useUI';
import { useCategories } from '../stores/useCategories';
import * as api from '../lib/api';
import type { Budget, BudgetOverview } from '../types';

const NEEDS = ['Moradia', 'Alimentação', 'Transporte', 'Saúde'];
const WANTS = ['Lazer', 'Roupas', 'Entretenimento', 'Assinaturas', 'Presentes', 'Viagem'];
// everything else → Savings (20%)

function budgetGroup(catName: string): 'needs' | 'wants' | 'savings' {
  const n = catName.toLowerCase();
  if (NEEDS.some((x) => x.toLowerCase() === n)) return 'needs';
  if (WANTS.some((x) => x.toLowerCase() === n)) return 'wants';
  return 'savings';
}

function groupPct(group: string) {
  return group === 'needs' ? 0.5 : group === 'wants' ? 0.3 : 0.2;
}

export function Budget() {
  const { selectedMonth, selectedYear } = useUI();
  const { categories, load: loadCats } = useCategories();

  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState(0);

  const loadOverview = async () => {
    setLoading(true);
    const data = await api.getBudgetOverview(selectedMonth, selectedYear);
    setOverview(data);
    setLoading(false);
  };

  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { loadOverview(); }, [selectedMonth, selectedYear]);

  const expenseCats = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);
  const budgetedCatIds = useMemo(() => new Set(overview?.budgets.map((b) => b.category_id) || []), [overview]);
  const availableCats = useMemo(() => expenseCats.filter((c) => !budgetedCatIds.has(c.id)), [expenseCats, budgetedCatIds]);

  const income = overview?.monthly_income || 0;
  const allocated = overview?.total_allocated || 0;
  const pctAllocated = income > 0 ? (allocated / income) * 100 : 0;
  const freeBalance = income - allocated;
  const isOverBudget = allocated > income && income > 0;

  // 50/30/20 suggestion
  const suggestion = useMemo(() => {
    if (!selectedCategory || !income) return null;
    const cat = expenseCats.find((c) => c.id === selectedCategory);
    if (!cat) return null;
    const group = budgetGroup(cat.name);
    const pct = groupPct(group);
    const sameGroupCats = expenseCats.filter((c) => budgetGroup(c.name) === group);
    const budgetedInGroup = overview?.budgets.filter((b) => {
      const bc = expenseCats.find((c) => c.id === b.category_id);
      return bc && budgetGroup(bc.name) === group;
    }).length || 0;
    const remainingInGroup = sameGroupCats.length - budgetedInGroup;
    if (remainingInGroup <= 0) return null;
    const suggested = (income * pct) / remainingInGroup;
    return { value: Math.round(suggested * 100) / 100, label: `Sugestão 50/30/20: até ${(pct * 100).toFixed(0)}% da renda (R$ ${(income * pct).toFixed(2).replace('.', ',')}) — R$ ${suggested.toFixed(2).replace('.', ',')} para esta categoria` };
  }, [selectedCategory, income, expenseCats, overview]);

  const openNew = () => {
    if (availableCats.length === 0) return;
    setSelectedCategory(availableCats[0].id);
    setLimitAmount(0);
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedCategory || limitAmount <= 0) return;
    await api.createBudget({ category_id: selectedCategory, month: selectedMonth, year: selectedYear, limit_amount: limitAmount });
    setModalOpen(false);
    loadOverview();
  };

  const handleDelete = async (id: string) => {
    await api.deleteBudget(id);
    loadOverview();
  };

  const handleUpdate = async (id: string, amount: number) => {
    await api.updateBudget(id, amount);
    loadOverview();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Orçamento</h1>
        {availableCats.length > 0 && (
          <Button onClick={openNew}><Plus size={16} /> Novo Orçamento</Button>
        )}
      </div>

      {/* Summary Panel */}
      {income > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-900/30"><PiggyBank size={18} className="text-emerald-400" /></div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Renda Mensal</p>
                <p className="text-base font-bold text-emerald-400">{api.formatCurrency(income)}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-900/30"><Wallet size={18} className="text-violet-400" /></div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Alocado</p>
                <p className="text-base font-bold text-violet-400">{api.formatCurrency(allocated)}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-900/30"><Percent size={18} className="text-amber-400" /></div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">% Alocado</p>
                <p className={`text-base font-bold ${pctAllocated > 100 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {pctAllocated.toFixed(0)}%
                </p>
              </div>
            </div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-rose-900/30' : 'bg-sky-900/30'}`}>
                <TrendingUp size={18} className={isOverBudget ? 'text-rose-400' : 'text-sky-400'} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Livre</p>
                <p className={`text-base font-bold ${isOverBudget ? 'text-rose-400' : 'text-sky-400'}`}>
                  {api.formatCurrency(freeBalance)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isOverBudget && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-900/20 border border-rose-800/40">
          <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          <p className="text-xs text-rose-300">O total alocado ({api.formatCurrency(allocated)}) ultrapassa a renda mensal ({api.formatCurrency(income)}).</p>
        </div>
      )}

      {/* Budget Cards */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : !overview || overview.budgets.length === 0 ? (
        <EmptyState title="Nenhum orçamento definido" description="Adicione orçamentos para controlar seus gastos por categoria" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overview.budgets.map((b) => {
            const pct = b.limit_amount > 0 ? (b.spent / b.limit_amount) * 100 : 0;
            const pctOfIncome = income > 0 ? (b.limit_amount / income) * 100 : 0;
            const remaining = b.limit_amount - b.spent;
            const isExceeded = b.spent > b.limit_amount;
            const isWarning = pct >= 80 && !isExceeded;

            let barColor = 'bg-emerald-500';
            if (pct > 90) barColor = 'bg-rose-500';
            else if (pct > 70) barColor = 'bg-amber-500';

            let borderColor = 'border-slate-700/60';
            if (isExceeded) borderColor = 'border-rose-700/60';
            else if (isWarning) borderColor = 'border-amber-700/60';

            return (
              <Card key={b.id} className={`!p-4 border ${borderColor} ${isExceeded ? 'bg-rose-900/5' : isWarning ? 'bg-amber-900/5' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs"
                      style={{ backgroundColor: b.category_color || '#6366f1' }}>
                      {b.category_icon || ''}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{b.category_name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{pctOfIncome.toFixed(1)}% da renda</span>
                        {b.category_name && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            budgetGroup(b.category_name) === 'needs' ? 'bg-sky-900/40 text-sky-300' :
                            budgetGroup(b.category_name) === 'wants' ? 'bg-amber-900/40 text-amber-300' :
                            'bg-emerald-900/40 text-emerald-300'
                          }`}>
                            {budgetGroup(b.category_name) === 'needs' ? 'Necessidade' : budgetGroup(b.category_name) === 'wants' ? 'Desejo' : 'Poupança'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-500 hover:text-rose-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">{api.formatCurrency(b.spent)}</span> gastos de {api.formatCurrency(b.limit_amount)}
                  </p>
                  <p className={`text-xs font-semibold ${isExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isExceeded ? `Excedeu ${api.formatCurrency(b.spent - b.limit_amount)}` : `Faltam ${api.formatCurrency(remaining)}`}
                  </p>
                </div>

                {/* Alerts */}
                {isWarning && (
                  <div className="flex items-center gap-1.5 mt-2 p-2 rounded-lg bg-amber-900/15">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-300">{pct.toFixed(0)}% do limite atingido</p>
                  </div>
                )}
                {isExceeded && (
                  <div className="flex items-center gap-1.5 mt-2 p-2 rounded-lg bg-rose-900/15">
                    <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                    <p className="text-[11px] text-rose-300">Limite excedido em {api.formatCurrency(b.spent - b.limit_amount)}</p>
                  </div>
                )}

                {/* Inline edit */}
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" step="0.01" min="0"
                    defaultValue={b.limit_amount}
                    className="w-24 px-2 py-1 rounded-lg text-xs border border-slate-700 bg-slate-800/60 text-slate-200 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (v > 0 && v !== b.limit_amount) handleUpdate(b.id, v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = parseFloat((e.target as HTMLInputElement).value);
                        if (v > 0 && v !== b.limit_amount) handleUpdate(b.id, v);
                      }
                    }} />
                  <span className="text-[10px] text-slate-500">Editar limite</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Budget Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Orçamento">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria</label>
            <select value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setLimitAmount(0); }}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
              {availableCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Limite Mensal</label>
            <input type="number" step="0.01" min="0" placeholder="0,00"
              value={limitAmount || ''}
              onChange={(e) => setLimitAmount(parseFloat(e.target.value) || 0)}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>

          {/* 50/30/20 Suggestion */}
          {suggestion && (
            <div className="p-3 rounded-xl bg-indigo-900/20 border border-indigo-800/40">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 font-medium">Sugestão baseada na sua renda</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{suggestion.label}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-sm font-bold text-indigo-300">R$ {suggestion.value.toFixed(2).replace('.', ',')}</p>
                    <Button size="sm" variant="ghost" onClick={() => setLimitAmount(suggestion.value)}>
                      <Check size={14} /> Usar sugestão
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {income === 0 && (
            <p className="text-xs text-amber-400">Cadastre fontes de renda mensais ativas para receber sugestões de orçamento.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
