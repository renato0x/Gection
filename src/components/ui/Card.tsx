import { clsx } from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className, style, onClick, hover = true }: Props) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={clsx(
        'rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 p-5',
        'shadow-sm',
        hover && 'hover:shadow-md hover:border-slate-300/80 dark:hover:border-slate-600/80 transition-all duration-200',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
