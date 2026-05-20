import { create } from 'zustand';
import type { Account, CreateAccountData, UpdateAccountData } from '../types';
import * as api from '../lib/api';

interface AccountState {
  accounts: Account[];
  loading: boolean;
  load: () => Promise<void>;
  create: (data: CreateAccountData) => Promise<void>;
  update: (data: UpdateAccountData) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useAccounts = create<AccountState>((set, get) => ({
  accounts: [],
  loading: false,
  async load() {
    set({ loading: true });
    const accounts = await api.getAccounts();
    set({ accounts, loading: false });
  },
  async create(data) {
    await api.createAccount(data);
    await get().load();
  },
  async update(data) {
    await api.updateAccount(data);
    await get().load();
  },
  async remove(id) {
    await api.deleteAccount(id);
    await get().load();
  },
}));
