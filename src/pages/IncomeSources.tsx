import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useIncomeSources } from '../stores/useIncomeSources';
import { useAccounts } from '../stores/useAccounts';
import { useCategories } from '../stores/useCategories';
import * as api from '../lib/api';
import type { IncomeSource, CreateIncomeSourceData, UpdateIncomeSourceData } from '../types';

const frequencies = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];

const emptyForm: CreateIncomeSourceData = {
  name: '',
  amount: null,
  entry_day: 1,
  account_id: '',
  is_fixed: true,
  frequency: 'monthly',
  category_id: null,
  notes: null,
  active: true,
};

export function IncomeSources() {
  const { sources, load, create, update, remove } = useIncomeSources();
  const { accounts, load: loadAccounts } = useAccounts();
  const { categories, load: loadCategories } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateIncomeSourceData>(emptyForm);

  useEffect(() => { load(); loadAccounts(); loadCategories(); }, [load, loadAccounts, loadCategories]);

  const openNew = () => { setEditingId(null); setForm({ ...emptyForm, account_id: accounts.length > 0 ? accounts[0].id : '' }); setModalOpen(true); };
  const openEdit = (s: IncomeSource) => {
    setEditingId(s.id);
    setForm({
      name: s.name, amount: s.amount, entry_day: s.entry_day,
      account_id: s.account_id, is_fixed: s.is_fixed, frequency: s.frequency,
      category_id: s.category_id, notes: s.notes, active: s.active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.account_id) return;
    if (editingId) {
      await update({ ...form, id: editingId } as UpdateIncomeSourceData);
    } else {
      await create(form);
    }
    setModalOpen(false);
  };

  const incomeCats = categories.filter((c) => c.type === 'income');

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Fontes de Renda</h1>
        <Button onClick={openNew}><Plus size={16} /> Nova Fonte</Button>
      </div>

      {sources.length === 0 ? (
        <EmptyState title="Nenhuma fonte de renda" description="Cadastre fontes de renda como salário, freelas, investimentos..." />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sources.map((s, i) => {
            const freqLabel = frequencies.find((f) => f.value === s.frequency)?.label || s.frequency;
            return (
              <Card key={s.id} className="!p-4 animate-slideUp" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold text-emerald-500 bg-emerald-900/30">
                      R$
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{s.name}</span>
                        {!s.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-medium">Inativo</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                        <span>{s.account_name || 'Sem conta'}</span>
                        <span>Dia {s.entry_day}</span>
                        <span>{freqLabel}</span>
                        {s.is_fixed ? <span className="text-emerald-500">Fixo</span> : <span className="text-amber-500">Variável</span>}
                        {s.category_name && <span style={{ color: s.category_color || undefined }}>{s.category_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-base font-semibold text-emerald-400">
                        {s.amount !== null ? api.formatCurrency(s.amount) : 'Variável'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit2 size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 size={14} className="text-rose-400" /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Fonte de Renda' : 'Nova Fonte de Renda'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome</label>
            <input placeholder="Ex: Salário, Freela, Aluguel..." value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</label>
              <input type="number" step="0.01" min="0" placeholder="Deixe vazio se variável" value={form.amount ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value ? Number(e.target.value) : null }))}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dia de Entrada</label>
              <input type="number" min="1" max="31" value={form.entry_day}
                onChange={(e) => setForm((f) => ({ ...f, entry_day: Math.min(31, Math.max(1, Number(e.target.value) || 1)) }))}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conta de Destino</label>
            <select value={form.account_id}
              onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all">
              <option value="">Selecione uma conta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Frequência</label>
              <select value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all">
                {frequencies.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</label>
              <div className="flex gap-2 mt-1.5 bg-slate-800/50 p-1 rounded-xl">
                <button onClick={() => setForm((f) => ({ ...f, is_fixed: true }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.is_fixed ? 'bg-slate-700 shadow-sm text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  Fixo
                </button>
                <button onClick={() => setForm((f) => ({ ...f, is_fixed: false }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${!form.is_fixed ? 'bg-slate-700 shadow-sm text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  Variável
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria (opcional)</label>
            <select value={form.category_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all">
              <option value="">Sem categoria</option>
              {incomeCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observações</label>
            <textarea placeholder="Anotações adicionais..." value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all resize-none" rows={2} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/30" />
            <label htmlFor="active" className="text-sm text-slate-300">Fonte ativa</label>
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
