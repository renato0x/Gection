import { create } from 'zustand';
import { currentMonth, currentYear } from '../lib/api';

interface UIState {
  sidebarOpen: boolean;
  selectedMonth: number;
  selectedYear: number;
  toggleSidebar: () => void;
  setMonth: (m: number) => void;
  setYear: (y: number) => void;
}

export const useUI = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedMonth: currentMonth(),
  selectedYear: currentYear(),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setMonth: (m) => set({ selectedMonth: m }),
  setYear: (y) => set({ selectedYear: y }),
}));
