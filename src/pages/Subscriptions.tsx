import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Repeat } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAccounts } from '../stores/useAccounts';
import { useCategories } from '../stores/useCategories';
import * as api from '../lib/api';
import type { Subscription, CreateSubscriptionData, UpdateSubscriptionData } from '../types';

const frequencies = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'weekly', label: 'Semanal' },
];

const emptyForm: CreateSubscriptionData = {
  description: '', amount: 0, charge_day: 1, frequency: 'monthly',
  account_id: '', category_id: null, next_charge: api.todayStr(), active: true,
};

export function Subscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const { accounts, load: loadAccounts } = useAccounts();
  const { categories, load: loadCategories } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSubscriptionData>(emptyForm);

  const load = async () => {
    const s = await api.getSubscriptions();
    setSubs(s);
  };

  useEffect(() => { load(); loadAccounts(); loadCategories(); }, [loadAccounts, loadCategories]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, account_id: accounts.length > 0 ? accounts[0].id : '', next_charge: api.todayStr() });
    setModalOpen(true);
  };

  const openEdit = (s: Subscription) => {
    setEditingId(s.id);
    setForm({
      description: s.description, amount: s.amount, charge_day: s.charge_day,
      frequency: s.frequency, account_id: s.account_id, category_id: s.category_id,
      next_charge: s.next_charge, active: s.active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.account_id || form.amount <= 0) return;
    if (editingId) {
      await api.updateSubscription({ ...form, id: editingId } as UpdateSubscriptionData);
    } else {
      await api.createSubscription(form);
    }
    setModalOpen(false);
    load();
  };

  const remove = async (id: string) => {
    await api.deleteSubscription(id);
    load();
  };

  const freqLabel = (f: string) => frequencies.find((x) => x.value === f)?.label || f;

  const subsByMonth = new Map<string, Subscription[]>();
  subs.filter((s) => s.active).forEach((s) => {
    const key = `${s.next_charge.slice(0, 7)}`;
    if (!subsByMonth.has(key)) subsByMonth.set(key, []);
    subsByMonth.get(key)!.push(s);
  });
  // const sortedMonths = Array.from(subsByMonth.keys()).sort();

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Assinaturas</h1>
        <Button onClick={openNew}><Plus size={16} /> Nova Assinatura</Button>
      </div>

      {subs.length === 0 ? (
        <EmptyState title="Nenhuma assinatura" description="Cadastre assinaturas como Netflix, Spotify, planos de internet..." />
      ) : (
        <div className="space-y-1">
          {subs.map((s, i) => {
            const today = new Date();
            const next = new Date(s.next_charge + 'T00:00:00');
            const isDue = s.active && next <= today;
            return (
              <Card key={s.id} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-indigo-900/30 text-indigo-400">
                      <Repeat size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-300">{s.description}</span>
                        {!s.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-medium">Inativo</span>}
                        {isDue && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900/40 text-rose-400 font-medium">A vencer</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span>{s.account_name || 'Sem conta'}</span>
                        <span>&middot;</span>
                        <span>Dia {s.charge_day}</span>
                        <span>&middot;</span>
                        <span>{freqLabel(s.frequency)}</span>
                        {s.category_name && <span>&middot;</span>}
                        {s.category_name && <span style={{ color: s.category_color || undefined }}>{s.category_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-200">{api.formatCurrency(s.amount)}</p>
                      <p className="text-[10px] text-slate-500">Próx: {api.parseDate(s.next_charge)}</p>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Assinatura' : 'Nova Assinatura'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição</label>
            <input placeholder="Ex: Netflix, Spotify, Internet..." value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</label>
              <input type="number" step="0.01" min="0" placeholder="0,00" value={form.amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dia de Cobrança</label>
              <input type="number" min="1" max="31" value={form.charge_day}
                onChange={(e) => setForm((f) => ({ ...f, charge_day: Math.min(31, Math.max(1, Number(e.target.value) || 1)) }))}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conta de Débito</label>
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
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Próxima Cobrança</label>
              <input type="date" value={form.next_charge}
                onChange={(e) => setForm((f) => ({ ...f, next_charge: e.target.value }))}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria (opcional)</label>
            <select value={form.category_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-600 transition-all">
              <option value="">Sem categoria</option>
              {categories.filter((c) => c.type === 'expense').map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="sub-active" checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/30" />
            <label htmlFor="sub-active" className="text-sm text-slate-300">Assinatura ativa</label>
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
