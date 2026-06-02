import React from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Label } from "./ui/Label";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "./ui/Dialog";
import { ScrollArea } from "./ui/ScrollArea";
import { useNovelStore } from "../stores/novelStore";
import api from "../lib/api";
import { toast } from "./ui/Toast";

interface LocalRole {
  name: string;
  description: string;
  character_arc: string;
  relationships: string;
}

export default function RoleLibrary() {
  const categories = useNovelStore((s) => s.categories);
  const loadRoles = useNovelStore((s) => s.loadRoles);
  const novelPath = useNovelStore((s) => s.novelPath);

  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<LocalRole | null>(null);
  const [editRole, setEditRole] = React.useState<LocalRole | null>(null);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [showNewCategory, setShowNewCategory] = React.useState(false);
  const [analyzeText, setAnalyzeText] = React.useState("");
  const [analyzeOpen, setAnalyzeOpen] = React.useState(false);

  const currentCategory = categories.find((c) => c.name === selectedCategory);

  const saveRole = async () => {
    if (!editRole || !selectedCategory || !novelPath) return;
    try {
      await api.post("/roles", {
        novel_path: novelPath,
        category: selectedCategory,
        role: { name: editRole.name, description: editRole.description, character_arc: editRole.character_arc, relationships: editRole.relationships },
      });
      await loadRoles();
      setEditRole(null);
      setSelectedRole(editRole);
      toast({ title: "Role saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const deleteRole = async () => {
    if (!selectedRole || !selectedCategory || !novelPath) return;
    if (!window.confirm(`Delete role "${selectedRole.name}"?`)) return;
    try {
      await api.delete("/roles", { params: { novel_path: novelPath, category: selectedCategory, role_name: selectedRole.name } });
      await loadRoles();
      setSelectedRole(null);
      toast({ title: "Role deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim() || !novelPath) return;
    try {
      await api.post("/roles/category", { novel_path: novelPath, category: newCategoryName.trim() });
      await loadRoles();
      setNewCategoryName("");
      setShowNewCategory(false);
      setSelectedCategory(newCategoryName.trim());
      toast({ title: "Category created" });
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    }
  };

  const analyzeRoles = async () => {
    if (!analyzeText.trim() || !novelPath) return;
    try {
      const res = await api.post("/roles/analyze", { novel_path: novelPath, text: analyzeText });
      await loadRoles();
      setAnalyzeOpen(false);
      setAnalyzeText("");
      toast({ title: "Analysis complete", description: `Found ${res.data.count || 0} roles` });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full gap-2">
      {/* Category list */}
      <div className="w-48 flex flex-col gap-2 border-r pr-2">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm">Categories</h3>
          <Button size="sm" variant="ghost" onClick={() => setShowNewCategory(true)}>+</Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => { setSelectedCategory(cat.name); setSelectedRole(null); setEditRole(null); }}
                className={`w-full text-left px-2 py-1 rounded text-sm ${selectedCategory === cat.name ? "bg-slate-200 dark:bg-slate-700 font-semibold" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                {cat.name} ({cat.roles.length})
              </button>
            ))}
          </div>
        </ScrollArea>
        <Button size="sm" variant="outline" onClick={() => setAnalyzeOpen(true)}>Analyze Text</Button>
      </div>

      {/* Role list */}
      <div className="w-48 flex flex-col gap-2 border-r pr-2">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm">Roles</h3>
          <Button size="sm" variant="ghost" onClick={() => setEditRole({ name: "", description: "", character_arc: "", relationships: "" })}>+</Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {currentCategory?.roles.map((role) => (
              <button
                key={role.name}
                onClick={() => { setSelectedRole(role as LocalRole); setEditRole(null); }}
                className={`w-full text-left px-2 py-1 rounded text-sm ${selectedRole?.name === role.name ? "bg-slate-200 dark:bg-slate-700 font-semibold" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                {role.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Role detail / edit */}
      <div className="flex-1 flex flex-col gap-2">
        {editRole ? (
          <div className="space-y-2">
            <h3 className="font-semibold">{editRole.name ? "Edit Role" : "New Role"}</h3>
            <div><Label>Name</Label><Input value={editRole.name} onChange={(e) => setEditRole({ ...editRole, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={4} value={editRole.description} onChange={(e) => setEditRole({ ...editRole, description: e.target.value })} /></div>
            <div><Label>Character Arc</Label><Textarea rows={3} value={editRole.character_arc} onChange={(e) => setEditRole({ ...editRole, character_arc: e.target.value })} /></div>
            <div><Label>Relationships</Label><Textarea rows={3} value={editRole.relationships} onChange={(e) => setEditRole({ ...editRole, relationships: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button onClick={saveRole}>Save</Button>
              <Button variant="outline" onClick={() => setEditRole(null)}>Cancel</Button>
            </div>
          </div>
        ) : selectedRole ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{selectedRole.name}</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditRole({ ...selectedRole })}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={deleteRole}>Delete</Button>
              </div>
            </div>
            <div><Label>Description</Label><div className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-2 rounded">{selectedRole.description}</div></div>
            <div><Label>Character Arc</Label><div className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-2 rounded">{selectedRole.character_arc}</div></div>
            <div><Label>Relationships</Label><div className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-2 rounded">{selectedRole.relationships}</div></div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">Select a role to view details</div>
        )}
      </div>

      {showNewCategory && (
        <Dialog open onOpenChange={setShowNewCategory}>
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCategory(false)}>Cancel</Button>
            <Button onClick={createCategory}>Create</Button>
          </DialogFooter>
        </Dialog>
      )}

      {analyzeOpen && (
        <Dialog open onOpenChange={setAnalyzeOpen}>
          <DialogHeader><DialogTitle>Analyze Text for Roles</DialogTitle></DialogHeader>
          <Textarea rows={8} value={analyzeText} onChange={(e) => setAnalyzeText(e.target.value)} placeholder="Paste text to analyze for characters..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyzeOpen(false)}>Cancel</Button>
            <Button onClick={analyzeRoles}>Analyze</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
