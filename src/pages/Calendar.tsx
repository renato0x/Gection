import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useTransactions } from '../stores/useTransactions';
import * as api from '../lib/api';
import type { Transaction, Account } from '../types';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function txColor(tx: Transaction): string {
  if (tx.transaction_type === 'income') return 'text-emerald-500';
  if (tx.transaction_type === 'credit') return 'text-violet-500';
  return 'text-rose-500';
}

export function Calendar() {
  const { transactions, load } = useTransactions();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    load({ month, year, account_id: null, category_id: null, search: null, filter_type: null });
    api.getAccounts().then(setAccounts);
  }, [month, year, load]);

  const daysInMonth = api.getDaysInMonth(month, year);
  const firstDay = api.getFirstDayOfMonth(month, year);

  // Calculate per-day balances
  const dayBalances = useMemo(() => {
    const totalBalance = accounts
      .filter((a) => a.type !== 'credit')
      .reduce((s, a) => s + a.balance, 0);

    // Daily net per day
    let monthlyNet = 0;
    transactions.forEach((tx) => {
      if (tx.transaction_type === 'income') {
        monthlyNet += tx.amount;
      } else if (tx.transaction_type === 'expense') {
        monthlyNet -= tx.amount;
      }
    });

    const startBalance = totalBalance - monthlyNet;
    const balances = new Map<number, number>();
    let running = startBalance;
    // Sort transactions by day, accumulate
    const byDay = new Map<number, Transaction[]>();
    transactions.forEach((tx) => {
      const d = parseInt(tx.date.slice(8, 10));
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(tx);
    });
    for (let d = 1; d <= daysInMonth; d++) {
      const txs = byDay.get(d) || [];
      for (const tx of txs) {
        if (tx.transaction_type === 'income') running += tx.amount;
        else if (tx.transaction_type === 'expense') running -= tx.amount;
      }
      balances.set(d, running);
    }
    return balances;
  }, [accounts, transactions, daysInMonth]);

  const txByDay = new Map<number, Transaction[]>();
  transactions.forEach((tx) => {
    const d = parseInt(tx.date.slice(8, 10));
    if (!txByDay.has(d)) txByDay.set(d, []);
    txByDay.get(d)!.push(tx);
  });

  const prev = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const next = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
  const isPastOrToday = (d: number) => !isCurrentMonth || d <= today.getDate();

  const selectedTxs = selectedDay ? txByDay.get(selectedDay) || [] : [];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Calendário</h1>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <ChevronLeft size={18} className="text-slate-500" />
          </button>
          <span className="text-base font-semibold text-slate-300 min-w-[140px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <ChevronRight size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      <Card className="animate-slideUp">
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayNames.map((d) => (
            <div key={d} className="text-xs font-medium text-slate-500 py-2">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const txs = txByDay.get(day) || [];
            const balance = dayBalances.get(day);
            const isSelected = selectedDay === day;
            return (
              <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative py-2 rounded-lg text-sm transition-all ${isSelected ? 'bg-indigo-900/50 ring-2 ring-indigo-500' : 'hover:bg-slate-800'}`}>
                <span className={`font-medium ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                  {day}
                </span>
                {balance !== undefined && isPastOrToday(day) && (
                  <p className={`text-[10px] mt-0.5 leading-tight font-medium ${
                    balance >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {api.formatCurrency(balance)}
                  </p>
                )}
                {txs.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {txs.slice(0, 3).map((tx) => (
                      <div key={tx.id} className={`w-1.5 h-1.5 rounded-full ${tx.transaction_type === 'income' ? 'bg-emerald-400' : tx.transaction_type === 'credit' ? 'bg-violet-400' : 'bg-rose-400'}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <div className="animate-slideUp">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-slate-400">
              {selectedDay} de {monthNames[month - 1]}
            </h2>
            {isPastOrToday(selectedDay) && (
              <div className="flex items-center gap-1.5 text-xs">
                <Wallet size={12} className="text-slate-500" />
                <span className={`font-semibold ${(dayBalances.get(selectedDay) || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Saldo: {api.formatCurrency(dayBalances.get(selectedDay) || 0)}
                </span>
              </div>
            )}
          </div>
          {selectedTxs.length === 0 ? (
            <Card className="!py-6 !rounded-lg"><p className="text-sm text-slate-500 text-center">Nenhuma transação neste dia</p></Card>
          ) : (
            <div className="space-y-1">
              {selectedTxs.map((tx, i) => (
                <Card key={tx.id} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl shrink-0"
                        style={{ backgroundColor: tx.category_color || '#475569' }} />
                      <div>
                        <p className="text-sm font-medium text-slate-300">{tx.description || tx.category_name || 'Sem descrição'}</p>
                        <p className="text-xs text-slate-500">{tx.account_name}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${txColor(tx)}`}>
                      {tx.transaction_type === 'income' ? '+' : tx.transaction_type === 'credit' ? '↻' : '-'}{api.formatCurrency(tx.amount)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
