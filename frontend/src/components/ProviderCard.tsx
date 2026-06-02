import React from "react";
import type { ProviderConfig } from "../types";
import { useSettingsStore } from "../stores/settingsStore";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Input } from "./ui/Input";
import { Trash2, Plus, Key, Cpu } from "lucide-react";
import api from "../lib/api";
import { toast } from "./ui/Toast";

interface ProviderCardProps {
  provider: ProviderConfig;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  const store = useSettingsStore();
  const [newKey, setNewKey] = React.useState("");
  const [newModel, setNewModel] = React.useState("");

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    store.addProviderKey(provider.provider_name, {
      api_key: newKey.trim(),
      models: [],
    });
    setNewKey("");
  };

  const handleAddModel = () => {
    if (!newModel.trim()) return;
    store.addProviderModel(provider.provider_name, {
      model_name: newModel.trim(),
      temperature: 0.7,
      max_tokens: 4096,
    });
    setNewModel("");
  };

  const testProviderLLM = async (modelName: string, keyIdx: number) => {
    try {
      const key = provider.keys[keyIdx]?.api_key;
      await api.post("/config/test-llm", {
        config_name: `${provider.provider_name}/${modelName}`,
        llm_config: {
          api_key: key,
          base_url: provider.base_url,
          model_name: modelName,
          temperature: 0.7,
          max_tokens: 4096,
          timeout: provider.timeout,
          interface_format: provider.interface_format,
        },
      });
      toast({ title: `测试成功: ${provider.provider_name} - ${modelName} OK` });
    } catch (e: any) {
      toast({ title: `测试失败`, description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="bg-[#110c22] border border-fuchsia-950/80 text-zinc-100 flex flex-col h-[400px] shadow-lg hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all duration-300">
      <CardHeader className="p-4 border-b border-fuchsia-950/60 bg-[#140f29]/30 shrink-0 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-pink-400 font-mono filter drop-shadow-[0_0_3px_rgba(236,72,153,0.3)]">{provider.provider_name}</CardTitle>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{provider.interface_format}</p>
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 w-7 p-0"
          onClick={() => {
            if (confirm(`确定要删除 Provider "${provider.provider_name}" 吗？`)) {
              store.removeProvider(provider.provider_name);
            }
          }}
        >
          <Trash2 size={12} />
        </Button>
      </CardHeader>

      <CardContent className="p-4 flex-1 overflow-auto space-y-4">
        {/* Base URL */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-zinc-400 font-mono">Base URL</span>
          <p className="text-xs bg-[#140f29] border border-fuchsia-950/60 rounded px-2 py-1 select-all font-mono truncate text-zinc-300">
            {provider.base_url || "（使用官方默认地址）"}
          </p>
        </div>

        {/* Keys Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 font-mono">
              <Key size={10} />
              API Keys ({provider.keys?.length || 0})
            </span>
          </div>
          <div className="space-y-1">
            {provider.keys?.map((k, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#140f29] border border-fuchsia-950/40 rounded px-2 py-1">
                <span className="text-[10px] font-mono text-zinc-400">
                  sk-...{k.api_key ? k.api_key.slice(-4) : "empty"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 p-1 text-red-400 hover:text-red-300"
                  onClick={() => store.removeProviderKey(provider.provider_name, idx)}
                >
                  <Trash2 size={10} />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              className="h-7 text-xs"
              placeholder="输入 API Key sk-..."
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <Button size="sm" className="h-7 px-2 shrink-0" onClick={handleAddKey}>
              <Plus size={12} />
            </Button>
          </div>
        </div>

        {/* Models Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 font-mono">
              <Cpu size={10} />
              模型 ({provider.models?.length || 0})
            </span>
          </div>
          <div className="space-y-1">
            {provider.models?.map((m) => (
              <div key={m.model_name} className="flex items-center justify-between bg-[#140f29] border border-fuchsia-950/40 rounded px-2 py-1">
                <span className="text-[10px] text-zinc-300 font-mono truncate max-w-[120px]">{m.model_name}</span>
                <div className="flex gap-1">
                  {provider.keys?.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[9px] border border-fuchsia-950 hover:bg-[#1a1435]/50"
                      onClick={() => testProviderLLM(m.model_name, 0)}
                    >
                      测试
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 p-1 text-red-400 hover:text-red-300"
                    onClick={() => store.removeProviderModel(provider.provider_name, m.model_name)}
                  >
                    <Trash2 size={10} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              className="h-7 text-xs"
              placeholder="添加模型名称..."
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
            />
            <Button size="sm" className="h-7 px-2 shrink-0" onClick={handleAddModel}>
              <Plus size={12} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
