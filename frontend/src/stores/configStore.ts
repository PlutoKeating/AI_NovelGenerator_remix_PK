import { create } from "zustand";
import api from "../lib/api";
import type { AppConfig, OtherParams, LLMConfig, EmbeddingConfig } from "../types";

interface ConfigState {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  updateConfig: (patch: Partial<AppConfig>) => void;
  updateOtherParams: (patch: Partial<OtherParams>) => void;
  addLLMConfig: (name: string, cfg: LLMConfig) => void;
  removeLLMConfig: (name: string) => void;
  addEmbeddingConfig: (name: string, cfg: EmbeddingConfig) => void;
  removeEmbeddingConfig: (name: string) => void;
  setChooseConfig: (stage: string, llmName: string) => void;
  isConfigComplete: () => { complete: boolean; missing: string[] };
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: false,
  error: null,

  loadConfig: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<AppConfig>("/config");
      set({ config: res.data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  saveConfig: async () => {
    const { config } = get();
    if (!config) return;
    await api.put("/config", config);
  },

  updateConfig: (patch) => {
    set((state) => ({ config: state.config ? { ...state.config, ...patch } : null }));
  },

  updateOtherParams: (patch) => {
    set((state) => ({
      config: state.config
        ? { ...state.config, other_params: { ...state.config.other_params, ...patch } }
        : null,
    }));
  },

  addLLMConfig: (name, cfg) => {
    set((state) => ({
      config: state.config
        ? { ...state.config, llm_configs: { ...state.config.llm_configs, [name]: cfg } }
        : null,
    }));
  },

  removeLLMConfig: (name) => {
    set((state) => {
      if (!state.config) return state;
      const { [name]: _, ...rest } = state.config.llm_configs;
      return { config: { ...state.config, llm_configs: rest } };
    });
  },

  addEmbeddingConfig: (name, cfg) => {
    set((state) => ({
      config: state.config
        ? { ...state.config, embedding_configs: { ...state.config.embedding_configs, [name]: cfg } }
        : null,
    }));
  },

  removeEmbeddingConfig: (name) => {
    set((state) => {
      if (!state.config) return state;
      const { [name]: _, ...rest } = state.config.embedding_configs;
      return { config: { ...state.config, embedding_configs: rest } };
    });
  },

  setChooseConfig: (stage, llmName) => {
    set((state) => ({
      config: state.config
        ? { ...state.config, choose_configs: { ...state.config.choose_configs, [stage]: llmName } }
        : null,
    }));
  },

  isConfigComplete: () => {
    const { config } = get();
    const missing: string[] = [];
    if (!config) return { complete: false, missing: ["Config not loaded"] };
    if (Object.keys(config.llm_configs).length === 0) missing.push("LLM Config");
    if (Object.keys(config.embedding_configs).length === 0) missing.push("Embedding Config");
    if (!config.other_params.filepath) missing.push("Save Path");
    if (!config.other_params.topic) missing.push("Topic");
    if (!config.other_params.genre) missing.push("Genre");
    return { complete: missing.length === 0, missing };
  },
}));
