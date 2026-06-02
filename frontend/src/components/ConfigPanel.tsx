import React from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/Select";
import { Slider } from "./ui/Slider";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { useConfigStore } from "../stores/configStore";
import api from "../lib/api";
import { toast } from "./ui/Toast";

const INTERFACE_PRESETS: Record<string, { base_url: string; model: string }> = {
  OpenAI: { base_url: "https://api.openai.com/v1", model: "gpt-4o" },
  "Azure OpenAI": { base_url: "https://[az].openai.azure.com/openai/deployments/[model]", model: "gpt-4o" },
  DeepSeek: { base_url: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  Gemini: { base_url: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-pro" },
  Ollama: { base_url: "http://localhost:11434/api", model: "llama3" },
  "ML Studio": { base_url: "http://localhost:1234/v1", model: "local-model" },
  SiliconFlow: { base_url: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V3" },
};

export default function ConfigPanel() {
  const config = useConfigStore((s) => s.config);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const addLLM = useConfigStore((s) => s.addLLMConfig);
  const removeLLM = useConfigStore((s) => s.removeLLMConfig);
  const addEmb = useConfigStore((s) => s.addEmbeddingConfig);
  const removeEmb = useConfigStore((s) => s.removeEmbeddingConfig);
  const setChoose = useConfigStore((s) => s.setChooseConfig);
  const updateConfig = useConfigStore((s) => s.updateConfig);

  const [llmName, setLlmName] = React.useState("");
  const [llmForm, setLlmForm] = React.useState({ api_key: "", base_url: "", model_name: "", temperature: 0.7, max_tokens: 4096, timeout: 600, interface_format: "OpenAI" });
  const [embName, setEmbName] = React.useState("");
  const [embForm, setEmbForm] = React.useState({ api_key: "", base_url: "", model_name: "", retrieval_k: 4, interface_format: "OpenAI" });

  React.useEffect(() => { loadConfig(); }, []);

  if (!config) return <div className="p-4">Loading config...</div>;

  const llmNames = Object.keys(config.llm_configs);
  const embNames = Object.keys(config.embedding_configs);

  const applyLLMPreset = (fmt: string) => {
    const preset = INTERFACE_PRESETS[fmt];
    if (preset) {
      setLlmForm((prev) => ({ ...prev, interface_format: fmt, base_url: preset.base_url, model_name: preset.model }));
    } else {
      setLlmForm((prev) => ({ ...prev, interface_format: fmt }));
    }
  };

  const applyEmbPreset = (fmt: string) => {
    const preset = INTERFACE_PRESETS[fmt];
    if (preset) {
      setEmbForm((prev) => ({ ...prev, interface_format: fmt, base_url: preset.base_url }));
    } else {
      setEmbForm((prev) => ({ ...prev, interface_format: fmt }));
    }
  };

  const handleAddLLM = () => {
    if (!llmName.trim()) return;
    addLLM(llmName.trim(), { ...llmForm });
    setLlmName("");
    setLlmForm({ api_key: "", base_url: "", model_name: "", temperature: 0.7, max_tokens: 4096, timeout: 600, interface_format: "OpenAI" });
  };

  const handleAddEmb = () => {
    if (!embName.trim()) return;
    addEmb(embName.trim(), { ...embForm });
    setEmbName("");
    setEmbForm({ api_key: "", base_url: "", model_name: "", retrieval_k: 4, interface_format: "OpenAI" });
  };

  const testLLM = async (name: string) => {
    try {
      await api.post("/config/test-llm", { config_name: name, llm_config: config.llm_configs[name] });
      toast({ title: `LLM "${name}" OK` });
    } catch (e: any) {
      toast({ title: `LLM "${name}" Failed`, description: e.message, variant: "destructive" });
    }
  };

  const testEmbedding = async (name: string) => {
    try {
      await api.post("/config/test-embedding", { config_name: name, embedding_config: config.embedding_configs[name] });
      toast({ title: `Embedding "${name}" OK` });
    } catch (e: any) {
      toast({ title: `Embedding "${name}" Failed`, description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 overflow-auto h-full pr-2 p-4">
      {/* LLM Configs */}
      <Card>
        <CardHeader className="p-3"><CardTitle className="text-sm">LLM Configurations</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="space-y-1">
            {llmNames.map((name) => (
              <div key={name} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded px-2 py-1">
                <span className="text-sm font-medium">{name} — {config.llm_configs[name].model_name}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => testLLM(name)}>Test</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeLLM(name)}>Del</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Input placeholder="Name" value={llmName} onChange={(e) => setLlmName(e.target.value)} />
            <Input placeholder="API Key" type="password" value={llmForm.api_key} onChange={(e) => setLlmForm({ ...llmForm, api_key: e.target.value })} />
            <Input placeholder="Base URL" value={llmForm.base_url} onChange={(e) => setLlmForm({ ...llmForm, base_url: e.target.value })} />
            <Input placeholder="Model" value={llmForm.model_name} onChange={(e) => setLlmForm({ ...llmForm, model_name: e.target.value })} />
            <div className="flex items-center gap-2">
              <span className="text-xs whitespace-nowrap">Temp: {llmForm.temperature.toFixed(2)}</span>
              <Slider min={0} max={2} step={0.01} value={llmForm.temperature} onChange={(v) => setLlmForm({ ...llmForm, temperature: v })} />
            </div>
            <Input type="number" placeholder="Max Tokens" value={llmForm.max_tokens} onChange={(e) => setLlmForm({ ...llmForm, max_tokens: Number(e.target.value) })} />
            <Input type="number" placeholder="Timeout" value={llmForm.timeout} onChange={(e) => setLlmForm({ ...llmForm, timeout: Number(e.target.value) })} />
            <Select value={llmForm.interface_format} onValueChange={applyLLMPreset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(INTERFACE_PRESETS).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAddLLM}>Add LLM</Button>
        </CardContent>
      </Card>

      {/* Embedding Configs */}
      <Card>
        <CardHeader className="p-3"><CardTitle className="text-sm">Embedding Configurations</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="space-y-1">
            {embNames.map((name) => (
              <div key={name} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded px-2 py-1">
                <span className="text-sm font-medium">{name} — {config.embedding_configs[name].model_name}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => testEmbedding(name)}>Test</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeEmb(name)}>Del</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Input placeholder="Name" value={embName} onChange={(e) => setEmbName(e.target.value)} />
            <Input placeholder="API Key" type="password" value={embForm.api_key} onChange={(e) => setEmbForm({ ...embForm, api_key: e.target.value })} />
            <Input placeholder="Base URL" value={embForm.base_url} onChange={(e) => setEmbForm({ ...embForm, base_url: e.target.value })} />
            <Input placeholder="Model" value={embForm.model_name} onChange={(e) => setEmbForm({ ...embForm, model_name: e.target.value })} />
            <Input type="number" placeholder="Retrieval K" value={embForm.retrieval_k} onChange={(e) => setEmbForm({ ...embForm, retrieval_k: Number(e.target.value) })} />
            <Select value={embForm.interface_format} onValueChange={applyEmbPreset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(INTERFACE_PRESETS).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAddEmb}>Add Embedding</Button>
        </CardContent>
      </Card>

      {/* Choose Configs */}
      <Card>
        <CardHeader className="p-3"><CardTitle className="text-sm">Stage LLM Selection</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(config.choose_configs).map(([stage, llm]) => (
              <div key={stage} className="flex items-center gap-2">
                <Label className="w-32 text-sm">{stage}:</Label>
                <Select value={llm} onValueChange={(v) => setChoose(stage, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {llmNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proxy */}
      <Card>
        <CardHeader className="p-3"><CardTitle className="text-sm">Proxy</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={config.proxy_setting.enabled} onChange={(e) => updateConfig({ proxy_setting: { ...config.proxy_setting, enabled: e.target.checked } })} />
            <Label>Enable Proxy</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Proxy URL" value={config.proxy_setting.proxy_url} onChange={(e) => updateConfig({ proxy_setting: { ...config.proxy_setting, proxy_url: e.target.value } })} />
            <Input placeholder="Proxy Port" value={config.proxy_setting.proxy_port} onChange={(e) => updateConfig({ proxy_setting: { ...config.proxy_setting, proxy_port: e.target.value } })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={saveConfig}>Save Config</Button>
        <Button variant="outline" onClick={loadConfig}>Reload</Button>
      </div>
    </div>
  );
}
