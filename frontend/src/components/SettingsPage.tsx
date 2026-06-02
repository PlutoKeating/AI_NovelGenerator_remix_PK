import React from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { Button } from "./ui/Button";
import ProviderCard from "./ProviderCard";
import ProviderForm from "./ProviderForm";
import { Plus, Server } from "lucide-react";
import { toast } from "./ui/Toast";

export default function SettingsPage() {
  const store = useSettingsStore();
  const config = store.config;
  const loadSettings = store.loadSettings;
  const saveSettings = store.saveSettings;

  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    loadSettings();
  }, []);

  if (!config) {
    return <div className="p-4 text-zinc-500 font-mono animate-pulse">Loading settings...</div>;
  }

  const handleSave = async () => {
    try {
      await saveSettings();
      toast({ title: "设置已保存" });
    } catch (e: any) {
      toast({ title: "保存失败", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-zinc-100">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-fuchsia-950/60 bg-[#110c22]/30">
        <div>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 tracking-wider">全局设置</h1>
          <p className="text-xs text-zinc-500 mt-0.5 font-mono">配置 LLM Provider、API Keys 和内置模型</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)} className="gap-1">
            <Plus size={16} />
            添加 Provider
          </Button>
          <Button onClick={handleSave}>
            保存全部
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Providers Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5 font-mono">
            <Server size={16} className="text-pink-500 animate-pulse" />
            LLM Providers ({config.providers?.length || 0})
          </h2>

          {!config.providers || config.providers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-fuchsia-950/50 rounded-lg text-zinc-500 bg-[#0f0b21]/30">
              <p className="text-xs font-mono">暂无配置的 Provider，请点击右上角"添加 Provider"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.providers.map((p) => (
                <ProviderCard key={p.provider_name} provider={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Provider Form Modal */}
      {formOpen && (
        <ProviderForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSave={(p) => {
            store.addProvider(p);
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}
