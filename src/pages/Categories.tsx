import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useCategories } from '../stores/useCategories';
import type { CreateCategoryData, UpdateCategoryData } from '../types';

const emptyForm: CreateCategoryData = {
  name: '', icon: 'tag', color: '#6366f1', category_type: 'expense',
};

export function Categories() {
  const { categories, load, create, update, remove } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCategoryData>(emptyForm);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: { id: string; name: string; color: string; type: string }) => {
    setEditingId(c.id);
    setForm({ name: c.name, icon: 'tag', color: c.color, category_type: c.type });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await update({ ...form, id: editingId } as UpdateCategoryData);
    } else {
      await create(form);
    }
    setModalOpen(false);
  };

  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Categorias</h1>
        <Button onClick={openNew}><Plus size={16} /> Nova Categoria</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="Nenhuma categoria" description="Crie categorias para organizar suas transações" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Despesas</p>
            {expenseCats.length === 0 ? (
              <p className="text-sm text-slate-400 px-1 py-2">Nenhuma despesa cadastrada</p>
            ) : (
              expenseCats.map((c, i) => (
                <Card key={c.id} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 size={14} className="text-rose-400" /></Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Receitas</p>
            {incomeCats.length === 0 ? (
              <p className="text-sm text-slate-400 px-1 py-2">Nenhuma receita cadastrada</p>
            ) : (
              incomeCats.map((c, i) => (
                <Card key={c.id} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 size={14} className="text-rose-400" /></Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Categoria' : 'Nova Categoria'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome</label>
            <input placeholder="Ex: Alimentação, Transporte..." value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</label>
            <div className="flex gap-2 mt-1.5 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
              <button onClick={() => setForm((f) => ({ ...f, category_type: 'expense' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.category_type === 'expense' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                Despesa
              </button>
              <button onClick={() => setForm((f) => ({ ...f, category_type: 'income' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.category_type === 'income' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                Receita
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cor</label>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-10 h-10 rounded-xl shrink-0 border-2 border-slate-200 dark:border-slate-700" style={{ backgroundColor: form.color }} />
              <input type="color" value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all bg-white dark:bg-slate-800/60" />
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
