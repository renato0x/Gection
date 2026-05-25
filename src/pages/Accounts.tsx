import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Tags, ArrowUpRight, ArrowDownRight, CreditCard, Landmark } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAccounts } from '../stores/useAccounts';
import * as api from '../lib/api';
import type { Account, CreateAccountData, UpdateAccountData, AccountMonthlyStats, Tag, UpdateTagData, CreditUsage } from '../types';

const emptyForm: CreateAccountData = {
  name: '', account_type: 'checking', balance: 0, color: '#6366f1',
  credit_limit: null, closing_day: null, due_day: null,
};

const typeLabels: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança', credit: 'Cartão de Crédito',
  cash: 'Dinheiro', investment: 'Investimento',
};

export function Accounts() {
  const { accounts, load, create, update, remove } = useAccounts();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAccountData>(emptyForm);
  const [monthlyStats, setMonthlyStats] = useState<AccountMonthlyStats[]>([]);
  const [creditUsage, setCreditUsage] = useState<CreditUsage[]>([]);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagEdit, setTagEdit] = useState<{ id: string; name: string; color: string } | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [stats, usage] = await Promise.all([
          api.getAccountMonthlyStats(api.currentMonth(), api.currentYear()),
          api.getCreditUsage(),
        ]);
        setMonthlyStats(stats);
        setCreditUsage(usage);
      } catch {}
    })();
  }, [accounts]);

  const debitAccounts = accounts.filter((a) => a.type !== 'credit');
  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const total = debitAccounts.reduce((s, a) => s + a.balance, 0);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (a: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(a.id);
    setForm({ name: a.name, account_type: a.type, color: a.color, balance: a.balance, credit_limit: a.credit_limit, closing_day: a.closing_day, due_day: a.due_day });
    setModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    remove(id);
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (editingId) {
      await update({ ...form, id: editingId } as UpdateAccountData);
    } else {
      await create(form);
    }
    setModalOpen(false);
  };

  const getStats = (id: string) => monthlyStats.find((s) => s.account_id === id);
  const getCredit = (id: string) => creditUsage.find((c) => c.account_id === id);

  const openTags = async () => {
    const t = await api.getTags();
    setTags(t);
    setTagModalOpen(true);
  };

  const addTag = async () => {
    if (!newTagName.trim()) return;
    const t = await api.createTag(newTagName.trim(), newTagColor);
    setTags((prev) => [...prev, t]);
    setNewTagName('');
    setNewTagColor('#6366f1');
  };

  const saveTag = async () => {
    if (!tagEdit) return;
    await api.updateTag(tagEdit as UpdateTagData);
    setTags((prev) => prev.map((t) => t.id === tagEdit.id ? { ...t, name: tagEdit.name, color: tagEdit.color } : t));
    setTagEdit(null);
  };

  const removeTag = async (id: string) => {
    await api.deleteTag(id);
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Contas</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openTags}><Tags size={16} /> Tags</Button>
          <Button onClick={openNew}><Plus size={16} /> Nova Conta</Button>
        </div>
      </div>

      {/* Total Balance */}
      <Card className="!py-4 !px-5 animate-slideUp">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Total (sem cartão)</p>
        <p className="text-2xl font-bold text-slate-100">{api.formatCurrency(total)}</p>
      </Card>

      {accounts.length === 0 ? (
        <EmptyState title="Nenhuma conta cadastrada" description="Adicione sua primeira conta para começar" />
      ) : (
        <>
          {/* Debit Accounts Section */}
          {debitAccounts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Landmark size={16} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contas Correntes / Débito</span>
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{debitAccounts.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debitAccounts.map((a, i) => {
                  const s = getStats(a.id);
                  return (
                    <Card key={a.id} className="animate-slideUp cursor-pointer" style={{ animationDelay: `${i * 50}ms` }}
                      onClick={() => navigate('/transactions', { state: { focusAccountId: a.id } })}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ backgroundColor: a.color }}>
                            {a.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{a.name}</p>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{typeLabels[a.type] || a.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => openEdit(a, e)}><Edit2 size={14} /></Button>
                          <Button variant="ghost" size="icon" onClick={(e) => handleDelete(a.id, e)}><Trash2 size={14} className="text-rose-400" /></Button>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <p className="text-2xl font-bold text-slate-100">{api.formatCurrency(a.balance)}</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Saldo Atual</p>
                      </div>

                      <div className="mt-4 flex items-center gap-4">
                        <div className="flex-1 p-2.5 rounded-lg bg-emerald-900/15">
                          <div className="flex items-center gap-1.5">
                            <ArrowUpRight size={12} className="text-emerald-400" />
                            <span className="text-xs font-semibold text-emerald-400">{api.formatCurrency(s?.month_income ?? 0)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Entradas (mês)</p>
                        </div>
                        <div className="flex-1 p-2.5 rounded-lg bg-rose-900/15">
                          <div className="flex items-center gap-1.5">
                            <ArrowDownRight size={12} className="text-rose-400" />
                            <span className="text-xs font-semibold text-rose-400">{api.formatCurrency(s?.month_expense ?? 0)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Saídas (mês)</p>
                        </div>
                      </div>

                      {s?.last_tx_date && (
                        <div className="mt-3 pt-3 border-t border-slate-800">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">Última movimentação</span>
                            <span className="text-slate-400">
                              {api.formatCurrency(s.last_tx_amount ?? 0)} • {api.parseDate(s.last_tx_date)}
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Credit Accounts Section */}
          {creditAccounts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cartões de Crédito</span>
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{creditAccounts.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {creditAccounts.map((a, i) => {
                  const cu = getCredit(a.id);
                  const usagePct = cu && cu.credit_limit > 0 ? Math.min(cu.total_used / cu.credit_limit, 1) : 0;
                  return (
                    <Card key={a.id} className="animate-slideUp cursor-pointer" style={{ animationDelay: `${i * 50}ms` }}
                      onClick={() => navigate('/transactions', { state: { focusAccountId: a.id } })}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ backgroundColor: a.color }}>
                            {a.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{a.name}</p>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{typeLabels[a.type] || a.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => openEdit(a, e)}><Edit2 size={14} /></Button>
                          <Button variant="ghost" size="icon" onClick={(e) => handleDelete(a.id, e)}><Trash2 size={14} className="text-rose-400" /></Button>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <p className="text-2xl font-bold text-emerald-400">
                          {cu ? api.formatCurrency(cu.available) : (a.credit_limit ? api.formatCurrency(a.credit_limit) : '—')}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Limite Disponível</p>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-400">Usado: {cu ? api.formatCurrency(cu.total_used) : '—'}</span>
                          <span className="text-slate-500">Limite: {a.credit_limit ? api.formatCurrency(a.credit_limit) : '—'}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${usagePct * 100}%`,
                              background: usagePct > 0.8
                                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                : usagePct > 0.5
                                ? 'linear-gradient(90deg, #22d3ee, #f59e0b)'
                                : 'linear-gradient(90deg, #10b981, #22d3ee)',
                            }} />
                        </div>
                        <p className="text-right text-[10px] text-slate-500 mt-1">{Math.round(usagePct * 100)}% utilizado</p>
                      </div>

                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Fatura Atual</span>
                          <span className="font-semibold text-slate-300">
                            {cu ? api.formatCurrency(cu.current_invoice_total) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Fechamento</span>
                          <span className="text-slate-400">dia {a.closing_day ?? '—'}</span>
                        </div>
                        {cu && cu.future_invoices_total > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Próx. faturas</span>
                            <span className="text-amber-400 font-semibold">{api.formatCurrency(cu.future_invoices_total)}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Conta' : 'Nova Conta'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome</label>
            <input placeholder="Nome da conta" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</label>
            <select value={form.account_type}
              onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all">
              {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Inicial</label>
            <input type="number" step="0.01" placeholder="0,00" value={form.balance || ''}
              onChange={(e) => setForm((f) => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
          </div>

          {form.account_type === 'credit' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Limite de Crédito</label>
                <input type="number" step="0.01" placeholder="0,00" value={form.credit_limit || ''}
                  onChange={(e) => setForm((f) => ({ ...f, credit_limit: parseFloat(e.target.value) || 0 }))}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fechamento</label>
                  <input type="number" min="1" max="31" value={form.closing_day ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, closing_day: parseInt(e.target.value) || 1 }))}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vencimento</label>
                  <input type="number" min="1" max="31" value={form.due_day ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, due_day: parseInt(e.target.value) || 10 }))}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cor</label>
            <input type="color" value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="w-full mt-1.5 h-10 rounded-xl border border-slate-700 cursor-pointer hover:border-slate-600 transition-all" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Tags Modal */}
      <Modal open={tagModalOpen} onClose={() => setTagModalOpen(false)} title="Gerenciar Tags">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input placeholder="Nova tag..." value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
            <input type="color" value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-11 h-11 rounded-xl border border-slate-700 cursor-pointer shrink-0 hover:border-slate-600 transition-all" />
            <Button size="sm" onClick={addTag}>+</Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {tags.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/50">
                <span className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: t.color }} />
                {tagEdit?.id === t.id ? (
                  <div className="flex-1 flex gap-1">
                    <input value={tagEdit.name}
                      onChange={(e) => setTagEdit({ ...tagEdit, name: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <input type="color" value={tagEdit.color}
                      onChange={(e) => setTagEdit({ ...tagEdit, color: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer" />
                    <Button size="sm" variant="primary" onClick={saveTag}>OK</Button>
                    <Button size="sm" variant="ghost" onClick={() => setTagEdit(null)}>X</Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-300">{t.name}</span>
                    <button onClick={() => setTagEdit(t)} className="p-1 rounded hover:bg-slate-800 text-slate-400"><Edit2 size={12} /></button>
                    <button onClick={() => removeTag(t.id)} className="p-1 rounded hover:bg-slate-800 text-rose-400"><Trash2 size={12} /></button>
                  </>
                )}
              </div>
            ))}
            {tags.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhuma tag criada</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
