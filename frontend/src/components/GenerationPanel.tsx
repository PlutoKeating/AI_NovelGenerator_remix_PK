import React from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Label } from "./ui/Label";
import { useConfigStore } from "../stores/configStore";
import { useNovelStore } from "../stores/novelStore";
import { useGenerationStore } from "../stores/generationStore";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "./ui/Dialog";
import { getWordCount } from "../lib/utils";
import api from "../lib/api";
import { toast } from "./ui/Toast";

export default function GenerationPanel() {
  const config = useConfigStore((s) => s.config);
  const novelPath = useNovelStore((s) => s.novelPath);
  const currentChapterContent = useNovelStore((s) => s.currentChapterContent);
  const currentChapterNum = useNovelStore((s) => s.currentChapterNum);
  const setChapterContent = useNovelStore((s) => s.saveChapter);
  const refreshChapters = useNovelStore((s) => s.refreshChapters);
  const addTask = useGenerationStore((s) => s.addTask);
  const updateTask = useGenerationStore((s) => s.updateTask);

  const [chapterText, setChapterText] = React.useState(currentChapterContent);
  const [log, setLog] = React.useState<string[]>([]);
  const [promptDialog, setPromptDialog] = React.useState<{ open: boolean; prompt: string; onConfirm: (p: string) => void } | null>(null);
  const [batchDialog, setBatchDialog] = React.useState(false);
  const [batchStart, setBatchStart] = React.useState(1);
  const [batchEnd, setBatchEnd] = React.useState(1);
  const [batchExpected, setBatchExpected] = React.useState(3000);
  const [batchMin, setBatchMin] = React.useState(2000);
  const [batchAutoEnrich, setBatchAutoEnrich] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => { setChapterText(currentChapterContent); }, [currentChapterContent]);

  const pushLog = (msg: string) => setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const getRequestBody = () => {
    if (!config) throw new Error("Config not loaded");
    const p = config.other_params;
    return {
      novel_path: p.filepath,
      chapter_num: Number(p.chapter_num),
      topic: p.topic,
      genre: p.genre,
      num_chapters: p.num_chapters,
      word_number: p.word_number,
      user_guidance: p.user_guidance,
      characters_involved: p.characters_involved,
      key_items: p.key_items,
      scene_location: p.scene_location,
      time_constraint: p.time_constraint,
      llm_config_name: config.choose_configs.prompt_draft_llm,
      embedding_config_name: Object.keys(config.embedding_configs)[0] || "",
    };
  };

  const runStep1 = async () => {
    const taskId = addTask({ type: "architecture", status: "running", message: "Generating architecture..." });
    setGenerating(true);
    try {
      await api.post("/generate/architecture", getRequestBody());
      updateTask(taskId, { status: "success", message: "Architecture generated." });
      pushLog("Step 1: Architecture generated successfully.");
      toast({ title: "Architecture Generated" });
    } catch (e: any) {
      updateTask(taskId, { status: "error", message: e.message });
      pushLog(`Step 1 Error: ${e.message}`);
      toast({ title: "Architecture Failed", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const runStep2 = async () => {
    const taskId = addTask({ type: "blueprint", status: "running", message: "Generating blueprint..." });
    setGenerating(true);
    try {
      await api.post("/generate/blueprint", getRequestBody());
      updateTask(taskId, { status: "success", message: "Blueprint generated." });
      pushLog("Step 2: Blueprint generated successfully.");
      toast({ title: "Blueprint Generated" });
    } catch (e: any) {
      updateTask(taskId, { status: "error", message: e.message });
      pushLog(`Step 2 Error: ${e.message}`);
      toast({ title: "Blueprint Failed", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const runStep3 = async () => {
    setGenerating(true);
    try {
      const body = getRequestBody();
      const promptRes = await api.post<string>("/generate/prompt", body);
      const prompt = promptRes.data;
      setPromptDialog({ open: true, prompt, onConfirm: async (customPrompt) => {
        setPromptDialog(null);
        const taskId = addTask({ type: "draft", status: "running", message: `Generating draft for chapter ${body.chapter_num}...` });
        try {
          const draftRes = await api.post<string>("/generate/draft", { ...body, custom_prompt: customPrompt });
          const text = draftRes.data;
          setChapterText(text);
          await setChapterContent(String(body.chapter_num), text);
          updateTask(taskId, { status: "success", message: `Draft for chapter ${body.chapter_num} generated.` });
          pushLog(`Step 3: Draft for chapter ${body.chapter_num} generated.`);
          toast({ title: "Draft Generated" });
        } catch (e: any) {
          updateTask(taskId, { status: "error", message: e.message });
          pushLog(`Step 3 Error: ${e.message}`);
          toast({ title: "Draft Failed", description: e.message, variant: "destructive" });
        } finally { setGenerating(false); }
      }});
    } catch (e: any) {
      setGenerating(false);
      pushLog(`Step 3 Error: ${e.message}`);
      toast({ title: "Prompt Build Failed", description: e.message, variant: "destructive" });
    }
  };

  const runStep4 = async () => {
    const taskId = addTask({ type: "finalize", status: "running", message: `Finalizing chapter ${config?.other_params.chapter_num}...` });
    setGenerating(true);
    try {
      const body = getRequestBody();
      const currentWords = getWordCount(chapterText);
      const target = config?.other_params.word_number || 0;
      if (target > 0 && currentWords < target * 0.7) {
        if (window.confirm(`Word count (${currentWords}) is below 70% of target (${target}). Enrich before finalize?`)) {
          const enrichRes = await api.post<string>("/generate/enrich", { ...body, chapter_text: chapterText });
          setChapterText(enrichRes.data);
          await setChapterContent(String(body.chapter_num), enrichRes.data);
          pushLog("Chapter enriched before finalization.");
        }
      }
      await api.post("/generate/finalize", body);
      updateTask(taskId, { status: "success", message: `Chapter ${body.chapter_num} finalized.` });
      pushLog(`Step 4: Chapter ${body.chapter_num} finalized.`);
      toast({ title: "Chapter Finalized" });
    } catch (e: any) {
      updateTask(taskId, { status: "error", message: e.message });
      pushLog(`Step 4 Error: ${e.message}`);
      toast({ title: "Finalization Failed", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const runBatch = async () => {
    setBatchDialog(false);
    const taskId = addTask({ type: "batch", status: "running", message: `Batch generating chapters ${batchStart}~${batchEnd}...` });
    setGenerating(true);
    try {
      const body = getRequestBody();
      await api.post("/generate/batch", { ...body, start_chapter: batchStart, end_chapter: batchEnd, expected_word_count: batchExpected, min_word_count: batchMin, auto_enrich: batchAutoEnrich });
      updateTask(taskId, { status: "success", message: `Batch ${batchStart}~${batchEnd} completed.` });
      pushLog(`Batch: Chapters ${batchStart}~${batchEnd} generated.`);
      await refreshChapters();
      toast({ title: "Batch Generation Completed" });
    } catch (e: any) {
      updateTask(taskId, { status: "error", message: e.message });
      pushLog(`Batch Error: ${e.message}`);
      toast({ title: "Batch Failed", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const runConsistency = async () => {
    const taskId = addTask({ type: "consistency", status: "running", message: "Checking consistency..." });
    setGenerating(true);
    try {
      const body = getRequestBody();
      const res = await api.post<string>("/generate/consistency", { ...body, chapter_text: chapterText });
      updateTask(taskId, { status: "success", message: "Consistency check done." });
      pushLog(`Consistency: ${res.data}`);
      toast({ title: "Consistency Check", description: res.data });
    } catch (e: any) {
      updateTask(taskId, { status: "error", message: e.message });
      pushLog(`Consistency Error: ${e.message}`);
      toast({ title: "Consistency Failed", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const importKnowledge = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".txt";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      const form = new FormData();
      form.append("file", file); form.append("novel_path", novelPath);
      const embName = Object.keys(config?.embedding_configs || {})[0] || "";
      form.append("embedding_config_name", embName);
      const taskId = addTask({ type: "knowledge", status: "running", message: "Importing knowledge..." });
      try {
        await api.post("/knowledge/import", form, { headers: { "Content-Type": "multipart/form-data" } });
        updateTask(taskId, { status: "success", message: "Knowledge imported." });
        pushLog("Knowledge imported successfully."); toast({ title: "Knowledge Imported" });
      } catch (e: any) {
        updateTask(taskId, { status: "error", message: e.message });
        pushLog(`Knowledge Error: ${e.message}`);
        toast({ title: "Import Failed", description: e.message, variant: "destructive" });
      }
    };
    input.click();
  };

  const clearVectorStore = async () => {
    if (!window.confirm("Are you sure to clear vector store?")) return;
    if (!window.confirm("This action is irreversible. Confirm again?")) return;
    const taskId = addTask({ type: "clear_vectorstore", status: "running", message: "Clearing vector store..." });
    try {
      await api.delete("/vectorstore", { params: { novel_path: novelPath } });
      updateTask(taskId, { status: "success", message: "Vector store cleared." });
      pushLog("Vector store cleared."); toast({ title: "Vector Store Cleared" });
    } catch (e: any) {
      updateTask(taskId, { status: "error", message: e.message });
      pushLog(`Clear Vector Error: ${e.message}`);
      toast({ title: "Clear Failed", description: e.message, variant: "destructive" });
    }
  };

  const showPlotArcs = async () => {
    try {
      const res = await api.get<string>("/files/plot_arcs.txt", { params: { novel_path: novelPath } });
      window.alert(res.data || "No plot arcs found.");
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={runStep1} disabled={generating}>Step1 Architecture</Button>
        <Button onClick={runStep2} disabled={generating}>Step2 Blueprint</Button>
        <Button onClick={runStep3} disabled={generating}>Step3 Draft</Button>
        <Button onClick={runStep4} disabled={generating}>Step4 Finalize</Button>
        <Button variant="secondary" onClick={() => setBatchDialog(true)} disabled={generating}>Batch</Button>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label>Chapter Editor</Label>
          <span className="text-xs text-slate-500">Words: {getWordCount(chapterText)}</span>
        </div>
        <Textarea className="flex-1 min-h-[200px] font-mono text-sm" value={chapterText} onChange={(e) => setChapterText(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => { await setChapterContent(currentChapterNum, chapterText); toast({ title: "Chapter Saved" }); }}>Save Chapter</Button>
          <Button size="sm" variant="outline" onClick={runConsistency} disabled={generating}>Consistency</Button>
          <Button size="sm" variant="outline" onClick={importKnowledge} disabled={generating}>Import Knowledge</Button>
          <Button size="sm" variant="outline" onClick={clearVectorStore} disabled={generating}>Clear VectorStore</Button>
          <Button size="sm" variant="outline" onClick={showPlotArcs}>Plot Arcs</Button>
        </div>
      </div>

      <div className="h-40 rounded border p-2 overflow-auto font-mono text-xs bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
        {log.length === 0 && <span className="text-slate-400">Logs will appear here...</span>}
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {promptDialog?.open && (
        <Dialog open onOpenChange={() => setPromptDialog(null)}>
          <DialogHeader><DialogTitle>Edit Prompt before Generation</DialogTitle></DialogHeader>
          <Textarea className="min-h-[300px] font-mono text-sm" value={promptDialog.prompt} onChange={(e) => setPromptDialog({ ...promptDialog, prompt: e.target.value })} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptDialog(null)}>Cancel</Button>
            <Button onClick={() => promptDialog.onConfirm(promptDialog.prompt)}>Confirm</Button>
          </DialogFooter>
        </Dialog>
      )}

      {batchDialog && (
        <Dialog open onOpenChange={setBatchDialog}>
          <DialogHeader><DialogTitle>Batch Generation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Start Chapter</Label><Input type="number" value={batchStart} onChange={(e) => setBatchStart(Number(e.target.value))} /></div>
            <div><Label>End Chapter</Label><Input type="number" value={batchEnd} onChange={(e) => setBatchEnd(Number(e.target.value))} /></div>
            <div><Label>Expected Words</Label><Input type="number" value={batchExpected} onChange={(e) => setBatchExpected(Number(e.target.value))} /></div>
            <div><Label>Min Words</Label><Input type="number" value={batchMin} onChange={(e) => setBatchMin(Number(e.target.value))} /></div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={batchAutoEnrich} onChange={(e) => setBatchAutoEnrich(e.target.checked)} />
              <Label>Auto Enrich</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialog(false)}>Cancel</Button>
            <Button onClick={runBatch}>Start Batch</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
