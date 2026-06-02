import { create } from "zustand";
import type { GenerationTask, PipelineStatus, LogEntry } from "../types";

interface GenerationState {
  tasks: GenerationTask[];
  currentPipelineStep: number | null;
  pipelineStatus: PipelineStatus;
  logs: LogEntry[];
  addTask: (task: Omit<GenerationTask, "id" | "createdAt">) => string;
  updateTask: (id: string, patch: Partial<Omit<GenerationTask, "id">>) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;
  setPipelineStep: (step: number | null) => void;
  setPipelineStatus: (status: PipelineStatus) => void;
  addLog: (message: string, level?: LogEntry["level"]) => void;
  clearLogs: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  tasks: [],
  currentPipelineStep: null,
  pipelineStatus: "idle",
  logs: [],

  addTask: (task) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newTask: GenerationTask = { ...task, id, createdAt: Date.now() };
    set((state) => ({ tasks: [...state.tasks, newTask] }));
    return id;
  },

  updateTask: (id, patch) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  removeTask: (id) => {
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },

  clearTasks: () => set({ tasks: [] }),

  setPipelineStep: (step) => set({ currentPipelineStep: step }),

  setPipelineStatus: (status) => set({ pipelineStatus: status }),

  addLog: (message, level = "info") => {
    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toLocaleTimeString(),
      message,
      level,
    };
    set((state) => ({ logs: [...state.logs.slice(-199), entry] }));
  },

  clearLogs: () => set({ logs: [] }),
}));
