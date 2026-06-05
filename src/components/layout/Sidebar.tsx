import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Wallet, CreditCard, Tags, Calendar as CalendarIcon, List, DollarSign, Handshake, Upload, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';
import { useUI } from '../../stores/useUI';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { to: '/budget', label: 'Orçamento', icon: PiggyBank },
  { to: '/accounts', label: 'Contas', icon: Wallet },
  { to: '/invoice', label: 'Faturas', icon: CreditCard },
  { to: '/categories', label: 'Categorias', icon: List },
  { to: '/tags', label: 'Tags', icon: Tags },
  { to: '/import', label: 'Importar', icon: Upload },
  { to: '/calendar', label: 'Calendário', icon: CalendarIcon },
  { to: '/income', label: 'Rendas', icon: DollarSign },
  { to: '/settlements', label: 'Acertos', icon: Handshake },
];

export function Sidebar() {
  const { sidebarOpen } = useUI();

  return (
    <aside className={clsx(
      'h-screen flex flex-col border-r border-slate-200/80 dark:border-slate-700/50 bg-sidebar transition-all duration-300',
      sidebarOpen ? 'w-60' : 'w-16',
    )}>
      <div className={clsx(
        'flex items-center h-16 px-4 border-b border-slate-200/80 dark:border-slate-700/50',
        sidebarOpen ? 'justify-start gap-3' : 'justify-center',
      )}>
        {sidebarOpen && (
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-base text-slate-100 tracking-[0.15em]">GECTION</span>
            <span className="text-[10px] font-medium brand-gradient tracking-wide">Gestão em ação</span>
          </div>
        )}
        {!sidebarOpen && (
          <span className="font-extrabold text-sm text-slate-100 tracking-[0.15em]">G</span>
        )}
      </div>

      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto mt-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
              isActive
                ? 'bg-gradient-to-r from-indigo-100 to-indigo-50/50 dark:from-indigo-900/40 dark:to-indigo-800/20 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-200/50 dark:border-indigo-700/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:border-transparent',
              !sidebarOpen && 'justify-center',
            )}
          >
            <Icon size={19} strokeWidth={1.5} />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {sidebarOpen && (
        <div className="p-2.5 border-t border-slate-700/50">
          <a href="https://github.com/renato0x" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-400 hover:bg-slate-800/50 transition-all duration-150">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span>by renato0x</span>
          </a>
        </div>
      )}
    </aside>
  );
}
