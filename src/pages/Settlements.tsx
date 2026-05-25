import { useEffect, useState, useRef } from 'react';
import { Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2, Calculator, ChevronRight, X, Trash2, Save, Pencil, Search, History, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Calculator as CalcWidget } from '../components/Calculator';
import { useSettlements } from '../stores/useSettlements';
import * as api from '../lib/api';
import type { PersonSettlement, SettlementWriteoff, CreatePersonSettlementData, Account as Acc, Person } from '../types';

type FilterT = 'all' | 'lent' | 'borrowed' | 'open' | 'resolved';

const filters: { value: FilterT; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'lent', label: 'Me devem' },
  { value: 'borrowed', label: 'Eu devo' },
  { value: 'open', label: 'Abertos' },
  { value: 'resolved', label: 'Resolvidos' },
];

const emptyForm: CreatePersonSettlementData = {
  person_name: '', settlement_type: 'lent', original_amount: 0,
  description: '', date: new Date().toISOString().slice(0, 10), notes: null,
  account_id: '',
};

export function Settlements() {
  const { settlements, load, create, update, remove, resolve, writeoffUpdate, writeoffDelete } = useSettlements();

  const [filter, setFilter] = useState<FilterT>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [writeoffOpen, setWriteoffOpen] = useState(false);
  const [personHistoryOpen, setPersonHistoryOpen] = useState(false);
  const [showCalc, setShowCalc] = useState<'create' | 'writeoff' | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePersonSettlementData>(emptyForm);
  const [selectedSettlement, setSelectedSettlement] = useState<PersonSettlement | null>(null);
  const [writeoffs, setWriteoffs] = useState<SettlementWriteoff[]>([]);
  const [personSettlements, setPersonSettlements] = useState<PersonSettlement[]>([]);

  const [writeoffAmt, setWriteoffAmt] = useState(0);
  const [writeoffDesc, setWriteoffDesc] = useState('');
  const [writeoffDate, setWriteoffDate] = useState(new Date().toISOString().slice(0, 10));

  // Editing a specific writeoff
  const [editWriteoffId, setEditWriteoffId] = useState<string | null>(null);
  const [editWriteoffAmt, setEditWriteoffAmt] = useState(0);
  const [editWriteoffDesc, setEditWriteoffDesc] = useState('');
  const [editWriteoffDate, setEditWriteoffDate] = useState('');

  // Person autocomplete
  const [persons, setPersons] = useState<Person[]>([]);
  const [personSearch, setPersonSearch] = useState('');
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const personInputRef = useRef<HTMLInputElement>(null);
  const personDropdownRef = useRef<HTMLDivElement>(null);

  // Accounts
  const [accounts, setAccounts] = useState<Acc[]>([]);

  useEffect(() => { load(); loadPersons(); loadAccounts(); }, [load]);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(e.target as Node) &&
          personInputRef.current && !personInputRef.current.contains(e.target as Node)) {
        setPersonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadPersons() {
    setPersons(await api.getPersons());
  }
  async function loadAccounts() {
    setAccounts(await api.getAccounts());
  }

  const openSettlements = settlements.filter((s) => s.status === 'open');
  const resolvedSettlements = settlements.filter((s) => s.status === 'resolved');

  const totalLent = settlements.filter((s) => s.settlement_type === 'lent' && s.status === 'open').reduce((a, b) => a + b.current_amount, 0);
  const totalBorrowed = settlements.filter((s) => s.settlement_type === 'borrowed' && s.status === 'open').reduce((a, b) => a + b.current_amount, 0);
  const netBalance = totalLent - totalBorrowed;

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10), account_id: accounts[0]?.id || '' });
    setPersonSearch('');
    setSelectedPerson(null);
    setModalOpen(true);
  };

  const openEdit = (s: PersonSettlement) => {
    setEditingId(s.id);
    setForm({
      person_id: s.person_id, person_name: s.person_name,
      account_id: s.account_id || '', settlement_type: s.settlement_type,
      original_amount: s.original_amount, description: s.description,
      date: s.date, notes: s.notes,
    });
    setPersonSearch(s.person_name);
    setSelectedPerson(persons.find((p) => p.id === s.person_id) || null);
    setModalOpen(true);
  };

  const openDetail = async (s: PersonSettlement) => {
    setSelectedSettlement(s);
    setEditWriteoffId(null);
    const w = await api.getSettlementWriteoffs(s.id);
    setWriteoffs(w);
    setDetailOpen(true);
  };

  const openWriteoff = (s: PersonSettlement) => {
    setSelectedSettlement(s);
    setWriteoffAmt(0);
    setWriteoffDesc('');
    setWriteoffDate(new Date().toISOString().slice(0, 10));
    setEditWriteoffId(null);
    setWriteoffOpen(true);
  };

  const openPersonHistory = async (personId: string) => {
    const ss = await api.getPersonSettlements(personId);
    setPersonSettlements(ss);
    setPersonHistoryOpen(true);
  };

  // Person autocomplete helpers
  const personFiltered = persons.filter((p) =>
    p.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  const selectPerson = (p: Person) => {
    setSelectedPerson(p);
    setPersonSearch(p.name);
    setForm((f) => ({ ...f, person_id: p.id, person_name: p.name }));
    setPersonDropdownOpen(false);
  };

  const handlePersonInputChange = (value: string) => {
    setPersonSearch(value);
    setForm((f) => ({ ...f, person_name: value, person_id: undefined }));
    setSelectedPerson(null);
    if (value.length > 0) setPersonDropdownOpen(true);
    else setPersonDropdownOpen(false);
  };

  const handleSave = async () => {
    if (!form.person_name.trim() || form.original_amount <= 0 || !form.account_id) return;
    if (editingId) {
      await update({
        id: editingId, person_id: form.person_id || '',
        account_id: form.account_id, settlement_type: form.settlement_type,
        description: form.description, date: form.date, notes: form.notes,
      });
    } else {
      await create(form);
    }
    setModalOpen(false);
    await loadPersons();
  };

  const handleWriteoff = async () => {
    if (!selectedSettlement || writeoffAmt <= 0) return;
    await api.writeoffSettlement({
      settlement_id: selectedSettlement.id, amount: writeoffAmt,
      date: writeoffDate, description: writeoffDesc || null,
    });
    setWriteoffOpen(false);
    // Refresh
    const updated = await api.getSettlement(selectedSettlement.id);
    setSelectedSettlement(updated);
    setWriteoffs(await api.getSettlementWriteoffs(selectedSettlement.id));
    load();
  };

  const handleEditWriteoff = async () => {
    if (!selectedSettlement || !editWriteoffId || editWriteoffAmt <= 0) return;
    const updated = await writeoffUpdate({
      id: editWriteoffId, amount: editWriteoffAmt,
      date: editWriteoffDate, description: editWriteoffDesc || null,
    });
    setSelectedSettlement(updated);
    setWriteoffs(await api.getSettlementWriteoffs(selectedSettlement.id));
    setEditWriteoffId(null);
  };

  const handleDeleteWriteoff = async (woId: string) => {
    if (!selectedSettlement) return;
    const updated = await writeoffDelete(woId);
    setSelectedSettlement(updated);
    setWriteoffs(await api.getSettlementWriteoffs(selectedSettlement.id));
  };

  const handleResolve = async (id: string) => {
    const updated = await resolve(id);
    setSelectedSettlement(updated);
    setWriteoffs(await api.getSettlementWriteoffs(id));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Acertos</h1>
        <Button onClick={openNew}><Plus size={16} /> Novo Acerto</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight size={16} className="text-emerald-400" />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Me devem</p>
          </div>
          <p className="text-lg font-bold text-emerald-400 mt-1">{api.formatCurrency(totalLent)}</p>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <ArrowDownLeft size={16} className="text-rose-400" />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Eu devo</p>
          </div>
          <p className="text-lg font-bold text-rose-400 mt-1">{api.formatCurrency(totalBorrowed)}</p>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <div className={`p-0.5 rounded ${netBalance >= 0 ? 'bg-emerald-900/40' : 'bg-rose-900/40'}`}>
              <Calculator size={14} className={netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo líquido</p>
          </div>
          <p className={`text-lg font-bold mt-1 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {api.formatCurrency(netBalance)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.value ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-700/50' : 'bg-slate-800/60 text-slate-400 hover:text-slate-300 border border-slate-700/50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Open settlements */}
      {openSettlements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {openSettlements.map((s) => (
            <Card key={s.id} className="!p-4 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => openDetail(s)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${
                    s.settlement_type === 'lent' ? 'bg-emerald-900/30' : 'bg-rose-900/30'
                  }`}>
                    {s.settlement_type === 'lent'
                      ? <ArrowUpRight size={18} className="text-emerald-400" />
                      : <ArrowDownLeft size={18} className="text-rose-400" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-200 truncate block">{s.person_name}</span>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{s.description || 'Sem descrição'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium ${
                        s.settlement_type === 'lent' ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {s.settlement_type === 'lent' ? 'Me deve' : 'Eu devo'}
                      </span>
                      {s.account_name && (
                        <span className="text-[10px] text-slate-600">{s.account_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${s.settlement_type === 'lent' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {api.formatCurrency(s.current_amount)}
                  </p>
                  {s.current_amount < s.original_amount && (
                    <p className="text-[10px] text-slate-500">de {api.formatCurrency(s.original_amount)}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved / History section */}
      {resolvedSettlements.length > 0 && (
        <Card className="animate-slideUp">
          <button onClick={() => setShowResolved(!showResolved)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">Histórico</span>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{resolvedSettlements.length} quitados</span>
            </div>
            <ChevronRight size={16} className={`text-slate-500 transition-transform ${showResolved ? 'rotate-90' : ''}`} />
          </button>

          {showResolved && (
            <div className="mt-3 space-y-2">
              {resolvedSettlements.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 cursor-pointer hover:bg-slate-800/60 transition-colors"
                  onClick={() => openDetail(s)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                      s.settlement_type === 'lent' ? 'bg-emerald-900/20' : 'bg-rose-900/20'
                    }`}>
                      {s.settlement_type === 'lent'
                        ? <ArrowUpRight size={14} className="text-emerald-600" />
                        : <ArrowDownLeft size={14} className="text-rose-600" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-slate-400 line-through decoration-slate-500 block">{s.person_name}</span>
                      <p className="text-[10px] text-slate-600 truncate">{s.description || 'Sem descrição'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium line-through decoration-slate-500 ${
                      s.settlement_type === 'lent' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {api.formatCurrency(s.original_amount)}
                    </p>
                    <p className="text-[10px] text-emerald-600">{api.parseDate(s.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {openSettlements.length === 0 && resolvedSettlements.length === 0 && (
        <EmptyState title="Nenhum acerto encontrado" description="Cadastre um novo acerto para começar" />
      )}

      {/* Detail Modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selectedSettlement?.person_name || ''}>
        {selectedSettlement && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/60">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor Original</p>
                <p className="text-lg font-bold text-slate-200">{api.formatCurrency(selectedSettlement.original_amount)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor Atual</p>
                <p className={`text-lg font-bold ${selectedSettlement.settlement_type === 'lent' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {api.formatCurrency(selectedSettlement.current_amount)}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p><span className="text-slate-500">Tipo:</span> {selectedSettlement.settlement_type === 'lent' ? 'Me deve' : 'Eu devo'}</p>
              <p><span className="text-slate-500">Data:</span> {api.parseDate(selectedSettlement.date)}</p>
              <p><span className="text-slate-500">Status:</span> {selectedSettlement.status === 'open' ? 'Aberto' : 'Resolvido'}</p>
              {selectedSettlement.account_name && (
                <p><span className="text-slate-500">Conta:</span> {selectedSettlement.account_name}</p>
              )}
              {selectedSettlement.description && <p><span className="text-slate-500">Descrição:</span> {selectedSettlement.description}</p>}
              {selectedSettlement.notes && <p><span className="text-slate-500">Obs:</span> {selectedSettlement.notes}</p>}
            </div>

            {/* Person history button */}
            <button onClick={() => openPersonHistory(selectedSettlement.person_id)}
              className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              <History size={14} />
              Ver histórico completo de {selectedSettlement.person_name}
            </button>

            {/* Writeoffs history */}
            {writeoffs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Histórico de abatimentos</p>
                <div className="space-y-1.5">
                  {writeoffs.map((w) => (
                    <div key={w.id}>
                      {editWriteoffId === w.id ? (
                        <div className="p-2 rounded-lg bg-slate-800/60 border border-indigo-700/50 space-y-1.5">
                          <div className="flex gap-1.5">
                            <input type="number" step="0.01" min="0" value={editWriteoffAmt || ''}
                              onChange={(e) => setEditWriteoffAmt(parseFloat(e.target.value) || 0)}
                              className="flex-1 px-2 py-1 rounded text-xs border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
                            <input type="date" value={editWriteoffDate}
                              onChange={(e) => setEditWriteoffDate(e.target.value)}
                              className="w-28 px-2 py-1 rounded text-xs border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
                          </div>
                          <input value={editWriteoffDesc}
                            onChange={(e) => setEditWriteoffDesc(e.target.value)}
                            placeholder="Descrição..."
                            className="w-full px-2 py-1 rounded text-xs border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
                          <div className="flex gap-1">
                            <button onClick={handleEditWriteoff}
                              className="px-2 py-1 rounded text-[10px] font-semibold bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 transition-colors">
                              <Save size={12} className="inline mr-1" />Salvar
                            </button>
                            <button onClick={() => setEditWriteoffId(null)}
                              className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-700 text-slate-400 hover:text-slate-300 transition-colors">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 group">
                          <div>
                            <p className="text-xs text-slate-300 font-medium">- {api.formatCurrency(w.amount)}</p>
                            {w.description && <p className="text-[10px] text-slate-500">{w.description}</p>}
                            {w.transaction_id && <p className="text-[10px] text-emerald-600">Transação vinculada</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-500">{api.parseDate(w.date)}</p>
                            <button onClick={() => {
                              setEditWriteoffId(w.id);
                              setEditWriteoffAmt(w.amount);
                              setEditWriteoffDesc(w.description || '');
                              setEditWriteoffDate(w.date);
                            }}
                              className="p-1 rounded text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => handleDeleteWriteoff(w.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {selectedSettlement.status === 'open' && (
                <>
                  <Button variant="secondary" onClick={() => { setDetailOpen(false); openWriteoff(selectedSettlement); }}>
                    <Calculator size={14} /> Abater
                  </Button>
                  <Button variant="ghost" onClick={() => handleResolve(selectedSettlement.id)}>
                    <CheckCircle2 size={14} /> Resolver
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => { setDetailOpen(false); openEdit(selectedSettlement); }}>Editar</Button>
              <Button variant="ghost" onClick={async () => { await remove(selectedSettlement.id); setDetailOpen(false); }}>
                <X size={14} className="text-rose-400" /> Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Person History Modal */}
      <Modal open={personHistoryOpen} onClose={() => setPersonHistoryOpen(false)}
        title={personSettlements[0]?.person_name ? `Histórico: ${personSettlements[0].person_name}` : 'Histórico'}>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {personSettlements.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhum registro encontrado</p>
          ) : (
            personSettlements.map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                    s.settlement_type === 'lent' ? 'bg-emerald-900/30' : 'bg-rose-900/30'
                  }`}>
                    {s.settlement_type === 'lent'
                      ? <ArrowUpRight size={14} className="text-emerald-400" />
                      : <ArrowDownLeft size={14} className="text-rose-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{s.description || 'Sem descrição'}</p>
                    <p className="text-[10px] text-slate-500">{api.parseDate(s.date)} · {s.status === 'open' ? 'Aberto' : 'Resolvido'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${s.settlement_type === 'lent' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {s.settlement_type === 'lent' ? '+' : '-'}{api.formatCurrency(s.current_amount)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Acerto' : 'Novo Acerto'}>
        <div className="space-y-4">
          {/* Person autocomplete */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pessoa</label>
            <div className="relative mt-1.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input value={personSearch}
                ref={personInputRef}
                onChange={(e) => handlePersonInputChange(e.target.value)}
                onFocus={() => personSearch.length > 0 && setPersonDropdownOpen(true)}
                placeholder="Digite o nome da pessoa..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              {personDropdownOpen && personFiltered.length > 0 && (
                <div ref={personDropdownRef}
                  className="absolute z-50 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-lg max-h-40 overflow-y-auto">
                  {personFiltered.map((p) => (
                    <button key={p.id} onClick={() => selectPerson(p)}
                      className="w-full px-3.5 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2">
                      <User size={14} className="text-slate-500 shrink-0" />
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedPerson && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-emerald-500">
                  Existente
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</label>
            <div className="flex gap-2 mt-1.5 bg-slate-800/50 p-1 rounded-xl">
              <button onClick={() => setForm((f) => ({ ...f, settlement_type: 'lent' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.settlement_type === 'lent' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                Me deve
              </button>
              <button onClick={() => setForm((f) => ({ ...f, settlement_type: 'borrowed' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.settlement_type === 'borrowed' ? 'bg-slate-700 text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                Eu devo
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conta</label>
            <select value={form.account_id}
              onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
              <option value="">Selecione uma conta</option>
              {accounts.filter((a) => a.type !== 'credit').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <input type="number" step="0.01" min="0" placeholder="0,00"
                  value={form.original_amount || ''}
                  onChange={(e) => setForm((f) => ({ ...f, original_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
              <button onClick={() => setShowCalc(showCalc === 'create' ? null : 'create')}
                className={`mt-1.5 p-2.5 rounded-xl border transition-all ${showCalc === 'create' ? 'bg-indigo-600/30 border-indigo-700/50 text-indigo-300' : 'border-slate-700 text-slate-400 hover:text-slate-300'}`}>
                <Calculator size={18} />
              </button>
            </div>
            {showCalc === 'create' && (
              <div className="mt-2 flex justify-center">
                <CalcWidget onResult={(v) => { setForm((f) => ({ ...f, original_amount: v })); setShowCalc(null); }} onClose={() => setShowCalc(null)} />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição</label>
            <input value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Empréstimo para o aluguel..."
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</label>
            <input type="date" value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observações</label>
            <textarea value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Writeoff Modal */}
      <Modal open={writeoffOpen} onClose={() => setWriteoffOpen(false)} title="Abater Valor">
        {selectedSettlement && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm p-3 rounded-xl bg-slate-800/60">
              <span className="text-slate-400">Saldo atual:</span>
              <span className="font-bold text-slate-200">{api.formatCurrency(selectedSettlement.current_amount)}</span>
            </div>

            {!selectedSettlement.account_id && (
              <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-700/50 text-xs text-amber-300">
                Defina uma conta na edição do acerto para gerar transação automática no extrato.
              </div>
            )}

            {selectedSettlement.account_id && (
              <div className="p-3 rounded-xl bg-indigo-900/20 border border-indigo-700/30 text-xs text-indigo-300">
                Ao abater, será gerada automaticamente uma transação no extrato na conta{' '}
                <strong>{selectedSettlement.account_name || 'selecionada'}</strong>.
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor do abatimento</label>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <input type="number" step="0.01" min="0" max={selectedSettlement.current_amount} placeholder="0,00"
                    value={writeoffAmt || ''}
                    onChange={(e) => setWriteoffAmt(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <button onClick={() => setShowCalc(showCalc === 'writeoff' ? null : 'writeoff')}
                  className={`mt-1.5 p-2.5 rounded-xl border transition-all ${showCalc === 'writeoff' ? 'bg-indigo-600/30 border-indigo-700/50 text-indigo-300' : 'border-slate-700 text-slate-400 hover:text-slate-300'}`}>
                  <Calculator size={18} />
                </button>
              </div>
              {showCalc === 'writeoff' && (
                <div className="mt-2 flex justify-center">
                  <CalcWidget onResult={(v) => { setWriteoffAmt(v); setShowCalc(null); }} onClose={() => setShowCalc(null)} />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição (opcional)</label>
              <input value={writeoffDesc}
                onChange={(e) => setWriteoffDesc(e.target.value)}
                placeholder="Ex: Pagamento parcial..."
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</label>
              <input type="date" value={writeoffDate}
                onChange={(e) => setWriteoffDate(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl text-sm border border-slate-700 bg-slate-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setWriteoffOpen(false)}>Cancelar</Button>
              <Button onClick={handleWriteoff}>Abater</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
