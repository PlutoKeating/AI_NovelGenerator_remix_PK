import { create } from "zustand";

export type TaskType = "architecture" | "blueprint" | "draft" | "finalize" | "batch" | "consistency" | "knowledge" | "clear_vectorstore";

export interface GenerationTask {
  id: string;
  type: TaskType;
  status: "running" | "success" | "error";
  message: string;
  createdAt: number;
}

interface GenerationState {
  tasks: GenerationTask[];
  addTask: (task: Omit<GenerationTask, "id" | "createdAt">) => string;
  updateTask: (id: string, patch: Partial<Omit<GenerationTask, "id">>) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  tasks: [],

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
}));
