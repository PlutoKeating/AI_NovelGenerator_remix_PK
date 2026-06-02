import { create } from "zustand";
import api from "../lib/api";
import type { ChapterMetadata, RoleCategory } from "../types";

interface NovelState {
  novelPath: string;
  chapters: { number: string; title: string; wordCount: number }[];
  chapterMetadata: ChapterMetadata[];
  currentChapterNum: string;
  currentChapterContent: string;
  categories: RoleCategory[];
  architectureContent: string;
  blueprintContent: string;
  characterStateContent: string;
  globalSummaryContent: string;
  plotArcsContent: string;
  setNovelPath: (path: string) => void;
  refreshChapters: () => Promise<void>;
  loadChapter: (num: string) => Promise<void>;
  saveChapter: (num: string, content: string) => Promise<void>;
  setCurrentChapterNum: (num: string) => void;
  loadRoles: () => Promise<void>;
  loadChapterMetadata: () => Promise<void>;
  loadFile: (name: "architecture" | "blueprint" | "character_state" | "global_summary" | "plot_arcs") => Promise<string>;
  saveFile: (name: "architecture" | "blueprint" | "character_state" | "global_summary" | "plot_arcs", content: string) => Promise<void>;
}

export const useNovelStore = create<NovelState>((set, get) => ({
  novelPath: "",
  chapters: [],
  chapterMetadata: [],
  currentChapterNum: "1",
  currentChapterContent: "",
  categories: [],
  architectureContent: "",
  blueprintContent: "",
  characterStateContent: "",
  globalSummaryContent: "",
  plotArcsContent: "",

  setNovelPath: (path) => set({ novelPath: path }),

  refreshChapters: async () => {
    const { novelPath } = get();
    if (!novelPath) return;
    try {
      const res = await api.get<{ number: string; title: string; wordCount: number }[]>("/chapters", { params: { novel_path: novelPath } });
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

  loadChapterMetadata: async () => {
    const { novelPath } = get();
    if (!novelPath) return;
    try {
      const res = await api.get<ChapterMetadata[]>("/blueprint", { params: { novel_path: novelPath } });
      set({ chapterMetadata: res.data });
    } catch {
      set({ chapterMetadata: [] });
    }
  },

  loadFile: async (name) => {
    const { novelPath } = get();
    if (!novelPath) return "";
    try {
      const res = await api.get<string>(`/files/${name}`, { params: { novel_path: novelPath } });
      const content = res.data || "";
      switch (name) {
        case "architecture": set({ architectureContent: content }); break;
        case "blueprint": set({ blueprintContent: content }); break;
        case "character_state": set({ characterStateContent: content }); break;
        case "global_summary": set({ globalSummaryContent: content }); break;
        case "plot_arcs": set({ plotArcsContent: content }); break;
      }
      return content;
    } catch {
      return "";
    }
  },

  saveFile: async (name, content) => {
    const { novelPath } = get();
    if (!novelPath) return;
    await api.put(`/files/${name}`, { novel_path: novelPath, content });
    switch (name) {
      case "architecture": set({ architectureContent: content }); break;
      case "blueprint": set({ blueprintContent: content }); break;
      case "character_state": set({ characterStateContent: content }); break;
      case "global_summary": set({ globalSummaryContent: content }); break;
      case "plot_arcs": set({ plotArcsContent: content }); break;
    }
  },
}));
