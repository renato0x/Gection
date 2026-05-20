import { clsx } from 'clsx';
import type { SelectHTMLAttributes } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
}

export function Select({ label, options, className, ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>}
      <select
        className={clsx(
          'px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100',
          'border border-slate-200 dark:border-slate-700 transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800',
          'hover:border-slate-300 dark:hover:border-slate-600',
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
