import React from "react";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Label } from "./ui/Label";
import { useNovelStore } from "../stores/novelStore";
import { getWordCount } from "../lib/utils";
import { toast } from "./ui/Toast";

export default function PlotArcsTab() {
  const novelPath = useNovelStore((s) => s.novelPath);
  const plotArcsContent = useNovelStore((s) => s.plotArcsContent);
  const loadFile = useNovelStore((s) => s.loadFile);
  const saveFile = useNovelStore((s) => s.saveFile);
  const [content, setContent] = React.useState(plotArcsContent);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { setContent(plotArcsContent); }, [plotArcsContent]);

  const load = async () => {
    if (!novelPath) { toast({ title: "No novel path", variant: "destructive" }); return; }
    setLoading(true);
    const data = await loadFile("plot_arcs");
    setContent(data);
    setLoading(false);
  };

  const save = async () => {
    if (!novelPath) return;
    setLoading(true);
    try {
      await saveFile("plot_arcs", content);
      toast({ title: "Plot Arcs saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-2 p-2">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Label className="shrink-0 font-semibold">Plot Arcs</Label>
          <span className="text-xs text-slate-500">Words: {getWordCount(content)}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={load} disabled={loading}>Load</Button>
          <Button size="sm" variant="outline" onClick={save} disabled={loading}>Save</Button>
        </div>
      </div>
      <Textarea className="flex-1 min-h-[300px] font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} />
    </div>
  );
}
