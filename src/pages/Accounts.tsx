import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tags } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAccounts } from '../stores/useAccounts';
import * as api from '../lib/api';
import type { Account, CreateAccountData, UpdateAccountData, Tag, UpdateTagData } from '../types';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAccountData>(emptyForm);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagEdit, setTagEdit] = useState<{ id: string; name: string; color: string } | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (a: Account) => {
    setEditingId(a.id);
    setForm({ name: a.name, account_type: a.type, color: a.color, balance: a.balance, credit_limit: a.credit_limit, closing_day: a.closing_day, due_day: a.due_day });
    setModalOpen(true);
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

  const total = accounts.reduce((s, a) => s + a.balance, 0);

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Contas</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openTags}><Tags size={16} /> Tags</Button>
          <Button onClick={openNew}><Plus size={16} /> Nova Conta</Button>
        </div>
      </div>

      <Card className="!py-4 !px-5 animate-slideUp">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saldo Total (sem cartão)</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{api.formatCurrency(total)}</p>
      </Card>

      {accounts.length === 0 ? (
        <EmptyState title="Nenhuma conta cadastrada" description="Adicione sua primeira conta para começar" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {accounts.map((a, i) => (
            <Card key={a.id} className="animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: a.color }}>
                    {a.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{a.name}</p>
                    <p className="text-xs text-slate-400">{typeLabels[a.type] || a.type}</p>
                    {a.type === 'credit' && a.credit_limit && (
                      <p className="text-xs text-violet-500 mt-0.5">Limite: {api.formatCurrency(a.credit_limit)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-base font-semibold ${a.type === 'credit' ? 'text-violet-600' : 'text-slate-900 dark:text-slate-100'}`}>
                    {a.type === 'credit' ? api.formatCurrency(a.credit_limit ?? 0) : api.formatCurrency(a.balance)}
                  </p>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit2 size={14} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 size={14} className="text-rose-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Conta' : 'Nova Conta'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome</label>
            <input placeholder="Nome da conta" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</label>
            <select value={form.account_type}
              onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all">
              {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saldo Inicial</label>
            <input type="number" step="0.01" placeholder="0,00" value={form.balance || ''}
              onChange={(e) => setForm((f) => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
          </div>

          {form.account_type === 'credit' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Limite de Crédito</label>
                <input type="number" step="0.01" placeholder="0,00" value={form.credit_limit || ''}
                  onChange={(e) => setForm((f) => ({ ...f, credit_limit: parseFloat(e.target.value) || 0 }))}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fechamento</label>
                  <input type="number" min="1" max="31" value={form.closing_day ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, closing_day: parseInt(e.target.value) || 1 }))}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vencimento</label>
                  <input type="number" min="1" max="31" value={form.due_day ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, due_day: parseInt(e.target.value) || 10 }))}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cor</label>
            <input type="color" value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="w-full mt-1.5 h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={tagModalOpen} onClose={() => setTagModalOpen(false)} title="Gerenciar Tags">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input placeholder="Nova tag..." value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
            <input type="color" value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
            <Button size="sm" onClick={addTag}>+</Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {tags.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <span className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: t.color }} />
                {tagEdit?.id === t.id ? (
                  <div className="flex-1 flex gap-1">
                    <input value={tagEdit.name}
                      onChange={(e) => setTagEdit({ ...tagEdit, name: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <input type="color" value={tagEdit.color}
                      onChange={(e) => setTagEdit({ ...tagEdit, color: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer" />
                    <Button size="sm" variant="primary" onClick={saveTag}>OK</Button>
                    <Button size="sm" variant="ghost" onClick={() => setTagEdit(null)}>X</Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{t.name}</span>
                    <button onClick={() => setTagEdit(t)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><Edit2 size={12} /></button>
                    <button onClick={() => removeTag(t.id)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-400"><Trash2 size={12} /></button>
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
