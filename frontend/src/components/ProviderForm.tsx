import React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/Select";
import type { ProviderConfig } from "../types";
import { designSystem } from "../designSystem";

interface ProviderFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (provider: ProviderConfig) => void;
}

const PRESETS: Record<string, { format: string; base_url: string; default_model: string }> = {
  OpenAI: { format: "OpenAI", base_url: "https://api.openai.com/v1", default_model: "gpt-4o" },
  DeepSeek: { format: "OpenAI", base_url: "https://api.deepseek.com/v1", default_model: "deepseek-chat" },
  SiliconFlow: { format: "OpenAI", base_url: "https://api.siliconflow.cn/v1", default_model: "deepseek-ai/DeepSeek-V3" },
  Grok: { format: "OpenAI", base_url: "https://api.x.ai/v1", default_model: "grok-beta" },
  Ollama: { format: "OpenAI", base_url: "http://localhost:11434/api", default_model: "llama3" },
};

export default function ProviderForm({ open, onClose, onSave }: ProviderFormProps) {
  const [name, setName] = React.useState("");
  const [format, setFormat] = React.useState("OpenAI");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [preset, setPreset] = React.useState("Custom");

  const applyPreset = (key: string) => {
    setPreset(key);
    if (key === "Custom") {
      setName("");
      setBaseUrl("");
    } else {
      const p = PRESETS[key];
      setName(key);
      setFormat(p.format);
      setBaseUrl(p.base_url);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const defaultModel = PRESETS[preset]?.default_model || "gpt-4o";
    const provider: ProviderConfig = {
      provider_name: name.trim(),
      interface_format: format,
      base_url: baseUrl.trim(),
      timeout: 600,
      keys: [],
      models: [{
        model_name: defaultModel,
        temperature: 0.7,
        max_tokens: 4096,
      }],
    };
    onSave(provider);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogHeader>
        <DialogTitle>添加 Provider</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2 text-zinc-100">
        <div>
          <Label className={designSystem.label}>预设模板</Label>
          <Select value={preset} onValueChange={applyPreset}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Custom">自定义 (Custom)</SelectItem>
              {Object.keys(PRESETS).map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={designSystem.label}>名称 <span className="text-pink-500">*</span></Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入 Provider 唯一标识，如 OpenAI"
          />
        </div>

        <div>
          <Label className={designSystem.label}>接口格式</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OpenAI">OpenAI 兼容</SelectItem>
              <SelectItem value="DeepSeek">DeepSeek 官方</SelectItem>
              <SelectItem value="Gemini">Gemini (Google)</SelectItem>
              <SelectItem value="Ollama">Ollama</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={designSystem.label}>Base URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="输入 API 基准地址，如 https://api.openai.com/v1"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={!name.trim()}>保存</Button>
      </DialogFooter>
    </Dialog>
  );
}
