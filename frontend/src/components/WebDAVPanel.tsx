import React from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Switch } from "./ui/Switch";
import { useConfigStore } from "../stores/configStore";

import api from "../lib/api";
import { toast } from "./ui/Toast";

export default function WebDAVPanel() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const [loading, setLoading] = React.useState(false);

  if (!config) return null;
  const wc = config.webdav_config || {};

  const updateWebDAV = (patch: Record<string, any>) => {
    updateConfig({ webdav_config: { ...wc, ...patch } });
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      await api.post("/webdav/test", { webdav_config: wc });
      toast({ title: "WebDAV Connected" });
    } catch (e: any) {
      toast({ title: "WebDAV Failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const backup = async () => {
    setLoading(true);
    try {
      await api.post("/webdav/backup", { webdav_config: wc });
      toast({ title: "Backup Completed" });
    } catch (e: any) {
      toast({ title: "Backup Failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const restore = async () => {
    setLoading(true);
    try {
      await api.post("/webdav/restore", { webdav_config: wc });
      toast({ title: "Restore Completed" });
    } catch (e: any) {
      toast({ title: "Restore Failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <Switch checked={wc.enabled || false} onCheckedChange={(v: boolean) => updateWebDAV({ enabled: v as any })} />
        <Label>Enable WebDAV Sync</Label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><Label>URL</Label><Input value={wc.url || ""} onChange={(e) => updateWebDAV({ url: e.target.value })} placeholder="https://dav.example.com/novels/" /></div>
        <div><Label>Username</Label><Input value={wc.username || ""} onChange={(e) => updateWebDAV({ username: e.target.value })} /></div>
        <div><Label>Password</Label><Input type="password" value={wc.password || ""} onChange={(e) => updateWebDAV({ password: e.target.value })} /></div>
        <div><Label>Remote Path</Label><Input value={wc.remote_path || ""} onChange={(e) => updateWebDAV({ remote_path: e.target.value })} placeholder="/novels/" /></div>
        <div><Label>Sync Interval (min)</Label><Input type="number" value={wc.sync_interval || 30} onChange={(e) => updateWebDAV({ sync_interval: Number(e.target.value) })} /></div>
      </div>

      <div className="flex gap-2">
        <Button onClick={testConnection} disabled={loading || !wc.enabled}>Test</Button>
        <Button variant="outline" onClick={backup} disabled={loading || !wc.enabled}>Backup</Button>
        <Button variant="outline" onClick={restore} disabled={loading || !wc.enabled}>Restore</Button>
      </div>
    </div>
  );
}
