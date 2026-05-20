import { create } from 'zustand';
import type { Budget, CreateBudgetData } from '../types';
import * as api from '../lib/api';

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  load: (month: number, year: number) => Promise<void>;
  create: (data: CreateBudgetData) => Promise<void>;
  update: (id: string, limit: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useBudgets = create<BudgetState>((set, get) => ({
  budgets: [],
  loading: false,
  async load(month, year) {
    set({ loading: true });
    const budgets = await api.getBudgets(month, year);
    set({ budgets, loading: false });
  },
  async create(data) {
    await api.createBudget(data);
    await get().load(data.month, data.year);
  },
  async update(id, limit) {
    await api.updateBudget(id, limit);
    const { budgets } = get();
    const m = budgets.find((b) => b.id === id);
    if (m) await get().load(m.month, m.year);
  },
  async remove(id) {
    await api.deleteBudget(id);
    const { budgets } = get();
    const m = budgets.find((b) => b.id === id);
    if (m) await get().load(m.month, m.year);
  },
}));
