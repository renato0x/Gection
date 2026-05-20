import { Inbox } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Inbox size={32} strokeWidth={1.5} className="text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{description}</p>}
    </div>
  );
}
