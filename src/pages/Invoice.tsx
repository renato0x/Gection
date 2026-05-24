import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAccounts } from '../stores/useAccounts';
import * as api from '../lib/api';
import type { InvoiceData, FutureInvoiceGroup } from '../types';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function Invoice() {
  const { accounts, load: loadAccounts } = useAccounts();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [futureInvoices, setFutureInvoices] = useState<FutureInvoiceGroup[]>([]);
  const [showFuture, setShowFuture] = useState(false);

  const creditAccounts = accounts.filter((a) => a.type === 'credit');

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    if (creditAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(creditAccounts[0].id);
    }
  }, [creditAccounts, selectedAccount]);

  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true);
    Promise.all([
      api.getInvoice(selectedAccount, month, year),
      api.getFutureInvoices(selectedAccount),
    ])
      .then(([inv, future]) => {
        setData(inv);
        setFutureInvoices(future);
      })
      .finally(() => setLoading(false));
  }, [selectedAccount, month, year]);

  const prev = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const hasItems = data && (data.transactions.length > 0 || data.current_installments.length > 0 || data.installments_due.length > 0);
  const futureTotal = futureInvoices.reduce((s, g) => s + g.total, 0);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Faturas</h1>
        {creditAccounts.length > 1 && (
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border border-slate-700 bg-slate-900 text-slate-100">
            {creditAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={prev} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <ChevronLeft size={20} className="text-slate-500" />
        </button>
        <span className="text-lg font-semibold text-slate-300">
          {monthNames[month - 1]} {year}
        </span>
        <button onClick={next} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <ChevronRight size={20} className="text-slate-500" />
        </button>
        <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); setMonth(d.getMonth() + 1); setYear(d.getFullYear()); }}>Hoje</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : !data ? (
        <EmptyState title="Selecione um cartão" description="Escolha um cartão de crédito para ver a fatura" />
      ) : (
        <>
          {/* Invoice summary card */}
          <Card className="!py-4 !px-5 animate-slideUp">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-violet-400" />
                <span className="text-sm font-medium text-slate-300">{data.account_name}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Limite disponível</p>
                <p className="text-sm text-emerald-400">{api.formatCurrency(data.limit - data.total)}</p>
              </div>
            </div>
            {data.limit > 0 && (
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${Math.min((data.total / data.limit) * 100, 100)}%` }} />
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Usado: {api.formatCurrency(data.total)}</span>
              {data.pending_installments_total > 0 && (
                <span className="text-amber-400">A vencer: {api.formatCurrency(data.pending_installments_total)}</span>
              )}
              <span>Limite: {api.formatCurrency(data.limit)}</span>
            </div>
          </Card>

          {hasItems && (
            <div className="space-y-1">
              {/* Transações à vista + parcelas já debitadas no ciclo atual */}
              {(data.transactions.length > 0 || data.current_installments.length > 0) && (
                <>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Transações à vista</p>
                  {data.transactions.map((tx, i) => (
                    <Card key={tx.id} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl shrink-0"
                            style={{ backgroundColor: tx.category_color || '#334155' }} />
                          <div>
                            <p className="text-sm font-medium text-slate-300">{tx.description || tx.category_name}</p>
                            <p className="text-xs text-slate-500">{api.parseDate(tx.date)}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-rose-400">-{api.formatCurrency(tx.amount)}</span>
                      </div>
                    </Card>
                  ))}
                  {data.current_installments.map((inst, i) => {
                    const dueDay = data.due_day || 10;
                    const dueDate = `${String(dueDay).padStart(2, '0')}/${String(inst.due_month).padStart(2, '0')}/${inst.due_year}`;
                    return (
                      <Card key={`${inst.transaction_id}-${inst.installment_number}`} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${(i + data.transactions.length) * 30}ms` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl shrink-0"
                              style={{ backgroundColor: inst.category_color || '#334155' }} />
                            <div>
                              <p className="text-sm font-medium text-slate-300">
                                {inst.description || `Parcela ${inst.installment_number}/${inst.total_installments}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                Parcela {inst.installment_number}/{inst.total_installments} &middot; Vence {dueDate}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-rose-400">-{api.formatCurrency(inst.installment_amount)}</span>
                        </div>
                      </Card>
                    );
                  })}
                </>
              )}

              {/* Parcelas futuras (pendentes) */}
              {data.installments_due.length > 0 && (
                <>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider pt-2">Parcelas futuras</p>
                  {data.installments_due.map((inst, i) => {
                    const dueDay = data.due_day || 10;
                    const dueDate = `${String(dueDay).padStart(2, '0')}/${String(inst.due_month).padStart(2, '0')}/${inst.due_year}`;
                    return (
                      <Card key={`${inst.transaction_id}-${inst.installment_number}`} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl shrink-0"
                              style={{ backgroundColor: inst.category_color || '#334155' }} />
                            <div>
                              <p className="text-sm font-medium text-slate-300">
                                {inst.description || `Parcela ${inst.installment_number}/${inst.total_installments}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                Parcela {inst.installment_number}/{inst.total_installments} &middot; Vence {dueDate}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-amber-400">
                            -{api.formatCurrency(inst.installment_amount)}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {!hasItems && (
            <EmptyState title="Fatura fechada" description="Nenhum gasto encontrado para este período" />
          )}

          {/* Faturas Futuras */}
          {futureInvoices.length > 0 && (
            <Card className="animate-slideUp">
              <button onClick={() => setShowFuture(!showFuture)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-400" />
                  <span className="text-sm font-semibold text-slate-300">Faturas Futuras</span>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{futureInvoices.length} meses</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-amber-400">{api.formatCurrency(futureTotal)}</span>
                  <ChevronRight size={16} className={`text-slate-500 transition-transform ${showFuture ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {showFuture && (
                <div className="mt-4 space-y-3">
                  {futureInvoices.map((group) => (
                    <div key={`${group.due_month}-${group.due_year}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {monthNames[group.due_month - 1]} {group.due_year}
                        </h3>
                        <span className="text-xs font-medium text-amber-400">{api.formatCurrency(group.total)}</span>
                      </div>
                      <div className="space-y-1">
                        {group.installments.map((inst) => {
                          const dueDay = data?.due_day || 10;
                          const dueDate = `${String(dueDay).padStart(2, '0')}/${String(inst.due_month).padStart(2, '0')}/${inst.due_year}`;
                          return (
                            <div key={`${inst.transaction_id}-${inst.installment_number}`}
                              className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-800/40">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg shrink-0"
                                  style={{ backgroundColor: inst.category_color || '#334155' }} />
                                <div>
                                  <p className="text-xs font-medium text-slate-300">
                                    {inst.description || `Parcela ${inst.installment_number}/${inst.total_installments}`}
                                  </p>
                                  <p className="text-[10px] text-slate-500">Vence {dueDate}</p>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-amber-400">
                                -{api.formatCurrency(inst.installment_amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}