import { create } from 'zustand';
import type { Transaction, CreateTransactionData, UpdateTransactionData, TransactionFilter } from '../types';
import * as api from '../lib/api';

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  load: (filter: TransactionFilter) => Promise<void>;
  create: (data: CreateTransactionData) => Promise<void>;
  update: (data: UpdateTransactionData) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useTransactions = create<TransactionState>((set) => ({
  transactions: [],
  loading: false,
  async load(filter) {
    set({ loading: true });
    const transactions = await api.getTransactions(filter);
    set({ transactions, loading: false });
  },
  async create(data) {
    await api.createTransaction(data);
  },
  async update(data) {
    await api.updateTransaction(data);
  },
  async remove(id) {
    await api.deleteTransaction(id);
  },
}));
