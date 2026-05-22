import { create } from "zustand";
import api from "../lib/api";

export interface ChapterInfo {
  number: string;
  title: string;
  wordCount: number;
}

export interface Role {
  name: string;
  description: string;
  character_arc: string;
  relationships: string;
}

export interface RoleCategory {
  name: string;
  roles: Role[];
}

interface NovelState {
  novelPath: string;
  chapters: ChapterInfo[];
  currentChapterNum: string;
  currentChapterContent: string;
  categories: RoleCategory[];
  setNovelPath: (path: string) => void;
  refreshChapters: () => Promise<void>;
  loadChapter: (num: string) => Promise<void>;
  saveChapter: (num: string, content: string) => Promise<void>;
  setCurrentChapterNum: (num: string) => void;
  loadRoles: () => Promise<void>;
}

export const useNovelStore = create<NovelState>((set, get) => ({
  novelPath: "",
  chapters: [],
  currentChapterNum: "1",
  currentChapterContent: "",
  categories: [],

  setNovelPath: (path) => set({ novelPath: path }),

  refreshChapters: async () => {
    const { novelPath } = get();
    if (!novelPath) return;
    try {
      const res = await api.get<ChapterInfo[]>("/chapters", { params: { novel_path: novelPath } });
      set({ chapters: res.data });
    } catch {
      set({ chapters: [] });
    }
  },

  loadChapter: async (num) => {
    const { novelPath } = get();
    if (!novelPath) return;
    try {
      const res = await api.get<string>(`/files/chapters/${num}`, { params: { novel_path: novelPath } });
      set({ currentChapterNum: num, currentChapterContent: res.data || "" });
    } catch {
      set({ currentChapterNum: num, currentChapterContent: "" });
    }
  },

  saveChapter: async (num, content) => {
    const { novelPath } = get();
    if (!novelPath) return;
    await api.put(`/files/chapters/${num}`, { novel_path: novelPath, content });
    set({ currentChapterContent: content });
    await get().refreshChapters();
  },

  setCurrentChapterNum: (num) => set({ currentChapterNum: num }),

  loadRoles: async () => {
    const { novelPath } = get();
    if (!novelPath) return;
    try {
      const res = await api.get<RoleCategory[]>("/roles", { params: { novel_path: novelPath } });
      set({ categories: res.data });
    } catch {
      set({ categories: [] });
    }
  },
}));
