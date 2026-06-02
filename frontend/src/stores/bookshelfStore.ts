import { create } from "zustand";
import api from "../lib/api";
import type { NovelMetadata } from "../types";

interface BookshelfState {
  novels: NovelMetadata[];
  selectedNovelId: string | null;
  loading: boolean;
  error: string | null;
  loadNovels: () => Promise<void>;
  createNovel: (data: { title: string; genre?: string; num_chapters?: number; description?: string }) => Promise<NovelMetadata | null>;
  deleteNovel: (id: string) => Promise<void>;
  selectNovel: (id: string | null) => void;
}

export const useBookshelfStore = create<BookshelfState>((set) => ({
  novels: [],
  selectedNovelId: null,
  loading: false,
  error: null,

  loadNovels: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<NovelMetadata[]>("/novels");
      set({ novels: res.data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createNovel: async (data) => {
    try {
      const res = await api.post<NovelMetadata>("/novels", data);
      set((state) => ({ novels: [...state.novels, res.data] }));
      return res.data;
    } catch (e: any) {
      set({ error: e.message });
      return null;
    }
  },

  deleteNovel: async (id) => {
    try {
      await api.delete(`/novels/${id}`);
      set((state) => ({
        novels: state.novels.filter((n) => n.id !== id),
        selectedNovelId: state.selectedNovelId === id ? null : state.selectedNovelId,
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  selectNovel: (id) => set({ selectedNovelId: id }),
}));
