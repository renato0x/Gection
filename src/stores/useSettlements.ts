import { create } from 'zustand';
import type { PersonSettlement, CreatePersonSettlementData, UpdatePersonSettlementData, UpdateWriteoffData } from '../types';
import * as api from '../lib/api';

interface SettlementState {
  settlements: PersonSettlement[];
  loading: boolean;
  load: () => Promise<void>;
  create: (data: CreatePersonSettlementData) => Promise<void>;
  update: (data: UpdatePersonSettlementData) => Promise<void>;
  remove: (id: string) => Promise<void>;
  resolve: (id: string) => Promise<PersonSettlement>;
  writeoffUpdate: (data: UpdateWriteoffData) => Promise<PersonSettlement>;
  writeoffDelete: (id: string) => Promise<PersonSettlement>;
}

export const useSettlements = create<SettlementState>((set, get) => ({
  settlements: [],
  loading: false,
  async load() {
    set({ loading: true });
    const settlements = await api.getSettlements();
    set({ settlements, loading: false });
  },
  async create(data) {
    await api.createSettlement(data);
    await get().load();
  },
  async update(data) {
    await api.updateSettlement(data);
    await get().load();
  },
  async remove(id) {
    await api.deleteSettlement(id);
    await get().load();
  },
  async resolve(id) {
    const settlement = await api.resolveSettlement(id);
    await get().load();
    return settlement;
  },
  async writeoffUpdate(data) {
    const settlement = await api.updateWriteoff(data);
    await get().load();
    return settlement;
  },
  async writeoffDelete(id) {
    const settlement = await api.deleteWriteoff(id);
    await get().load();
    return settlement;
  },
}));
