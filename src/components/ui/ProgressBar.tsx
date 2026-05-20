import { clsx } from 'clsx';

interface Props {
  value: number;
  max: number;
  className?: string;
}

export function ProgressBar({ value, max, className }: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = pct > 100;

  return (
    <div className={clsx('w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden', className)}>
      <div
        className={clsx(
          'h-full rounded-full transition-all duration-300',
          isOver ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500',
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}
