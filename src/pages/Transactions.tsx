import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useUI } from '../stores/useUI';
import { useAccounts } from '../stores/useAccounts';
import { useCategories } from '../stores/useCategories';
import { useTransactions } from '../stores/useTransactions';
import * as api from '../lib/api';
import type { Transaction, Tag, CreateTransactionData, UpdateTransactionData, CreateSubscriptionData } from '../types';

interface FormData extends CreateTransactionData {
  is_subscription: boolean;
  charge_day: number;
  frequency: string;
}

const emptyForm: FormData = {
  account_id: '', category_id: null, transaction_type: 'expense',
  amount: 0, description: '', date: api.todayStr(), tag_ids: [],
  total_installments: null,
  is_subscription: false, charge_day: new Date().getDate(), frequency: 'monthly',
};

function sign(tx: Transaction): string {
  if (tx.transaction_type === 'income') return '+';
  if (tx.transaction_type === 'credit') return '↻';
  return '-';
}
function txColor(tx: Transaction): string {
  if (tx.transaction_type === 'income') return 'text-emerald-500';
  if (tx.transaction_type === 'credit') return 'text-violet-500';
  return 'text-rose-500';
}

export function Transactions() {
  const { selectedMonth, selectedYear } = useUI();
  const { accounts, load: loadAccounts } = useAccounts();
  const { categories, load: loadCategories } = useCategories();
  const { transactions, loading, load, create, update, remove } = useTransactions();
  const [showCalendar, setShowCalendar] = useState(false);

  const [filterSearch, setFilterSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');

  const loadData = useCallback(() => {
    load({
      month: selectedMonth, year: selectedYear,
      account_id: filterAccount || null, category_id: filterCategory || null,
      search: filterSearch || null, filter_type: filterType || null,
    });
  }, [selectedMonth, selectedYear, filterAccount, filterCategory, filterSearch, filterType, load]);

  useEffect(() => { loadAccounts(); loadCategories(); api.getTags().then(setTags); }, [loadAccounts, loadCategories]);
  useEffect(() => { loadData(); }, [loadData]);

  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');
  const isCredit = accounts.find((a) => a.id === form.account_id)?.type === 'credit';
  const filteredCats = isCredit ? expenseCats : form.transaction_type === 'expense' ? expenseCats : incomeCats;

  const openNew = () => {
    setEditingId(null);
    const debitAccount = accounts.find((a) => a.type !== 'credit') || accounts[0];
    setForm({ ...emptyForm, account_id: debitAccount?.id || '', date: api.todayStr() });
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setForm({
      account_id: tx.account_id, category_id: tx.category_id,
      transaction_type: tx.transaction_type, amount: tx.amount,
      description: tx.description, date: tx.date, tag_ids: tx.tags.map((t) => t.id),
      total_installments: tx.total_installments, subscription_id: tx.subscription_id,
      is_subscription: !!tx.subscription_id, charge_day: new Date().getDate(), frequency: 'monthly',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.account_id || form.amount <= 0) return;
    const txType = isCredit ? 'credit' : form.transaction_type;
    if (editingId) {
      await update({ ...form, id: editingId, transaction_type: txType } as UpdateTransactionData);
    } else {
      let subId: string | null = null;
      if (form.is_subscription) {
        const subData: CreateSubscriptionData = {
          description: form.description || `Assinatura - ${api.formatCurrency(form.amount)}`,
          amount: form.amount, charge_day: form.charge_day, frequency: form.frequency,
          account_id: form.account_id, category_id: form.category_id,
          next_charge: form.date, active: true,
        };
        const sub = await api.createSubscription(subData);
        subId = sub.id;
      }
      await create({ ...form, transaction_type: txType, subscription_id: subId });
    }
    setModalOpen(false);
    loadData();
    loadAccounts();
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    loadData();
    loadAccounts();
  };

  const addTag = async () => {
    if (!newTagName.trim()) return;
    const t = await api.createTag(newTagName.trim(), '#6366f1');
    setTags((prev) => [...prev, t]);
    setForm((f) => ({ ...f, tag_ids: [...f.tag_ids, t.id] }));
    setNewTagName('');
  };

  const toggleTag = (tagId: string) => {
    setForm((f) => ({
      ...f, tag_ids: f.tag_ids.includes(tagId) ? f.tag_ids.filter((id) => id !== tagId) : [...f.tag_ids, tagId],
    }));
  };

  // Calendar helpers
  const daysInMonth = api.getDaysInMonth(selectedMonth, selectedYear);
  const firstDay = api.getFirstDayOfMonth(selectedMonth, selectedYear);
  const txByDay = new Map<number, number>();
  transactions.forEach((tx) => {
    const d = parseInt(tx.date.slice(8, 10));
    txByDay.set(d, (txByDay.get(d) || 0) + 1);
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Transações</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCalendar(!showCalendar)}><Calendar size={16} /></Button>
          <Button onClick={openNew}><Plus size={16} /> Nova Transação</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Buscar..." value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowFilter(!showFilter)}><Filter size={14} /> Filtros</Button>
        {(filterAccount || filterCategory || filterType) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterAccount(''); setFilterCategory(''); setFilterType(''); }}>Limpar</Button>
        )}
      </div>

      {showFilter && (
        <div className="flex gap-3 flex-wrap animate-slideUp">
          <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all">
            <option value="">Todas contas</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all">
            <option value="">Todas categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all">
            <option value="">Todos tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
            <option value="credit">Crédito</option>
          </select>
        </div>
      )}

      {showCalendar && (
        <Card className="animate-slideUp">
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div key={d} className="text-xs font-medium text-slate-400 py-1">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const count = txByDay.get(day) || 0;
              return (
                <div key={day} className="relative py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <span className="text-slate-700 dark:text-slate-300">{day}</span>
                  {count > 0 && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                      <div key={j} className="w-1 h-1 rounded-full bg-indigo-500" />
                    ))}
                  </div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : transactions.length === 0 ? (
        <EmptyState title="Nenhuma transação encontrada" description="Crie uma nova transação para começar" />
      ) : (
        <div className="space-y-1">
          {transactions.map((tx, i) => (
            <Card key={tx.id} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-9 h-9 rounded-xl shrink-0"
                    style={{ backgroundColor: tx.category_color || '#94a3b8' }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {tx.description || tx.category_name || 'Sem descrição'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      <span>{tx.account_name}</span>
                      <span>&middot;</span>
                      <span>{api.parseDate(tx.date)}</span>
                      {tx.total_installments && tx.total_installments > 0 && (
                        <Badge variant="warning">{tx.total_installments}x</Badge>
                      )}
                      {tx.transaction_type === 'credit' && <Badge variant="default">Crédito</Badge>}
                      {tx.subscription_id && <Badge variant="default">Assinatura</Badge>}
                      {tx.tags.length > 0 && tx.tags.map((t) => (
                        <Link key={t.id} to={`/tags/${t.id}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: t.color + '20', color: t.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-semibold ${txColor(tx)}`}>{sign(tx)}{api.formatCurrency(tx.amount)}</span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tx)}><Edit2 size={14} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)}><Trash2 size={14} className="text-rose-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Transação' : 'Nova Transação'}>
        <div className="space-y-3">
          <div className="flex gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
            <button onClick={() => setForm((f) => ({ ...f, transaction_type: 'expense', category_id: null, total_installments: null }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.transaction_type === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Despesa</button>
            <button onClick={() => setForm((f) => ({ ...f, transaction_type: 'income', category_id: null, total_installments: null }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.transaction_type === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Receita</button>
          </div>

          <Select label="Conta" options={accounts.map((a) => ({ value: a.id, label: `${a.name}${a.type === 'credit' ? ' 💳' : ''}` }))}
            value={form.account_id}
            onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value, total_installments: accounts.find((a) => a.id === e.target.value)?.type === 'credit' ? 1 : null }))} />

          <Select label="Categoria" options={[{ value: '', label: 'Sem categoria' }, ...filteredCats.map((c) => ({ value: c.id, label: c.name }))]}
            value={form.category_id || ''}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))} />

          <Input label="Valor" type="number" step="0.01" min="0" placeholder="0,00" value={form.amount || ''}
            onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />

          <Input label="Descrição" placeholder="Descreva o gasto..." value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />

          <Input label="Data" type="date" value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />

          {form.transaction_type === 'expense' && (
            <div className="border-t border-slate-800 pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_subscription}
                  onChange={(e) => setForm((f) => ({ ...f, is_subscription: e.target.checked }))}
                  className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/30" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">É assinatura?</span>
              </label>
              {form.is_subscription && (
                <div className="grid grid-cols-2 gap-4 mt-3 animate-slideUp">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dia de Cobrança</label>
                    <input type="number" min="1" max="31" value={form.charge_day}
                      onChange={(e) => setForm((f) => ({ ...f, charge_day: Math.min(31, Math.max(1, Number(e.target.value) || 1)) }))}
                      className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Frequência</label>
                    <select value={form.frequency}
                      onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                      className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all">
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {isCredit && (
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parcelamento</label>
              <div className="flex gap-2 items-center mt-1.5">
                <input type="number" min="1" max="48" value={form.total_installments || 1}
                  onChange={(e) => setForm((f) => ({ ...f, total_installments: parseInt(e.target.value) || 1 }))}
                  className="w-20 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
                <span className="text-sm text-slate-400">x de</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {form.amount && form.total_installments ? api.formatCurrency(form.amount / form.total_installments) : api.formatCurrency(0)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tags</label>
            <div className="flex gap-1.5 flex-wrap mt-1.5 mb-2">
              {tags.map((t) => (
                <button key={t.id} onClick={() => toggleTag(t.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${form.tag_ids.includes(t.id) ? 'text-white shadow-sm' : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-700/50'}`}
                  style={form.tag_ids.includes(t.id) ? { backgroundColor: t.color } : {}}>
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input placeholder="Nova tag..." value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
              <Button size="sm" variant="secondary" onClick={addTag}>+</Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
