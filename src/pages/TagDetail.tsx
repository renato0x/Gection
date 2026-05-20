import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Receipt, Calendar } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import * as api from '../lib/api';
import type { Tag, TagStats, Transaction } from '../types';

function sign(tx: Transaction): string {
  if (tx.transaction_type === 'income') return '+';
  if (tx.transaction_type === 'credit') return '↻';
  return '-';
}
function txColor(tx: Transaction): string {
  if (tx.transaction_type === 'income') return 'text-emerald-400';
  if (tx.transaction_type === 'credit') return 'text-violet-400';
  return 'text-rose-400';
}

export function TagDetail() {
  const { id } = useParams<{ id: string }>();
  const [tag, setTag] = useState<Tag | null>(null);
  const [stats, setStats] = useState<TagStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getTag(id).then(setTag);
    api.getTagStats(id).then(setStats);
    api.getTransactions({ tag_id: id }).then(setTransactions);
  }, [id]);

  if (!tag) return <div className="text-center py-12 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-4 animate-fadeIn">
      <Link to="/tags" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors">
        <ArrowLeft size={15} /> Voltar para Tags
      </Link>

      <div className="flex items-center gap-4">
        <span className="w-12 h-12 rounded-xl shrink-0" style={{ backgroundColor: tag.color }} />
        <div>
          <h1 className="text-xl font-bold text-slate-100">{tag.name}</h1>
          <p className="text-sm text-slate-400">Tag · {stats?.transaction_count ?? 0} transações</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <TrendingUp size={16} /> <span className="text-xs font-medium text-slate-400">Total Recebido</span>
            </div>
            <p className="text-lg font-semibold text-emerald-400">{api.formatCurrency(stats.total_received)}</p>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-rose-400 mb-1">
              <TrendingDown size={16} /> <span className="text-xs font-medium text-slate-400">Total Gasto</span>
            </div>
            <p className="text-lg font-semibold text-rose-400">{api.formatCurrency(stats.total_spent)}</p>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Receipt size={16} /> <span className="text-xs font-medium text-slate-400">Transações</span>
            </div>
            <p className="text-lg font-semibold text-indigo-400">{stats.transaction_count}</p>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Calendar size={16} /> <span className="text-xs font-medium text-slate-400">Último uso</span>
            </div>
            <p className="text-lg font-semibold text-slate-200">{stats.last_used ? api.parseDate(stats.last_used) : 'Nunca'}</p>
          </Card>
        </div>
      )}

      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Transações com esta tag</h2>
        {transactions.length === 0 ? (
          <EmptyState title="Nenhuma transação" description="Esta tag ainda não foi usada em nenhuma transação" />
        ) : (
          transactions.map((tx, i) => (
            <Card key={tx.id} className="!p-3 !rounded-lg animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: tx.category_color || '#94a3b8' }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-300 truncate">{tx.description || tx.category_name || 'Sem descrição'}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span>{tx.account_name}</span>
                      <span>&middot;</span>
                      <span>{api.parseDate(tx.date)}</span>
                      {tx.total_installments && tx.total_installments > 0 && <Badge variant="warning">{tx.total_installments}x</Badge>}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${txColor(tx)}`}>{sign(tx)}{api.formatCurrency(tx.amount)}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
