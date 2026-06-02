import { create } from "zustand";
import api from "../lib/api";
import type { GenerationTask } from "../types";
import { toast } from "../components/ui/Toast";

interface TaskState {
  tasks: GenerationTask[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  clearCompleted: () => void;
  removeTask: (id: string) => void;
}

function mapBackendTask(raw: any): GenerationTask {
  return {
    id: raw.id,
    type: raw.type,
    status: raw.status,
    message: raw.message || "",
    progress: raw.progress ?? undefined,
    createdAt: raw.created_at ? raw.created_at * 1000 : Date.now(),
    startedAt: raw.started_at ? raw.started_at * 1000 : undefined,
    finishedAt: raw.finished_at ? raw.finished_at * 1000 : undefined,
    error: raw.error ?? undefined,
    result: raw.result ?? undefined,
    payload: raw.payload ?? undefined,
  };
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<any[]>("/tasks");
      set({ tasks: res.data.map(mapBackendTask), loading: false });
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || "Failed to fetch tasks";
      set({ error: msg, loading: false });
    }
  },

  cancelTask: async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      toast({ title: "Task Cancelled", description: id });
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, status: "cancelled" as const, message: "Cancelled by user" } : t
        ),
      }));
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || "Cancel failed";
      toast({ title: "Cancel Failed", description: msg, variant: "destructive" });
    }
  },

  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter(
        (t) => t.status === "pending" || t.status === "running"
      ),
    }));
  },

  removeTask: (id) => {
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },
}));
