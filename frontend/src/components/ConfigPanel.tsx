import React from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/Select";
import { useConfigStore } from "../stores/configStore";
import api from "../lib/api";
import { toast } from "./ui/Toast";

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
  const [llmForm, setLlmForm] = React.useState({ api_key: "", base_url: "", model: "", temperature: 0.7, max_tokens: 4096, timeout: 60 });
  const [embName, setEmbName] = React.useState("");
  const [embForm, setEmbForm] = React.useState({ api_key: "", base_url: "", model: "", chunk_size: 500, chunk_overlap: 50 });

  React.useEffect(() => { loadConfig(); }, []);

  if (!config) return <div className="p-4">Loading config...</div>;

  const llmNames = Object.keys(config.llm_configs);
  const embNames = Object.keys(config.embedding_configs);

  const handleAddLLM = () => {
    if (!llmName.trim()) return;
    addLLM(llmName.trim(), { ...llmForm });
    setLlmName("");
    setLlmForm({ api_key: "", base_url: "", model: "", temperature: 0.7, max_tokens: 4096, timeout: 60 });
  };

  const handleAddEmb = () => {
    if (!embName.trim()) return;
    addEmb(embName.trim(), { ...embForm });
    setEmbName("");
    setEmbForm({ api_key: "", base_url: "", model: "", chunk_size: 500, chunk_overlap: 50 });
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
    <div className="space-y-6 overflow-auto h-full pr-2">
      {/* LLM Configs */}
      <div className="border rounded p-3 space-y-2">
        <h3 className="font-semibold">LLM Configurations</h3>
        <div className="space-y-1">
          {llmNames.map((name) => (
            <div key={name} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded px-2 py-1">
              <span className="text-sm font-medium">{name} — {config.llm_configs[name].model}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => testLLM(name)}>Test</Button>
                <Button size="sm" variant="destructive" onClick={() => removeLLM(name)}>Del</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Input placeholder="Name" value={llmName} onChange={(e) => setLlmName(e.target.value)} />
          <Input placeholder="API Key" value={llmForm.api_key} onChange={(e) => setLlmForm({ ...llmForm, api_key: e.target.value })} />
          <Input placeholder="Base URL" value={llmForm.base_url} onChange={(e) => setLlmForm({ ...llmForm, base_url: e.target.value })} />
          <Input placeholder="Model" value={llmForm.model} onChange={(e) => setLlmForm({ ...llmForm, model: e.target.value })} />
          <Input type="number" placeholder="Temperature" value={llmForm.temperature} onChange={(e) => setLlmForm({ ...llmForm, temperature: Number(e.target.value) })} />
          <Input type="number" placeholder="Max Tokens" value={llmForm.max_tokens} onChange={(e) => setLlmForm({ ...llmForm, max_tokens: Number(e.target.value) })} />
          <Input type="number" placeholder="Timeout" value={llmForm.timeout} onChange={(e) => setLlmForm({ ...llmForm, timeout: Number(e.target.value) })} />
        </div>
        <Button size="sm" onClick={handleAddLLM}>Add LLM</Button>
      </div>

      {/* Embedding Configs */}
      <div className="border rounded p-3 space-y-2">
        <h3 className="font-semibold">Embedding Configurations</h3>
        <div className="space-y-1">
          {embNames.map((name) => (
            <div key={name} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded px-2 py-1">
              <span className="text-sm font-medium">{name} — {config.embedding_configs[name].model}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => testEmbedding(name)}>Test</Button>
                <Button size="sm" variant="destructive" onClick={() => removeEmb(name)}>Del</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Input placeholder="Name" value={embName} onChange={(e) => setEmbName(e.target.value)} />
          <Input placeholder="API Key" value={embForm.api_key} onChange={(e) => setEmbForm({ ...embForm, api_key: e.target.value })} />
          <Input placeholder="Base URL" value={embForm.base_url} onChange={(e) => setEmbForm({ ...embForm, base_url: e.target.value })} />
          <Input placeholder="Model" value={embForm.model} onChange={(e) => setEmbForm({ ...embForm, model: e.target.value })} />
          <Input type="number" placeholder="Chunk Size" value={embForm.chunk_size} onChange={(e) => setEmbForm({ ...embForm, chunk_size: Number(e.target.value) })} />
          <Input type="number" placeholder="Chunk Overlap" value={embForm.chunk_overlap} onChange={(e) => setEmbForm({ ...embForm, chunk_overlap: Number(e.target.value) })} />
        </div>
        <Button size="sm" onClick={handleAddEmb}>Add Embedding</Button>
      </div>

      {/* Choose Configs */}
      <div className="border rounded p-3 space-y-2">
        <h3 className="font-semibold">Stage LLM Selection</h3>
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
      </div>

      {/* Proxy */}
      <div className="border rounded p-3 space-y-2">
        <h3 className="font-semibold">Proxy</h3>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={config.proxy_setting.enabled} onChange={(e) => updateConfig({ proxy_setting: { ...config.proxy_setting, enabled: e.target.checked } })} />
          <Label>Enable Proxy</Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="HTTP Proxy" value={config.proxy_setting.http_proxy} onChange={(e) => updateConfig({ proxy_setting: { ...config.proxy_setting, http_proxy: e.target.value } })} />
          <Input placeholder="HTTPS Proxy" value={config.proxy_setting.https_proxy} onChange={(e) => updateConfig({ proxy_setting: { ...config.proxy_setting, https_proxy: e.target.value } })} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={saveConfig}>Save Config</Button>
        <Button variant="outline" onClick={loadConfig}>Reload</Button>
      </div>
    </div>
  );
}
