import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI } from '../../stores/useUI';
import { monthName } from '../../lib/api';

export function Header() {
  const { toggleSidebar, selectedMonth, selectedYear, setMonth, setYear } = useUI();

  const prevMonth = () => {
    if (selectedMonth === 1) { setMonth(12); setYear(selectedYear - 1); }
    else { setMonth(selectedMonth - 1); }
  };

  const nextMonth = () => {
    if (selectedMonth === 12) { setMonth(1); setYear(selectedYear + 1); }
    else { setMonth(selectedMonth + 1); }
  };

  return (
    <header className="print-hidden h-14 border-b border-slate-200/80 dark:border-slate-700/50 flex items-center justify-between px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <Menu size={18} strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-1.5 ml-2 bg-slate-100/80 dark:bg-slate-800/50 rounded-xl px-2 py-1">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <ChevronLeft size={15} strokeWidth={1.5} />
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[140px] text-center select-none">
            {monthName(selectedMonth)} {selectedYear}
          </span>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <ChevronRight size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
