import React from "react";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Label } from "./ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/Select";
import { useNovelStore } from "../stores/novelStore";
import api from "../lib/api";
import { toast } from "./ui/Toast";

const FILE_OPTIONS = [
  { value: "architecture", label: "Architecture" },
  { value: "blueprint", label: "Blueprint" },
  { value: "character_state", label: "Character State" },
  { value: "global_summary", label: "Global Summary" },
  { value: "style", label: "Style" },
  { value: "knowledge_base", label: "Knowledge Base" },
];

export default function FileEditor() {
  const novelPath = useNovelStore((s) => s.novelPath);
  const [selectedFile, setSelectedFile] = React.useState("architecture");
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    if (!novelPath) { toast({ title: "No novel path", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await api.get<string>(`/files/${selectedFile}`, { params: { novel_path: novelPath } });
      setContent(res.data || "");
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!novelPath) return;
    setLoading(true);
    try {
      await api.put(`/files/${selectedFile}`, { novel_path: novelPath, content });
      toast({ title: "File saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex gap-2 items-center">
        <Label className="shrink-0">File:</Label>
        <Select value={selectedFile} onValueChange={setSelectedFile}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILE_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={load} disabled={loading}>Load</Button>
        <Button size="sm" variant="outline" onClick={save} disabled={loading}>Save</Button>
      </div>
      <Textarea className="flex-1 min-h-[300px] font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} />
    </div>
  );
}
