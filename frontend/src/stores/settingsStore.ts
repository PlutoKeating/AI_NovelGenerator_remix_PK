import { create } from "zustand";
import api from "../lib/api";
import type { AppConfig, ProviderConfig, EmbeddingConfig, ModelConfig, KeyConfig } from "../types";

interface SettingsState {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  updateConfig: (patch: Partial<AppConfig>) => void;
  addProvider: (p: ProviderConfig) => void;
  removeProvider: (name: string) => void;
  updateProvider: (name: string, patch: Partial<ProviderConfig>) => void;
  addProviderKey: (providerName: string, key: KeyConfig) => void;
  removeProviderKey: (providerName: string, index: number) => void;
  addProviderModel: (providerName: string, model: ModelConfig) => void;
  removeProviderModel: (providerName: string, modelName: string) => void;
  addEmbeddingConfig: (name: string, cfg: EmbeddingConfig) => void;
  removeEmbeddingConfig: (name: string) => void;
  getSelectors: () => string[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<AppConfig>("/config");
      const data = res.data || {};
      if (data && !data.providers) {
        data.providers = [];
      }
      set({ config: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  saveSettings: async () => {
    const { config } = get();
    if (!config) return;
    await api.put("/config", config);
  },

  updateConfig: (patch) => {
    set((state) => ({ config: state.config ? { ...state.config, ...patch } : null }));
  },

  addProvider: (p) => {
    set((state) => {
      if (!state.config) return state;
      const providers = state.config.providers || [];
      return { config: { ...state.config, providers: [...providers, p] } };
    });
  },

  removeProvider: (name) => {
    set((state) => {
      if (!state.config) return state;
      const providers = state.config.providers || [];
      return { config: { ...state.config, providers: providers.filter((p) => p.provider_name !== name) } };
    });
  },

  updateProvider: (name, patch) => {
    set((state) => {
      if (!state.config) return state;
      const providers = state.config.providers || [];
      return {
        config: {
          ...state.config,
          providers: providers.map((p) =>
            p.provider_name === name ? { ...p, ...patch } : p
          ),
        },
      };
    });
  },

  addProviderKey: (providerName, key) => {
    set((state) => {
      if (!state.config) return state;
      const providers = state.config.providers || [];
      return {
        config: {
          ...state.config,
          providers: providers.map((p) =>
            p.provider_name === providerName ? { ...p, keys: [...(p.keys || []), key] } : p
          ),
        },
      };
    });
  },

  removeProviderKey: (providerName, index) => {
    set((state) => {
      if (!state.config) return state;
      const providers = state.config.providers || [];
      return {
        config: {
          ...state.config,
          providers: providers.map((p) =>
            p.provider_name === providerName
              ? { ...p, keys: (p.keys || []).filter((_, i) => i !== index) }
              : p
          ),
        },
      };
    });
  },

  addProviderModel: (providerName, model) => {
    set((state) => {
      if (!state.config) return state;
      const providers = state.config.providers || [];
      return {
        config: {
          ...state.config,
          providers: providers.map((p) =>
            p.provider_name === providerName ? { ...p, models: [...(p.models || []), model] } : p
          ),
        },
      };
    });
  },

  removeProviderModel: (providerName, modelName) => {
    set((state) => {
      if (!state.config) return state;
      const providers = state.config.providers || [];
      return {
        config: {
          ...state.config,
          providers: providers.map((p) =>
            p.provider_name === providerName
              ? { ...p, models: (p.models || []).filter((m) => m.model_name !== modelName) }
              : p
          ),
        },
      };
    });
  },

  addEmbeddingConfig: (name, cfg) => {
    set((state) => {
      if (!state.config) return state;
      return {
        config: {
          ...state.config,
          embedding_configs: { ...state.config.embedding_configs, [name]: cfg },
        },
      };
    });
  },

  removeEmbeddingConfig: (name) => {
    set((state) => {
      if (!state.config) return state;
      const { [name]: _, ...rest } = state.config.embedding_configs;
      return { config: { ...state.config, embedding_configs: rest } };
    });
  },

  getSelectors: () => {
    const { config } = get();
    if (!config) return [];
    const selectors: string[] = [];
    const providers = config.providers || [];
    for (const p of providers) {
      const keyCount = (p.keys || []).length;
      const models = p.models || [];
      for (const m of models) {
        if (keyCount > 1) {
          for (let i = 0; i < keyCount; i++) {
            selectors.push(`${p.provider_name}/${m.model_name}@${i}`);
          }
        } else {
          selectors.push(`${p.provider_name}/${m.model_name}`);
        }
      }
    }
    return selectors;
  },
}));
