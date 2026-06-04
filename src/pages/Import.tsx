import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Upload, Check, X, ArrowLeft, AlertCircle, FileText, Loader } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import * as api from '../lib/api';
import type {
  ImportPreview, ImportTransactionItem, ImportResult, Account, Category,
} from '../types';

const FIELD_OPTIONS = [
  { value: 'date', label: 'Data' },
  { value: 'amount', label: 'Valor' },
  { value: 'description', label: 'Descrição' },
  { value: 'fit_id', label: 'Identificador' },
  { value: 'txn_type', label: 'Tipo' },
  { value: 'ignore', label: 'Ignorar' },
];

export function ImportPage() {
  const [step, setStep] = useState<'select' | 'mapping' | 'preview' | 'result'>('select');
  const [filePath, setFilePath] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [accountId, setAccountId] = useState('');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [skipDupes, setSkipDupes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [columnMap, setColumnMap] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.getAccounts().then(setAccounts);
    api.getCategories().then(setCategories);
  }, []);

  const handleSelectFile = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const path = await open({
        multiple: false,
        filters: [{
          name: 'Arquivos Financeiros',
          extensions: ['csv', 'ofx', 'ofc'],
        }],
      });
      if (!path) { setLoading(false); return; }
      setFilePath(path);
      const p = await api.parseImportFile(path);
      setPreview(p);
      if (p.auto_parsed) {
        setSelected(new Set(p.transactions.map((_, i) => i)));
        setStep('preview');
      } else {
        setColumnMap(p.columns.map(() => 'ignore'));
        setStep('mapping');
      }
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Erro ao processar arquivo');
    }
    setLoading(false);
  }, []);

  const handleApplyMapping = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = await api.parseCsvWithMapping(filePath, columnMap);
      setPreview(p);
      setSelected(new Set(p.transactions.map((_, i) => i)));
      setStep('preview');
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Erro ao aplicar mapeamento');
    }
    setLoading(false);
  }, [filePath, columnMap]);

  const toggleSelected = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleImport = useCallback(async () => {
    if (!accountId || !preview) return;
    setLoading(true);
    setError('');
    try {
      const items: ImportTransactionItem[] = [];
      for (const idx of selected) {
        const t = preview.transactions[idx];
        items.push({
          line: t.line,
          date: t.date,
          amount: t.amount,
          description: t.description,
          transaction_type: t.transaction_type,
          fit_id: t.fit_id,
          category_id: null,
          total_installments: t.installment_total && t.installment_total > 1 ? t.installment_total : null,
        });
      }
      const r = await api.importTransactions({
        account_id: accountId,
        transactions: items,
        skip_duplicates: skipDupes,
        default_category_id: defaultCategoryId || null,
      });
      setResult(r);
      setStep('result');
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Erro ao importar');
    }
    setLoading(false);
  }, [accountId, preview, selected, skipDupes, defaultCategoryId]);

  const reset = () => {
    setStep('select');
    setFilePath('');
    setPreview(null);
    setSelected(new Set());
    setResult(null);
    setError('');
  };

  const totalAmount = preview
    ? [...selected].reduce((s, i) => s + (preview.transactions[i]?.amount || 0), 0)
    : 0;

  if (step === 'mapping' && preview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('select')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Mapear Colunas</h1>
            <p className="text-sm text-slate-500">Selecione qual campo cada coluna representa</p>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Coluna no Arquivo</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Mapear para</th>
                </tr>
              </thead>
              <tbody>
                {preview.columns.map((col, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{col}</td>
                    <td className="py-2 px-3">
                      <select
                        value={columnMap[i] || 'ignore'}
                        onChange={(e) => {
                          const next = [...columnMap];
                          next[i] = e.target.value;
                          setColumnMap(next);
                        }}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs w-40"
                      >
                        {FIELD_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleApplyMapping} disabled={loading} className="flex items-center gap-2">
            {loading ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
            Aplicar Mapeamento
          </Button>
          <Button variant="secondary" onClick={() => setStep('select')}>Cancelar</Button>
        </div>
      </div>
    );
  }

  if (step === 'result' && result) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Resultado da Importação</h1>
        <Card>
          <div className="space-y-4">
            {result.imported > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                <Check size={20} />
                <span>{result.imported} transa{result.imported === 1 ? 'ção importada' : 'ções importadas'}</span>
              </div>
            )}
            {result.skipped > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                <AlertCircle size={20} />
                <span>{result.skipped} duplicata{result.skipped === 1 ? '' : 's'} ignorada{result.skipped === 1 ? '' : 's'}</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
                    <X size={16} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
        <Button onClick={reset} className="flex items-center gap-2">
          <Upload size={16} />
          Importar outro arquivo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Importar Dados</h1>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {(step === 'select' || !preview) && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-900/30">
              <FileText size={32} className="text-indigo-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm text-center max-w-md">
              Selecione um arquivo no formato <strong>CSV</strong> ou <strong>OFX</strong>
              para importar transações. Faturas de cartão de crédito (Nubank, etc.) são detectadas automaticamente.
            </p>
            <Button onClick={handleSelectFile} disabled={loading} className="flex items-center gap-2">
              {loading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
              Selecionar Arquivo
            </Button>
          </div>
        </Card>
      )}

      {step === 'preview' && preview && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('select')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <ArrowLeft size={18} />
              </button>
              <p className="text-sm text-slate-500">
                {preview.format.toUpperCase()} &middot; {selected.size} de {preview.transactions.length} selecionadas
                &middot; Total: <strong>{api.formatCurrency(totalAmount)}</strong>
              </p>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/95">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="w-10 py-2 px-2">
                      <input
                        type="checkbox"
                        checked={selected.size === preview.transactions.length && preview.transactions.length > 0}
                        onChange={() => {
                          if (selected.size === preview.transactions.length) setSelected(new Set());
                          else setSelected(new Set(preview.transactions.map((_, i) => i)));
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-2 px-2 text-slate-500 font-medium">Data</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-medium">Descrição</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium">Valor</th>
                    <th className="text-center py-2 px-2 text-slate-500 font-medium">Tipo</th>
                    <th className="text-center py-2 px-2 text-slate-500 font-medium">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8">
                        <EmptyState title="Nenhuma transação encontrada" />
                      </td>
                    </tr>
                  ) : (
                    preview.transactions.map((t, i) => {
                      const isInst = t.installment_total && t.installment_total > 1;
                      return (
                        <tr key={i}
                          className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${selected.has(i) ? '' : 'opacity-50'}`}
                          onClick={() => toggleSelected(i)}
                        >
                          <td className="py-1.5 px-2">
                            <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelected(i)}
                              className="rounded" />
                          </td>
                          <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {t.date ? api.parseDate(t.date) : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                            {t.description || '-'}
                            {isInst && (
                              <span className="ml-1.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                                {t.installment_total}x
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                            {api.formatCurrency(t.amount)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <span className={`text-[11px] px-1.5 py-0.5 rounded ${typeColor(t.transaction_type)}`}>
                              {typeLabel(t.transaction_type)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center text-xs text-slate-500">
                            {sourceLabel(t.source)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Configurações</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Conta de destino *</label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({accountTypeLabel(a.type)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Categoria padrão</label>
                  <select value={defaultCategoryId} onChange={(e) => setDefaultCategoryId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={skipDupes} onChange={(e) => setSkipDupes(e.target.checked)}
                      className="rounded" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Ignorar duplicatas</span>
                  </label>
                </div>
              </div>
              {selected.size > 0 && !accountId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">Selecione uma conta de destino</p>
              )}
            </div>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={loading || !accountId || selected.size === 0}
              className="flex items-center gap-1.5">
              {loading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
              Importar {selected.size} transa{selected.size === 1 ? 'ção' : 'ções'}
            </Button>
            <Button variant="secondary" onClick={reset}>Cancelar</Button>
          </div>
        </>
      )}
    </div>
  );
}

function typeColor(t: string): string {
  switch (t) {
    case 'income': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    case 'expense': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    case 'credit': return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300';
    case 'transfer': return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300';
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
  }
}

function typeLabel(t: string): string {
  switch (t) {
    case 'income': return 'Receita';
    case 'expense': return 'Despesa';
    case 'credit': return 'Crédito';
    case 'transfer': return 'Transferência';
    default: return t;
  }
}

function sourceLabel(s: string): string {
  switch (s) {
    case 'credit_card': return 'Cartão';
    case 'checking': return 'Conta';
    default: return '-';
  }
}

function accountTypeLabel(t: string): string {
  const labels: Record<string, string> = {
    checking: 'CC', savings: 'Poupança', credit: 'Cartão', cash: 'Dinheiro', investment: 'Investimento',
  };
  return labels[t] || t;
}
