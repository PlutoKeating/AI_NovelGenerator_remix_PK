import React from "react";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Textarea } from "./ui/Textarea";
import { Button } from "./ui/Button";
import { useConfigStore } from "../stores/configStore";
import { useNovelStore } from "../stores/novelStore";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "./ui/Dialog";
import { Checkbox } from "./ui/Checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";

export default function NovelParams() {
  const config = useConfigStore((s) => s.config);
  const updateOther = useConfigStore((s) => s.updateOtherParams);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const novelPath = useNovelStore((s) => s.novelPath);
  const setNovelPath = useNovelStore((s) => s.setNovelPath);
  const categories = useNovelStore((s) => s.categories);
  const loadRoles = useNovelStore((s) => s.loadRoles);

  const [importOpen, setImportOpen] = React.useState(false);
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);

  if (!config) return <div className="p-4">Loading config...</div>;
  const p = config.other_params;

  const handleBrowse = async () => {
    const path = window.prompt("Enter novel save directory path:", p.filepath || "");
    if (path) { updateOther({ filepath: path }); setNovelPath(path); }
  };

  const handleImportRoles = async () => {
    if (!novelPath) return;
    await loadRoles();
    setImportOpen(true);
  };

  const confirmImport = () => {
    updateOther({ characters_involved: selectedRoles.join(", ") });
    setImportOpen(false);
    setSelectedRoles([]);
  };

  const requiredFilled = !!(p.topic && p.genre && p.filepath);

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Novel Setup</h2>
        <div className="flex gap-2">
          {requiredFilled ? <Badge variant="default" className="bg-green-600">Complete</Badge> : <Badge variant="destructive">Incomplete</Badge>}
          <Button size="sm" onClick={saveConfig}>Save Config</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div>
            <Label>Topic / 主题 <span className="text-red-500">*</span></Label>
            <Textarea rows={3} value={p.topic} onChange={(e) => updateOther({ topic: e.target.value })} placeholder="Novel topic or core idea" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Genre / 类型 <span className="text-red-500">*</span></Label>
              <Input value={p.genre} onChange={(e) => updateOther({ genre: e.target.value })} />
            </div>
            <div>
              <Label>Save Path <span className="text-red-500">*</span></Label>
              <div className="flex gap-2"><Input value={p.filepath} readOnly /><Button onClick={handleBrowse}>Browse</Button></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Chapters</Label><Input type="number" value={p.num_chapters} onChange={(e) => updateOther({ num_chapters: Number(e.target.value) })} /></div>
            <div><Label>Words/Chapter</Label><Input type="number" value={p.word_number} onChange={(e) => updateOther({ word_number: Number(e.target.value) })} /></div>
            <div><Label>Current Chapter</Label><Input value={p.chapter_num} onChange={(e) => updateOther({ chapter_num: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Guidance & Elements</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div><Label>User Guidance / 用户指导</Label><Textarea rows={3} value={p.user_guidance} onChange={(e) => updateOther({ user_guidance: e.target.value })} /></div>
          <div>
            <Label>Characters Involved / 核心人物</Label>
            <div className="flex gap-2">
              <Textarea rows={2} value={p.characters_involved} onChange={(e) => updateOther({ characters_involved: e.target.value })} />
              <Button onClick={handleImportRoles} className="shrink-0">Import</Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Key Items</Label><Input value={p.key_items} onChange={(e) => updateOther({ key_items: e.target.value })} /></div>
            <div><Label>Scene Location</Label><Input value={p.scene_location} onChange={(e) => updateOther({ scene_location: e.target.value })} /></div>
            <div><Label>Time Constraint</Label><Input value={p.time_constraint} onChange={(e) => updateOther({ time_constraint: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      {importOpen && (
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogHeader><DialogTitle>Import Characters from Role Library</DialogTitle></DialogHeader>
          <div className="max-h-80 overflow-auto space-y-2">
            {categories.map((cat) => (
              <div key={cat.name}>
                <div className="font-semibold text-sm">{cat.name}</div>
                <div className="grid grid-cols-2 gap-1">
                  {cat.roles.map((role: { name: string }) => (
                    <label key={role.name} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={selectedRoles.includes(role.name)} onChange={(e) => {
                        const checked = (e.target as HTMLInputElement).checked;
                        setSelectedRoles((prev) => checked ? [...prev, role.name] : prev.filter((r) => r !== role.name));
                      }} />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={confirmImport}>Confirm</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
