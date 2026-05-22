import { create } from "zustand";
import api from "../lib/api";

export interface LLMConfig {
  api_key: string;
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
}

export interface EmbeddingConfig {
  api_key: string;
  base_url: string;
  model: string;
  chunk_size: number;
  chunk_overlap: number;
}

export interface OtherParams {
  topic: string;
  genre: string;
  filepath: string;
  num_chapters: number;
  word_number: number;
  chapter_num: string;
  user_guidance: string;
  characters_involved: string;
  key_items: string;
  scene_location: string;
  time_constraint: string;
}

export interface WebDAVConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  remote_path: string;
  sync_interval: number;
}

export interface AppConfig {
  llm_configs: Record<string, LLMConfig>;
  embedding_configs: Record<string, EmbeddingConfig>;
  other_params: OtherParams;
  choose_configs: Record<string, string>;
  proxy_setting: { enabled: boolean; http_proxy: string; https_proxy: string };
  webdav_config: WebDAVConfig;
}

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
}));
