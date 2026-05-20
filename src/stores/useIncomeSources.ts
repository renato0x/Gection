import { create } from 'zustand';
import type { IncomeSource, CreateIncomeSourceData, UpdateIncomeSourceData } from '../types';
import * as api from '../lib/api';

interface IncomeSourceState {
  sources: IncomeSource[];
  loading: boolean;
  load: () => Promise<void>;
  create: (data: CreateIncomeSourceData) => Promise<void>;
  update: (data: UpdateIncomeSourceData) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useIncomeSources = create<IncomeSourceState>((set, get) => ({
  sources: [],
  loading: false,
  async load() {
    set({ loading: true });
    const sources = await api.getIncomeSources();
    set({ sources, loading: false });
  },
  async create(data) {
    await api.createIncomeSource(data);
    await get().load();
  },
  async update(data) {
    await api.updateIncomeSource(data);
    await get().load();
  },
  async remove(id) {
    await api.deleteIncomeSource(id);
    await get().load();
  },
}));
