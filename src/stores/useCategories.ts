import { create } from 'zustand';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../types';
import * as api from '../lib/api';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  load: () => Promise<void>;
  create: (data: CreateCategoryData) => Promise<void>;
  update: (data: UpdateCategoryData) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCategories = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  async load() {
    set({ loading: true });
    const categories = await api.getCategories();
    set({ categories, loading: false });
  },
  async create(data) {
    await api.createCategory(data);
    await get().load();
  },
  async update(data) {
    await api.updateCategory(data);
    await get().load();
  },
  async remove(id) {
    await api.deleteCategory(id);
    await get().load();
  },
}));
