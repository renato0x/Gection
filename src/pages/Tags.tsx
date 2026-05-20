import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import * as api from '../lib/api';
import type { Tag, UpdateTagData } from '../types';

export function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);

  const load = async () => {
    const t = await api.getTags();
    setTags(t);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    const t = await api.createTag(newName.trim(), newColor);
    setTags((prev) => [...prev, t]);
    setNewName('');
    setNewColor('#6366f1');
  };

  const startEdit = (t: Tag) => setEditing({ id: t.id, name: t.name, color: t.color });
  const saveEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    await api.updateTag(editing as UpdateTagData);
    setTags((prev) => prev.map((t) => t.id === editing.id ? { ...t, name: editing.name, color: editing.color } : t));
    setEditing(null);
  };

  const remove = async (id: string) => {
    await api.deleteTag(id);
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Tags</h1>
      </div>

      <Card className="animate-slideUp">
        <div className="flex gap-2.5">
          <input placeholder="Nome da tag..." value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
          <input type="color" value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 hover:border-slate-300 dark:hover:border-slate-600 transition-all" />
          <Button onClick={add}><Plus size={16} /> Adicionar</Button>
        </div>
      </Card>

      {tags.length === 0 ? (
        <EmptyState title="Nenhuma tag" description="Crie tags para organizar suas transações" />
      ) : (
        <div className="space-y-1">
          {tags.map((t, i) => (
            <Card key={t.id} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between gap-3">
                {editing?.id === t.id ? (
                  <>
                    <div className="flex items-center gap-2 flex-1">
                      <input type="color" value={editing.color}
                        onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer" />
                      <input value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all" />
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={saveEdit}><Save size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X size={14} /></Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg" style={{ backgroundColor: t.color }} />
                      <span className="text-sm font-medium text-slate-300">{t.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(t)}><Edit2 size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 size={14} className="text-rose-400" /></Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
