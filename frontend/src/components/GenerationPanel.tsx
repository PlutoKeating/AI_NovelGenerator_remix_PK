import React from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Label } from "./ui/Label";
import { useConfigStore } from "../stores/configStore";
import { useNovelStore } from "../stores/novelStore";
import { useGenerationStore } from "../stores/generationStore";
import { usePipelineStep } from "../hooks/usePipelineStep";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "./ui/Dialog";
import { getWordCount } from "../lib/utils";
import api from "../lib/api";
import { toast } from "./ui/Toast";
import LogConsole from "./LogConsole";
import PipelineStatus from "./PipelineStatus";
import TaskCenter from "./TaskCenter";

export default function GenerationPanel() {
  const config = useConfigStore((s) => s.config);
  const novelPath = useNovelStore((s) => s.novelPath);
  const currentChapterContent = useNovelStore((s) => s.currentChapterContent);
  const currentChapterNum = useNovelStore((s) => s.currentChapterNum);
  const setChapterContent = useNovelStore((s) => s.saveChapter);
  const refreshChapters = useNovelStore((s) => s.refreshChapters);
  const setPipelineStatus = useGenerationStore((s) => s.setPipelineStatus);
  const { runStep, generating } = usePipelineStep();

  const [chapterText, setChapterText] = React.useState(currentChapterContent);
  const [promptDialog, setPromptDialog] = React.useState<{ open: boolean; prompt: string; onConfirm: (p: string) => void } | null>(null);
  const [batchDialog, setBatchDialog] = React.useState(false);
  const [batchStart, setBatchStart] = React.useState(1);
  const [batchEnd, setBatchEnd] = React.useState(1);
  const [batchExpected, setBatchExpected] = React.useState(3000);
  const [batchMin, setBatchMin] = React.useState(2000);
  const [batchAutoEnrich, setBatchAutoEnrich] = React.useState(false);

  React.useEffect(() => { setChapterText(currentChapterContent); }, [currentChapterContent]);

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

  const runStep1 = () =>
    runStep(() => api.post("/generate/architecture", getRequestBody()), {
      stepNum: 1,
      taskType: "architecture",
      taskMessage: "Generating architecture...",
      logStart: "Step 1: Starting architecture generation...",
      logSuccess: "Step 1: Architecture generated successfully.",
      logError: "Step 1 Error",
      toastTitle: "Architecture Generated",
      toastErrorTitle: "Architecture Failed",
    });

  const runStep2 = () =>
    runStep(() => api.post("/generate/blueprint", getRequestBody()), {
      stepNum: 2,
      taskType: "blueprint",
      taskMessage: "Generating blueprint...",
      logStart: "Step 2: Starting blueprint generation...",
      logSuccess: "Step 2: Blueprint generated successfully.",
      logError: "Step 2 Error",
      toastTitle: "Blueprint Generated",
      toastErrorTitle: "Blueprint Failed",
    });

  const runStep3 = async () => {
    setPipelineStatus("running");
    try {
      const body = getRequestBody();
      const promptRes = await api.post<string>("/generate/prompt", body);
      const prompt = promptRes.data;
      setPromptDialog({ open: true, prompt, onConfirm: (customPrompt) => {
        setPromptDialog(null);
        runStep(
          async () => {
            const draftRes = await api.post<string>("/generate/draft", { ...body, custom_prompt: customPrompt });
            const text = draftRes.data;
            setChapterText(text);
            await setChapterContent(String(body.chapter_num), text);
          },
          {
            stepNum: 3,
            taskType: "draft",
            taskMessage: `Generating draft for chapter ${body.chapter_num}...`,
            logStart: `Step 3: Generating draft for chapter ${body.chapter_num}...`,
            logSuccess: `Step 3: Draft for chapter ${body.chapter_num} generated.`,
            logError: "Step 3 Error",
            toastTitle: "Draft Generated",
            toastErrorTitle: "Draft Failed",
          }
        );
      }});
    } catch (e: any) {
      setPipelineStatus("error");
      toast({ title: "Prompt Build Failed", description: e.message, variant: "destructive" });
    }
  };

  const runStep4 = () =>
    runStep(async () => {
      const body = getRequestBody();
      const currentWords = getWordCount(chapterText);
      const target = config?.other_params.word_number || 0;
      if (target > 0 && currentWords < target * 0.7) {
        if (window.confirm(`Word count (${currentWords}) is below 70% of target (${target}). Enrich before finalize?`)) {
          const enrichRes = await api.post<string>("/generate/enrich", { ...body, chapter_text: chapterText });
          setChapterText(enrichRes.data);
          await setChapterContent(String(body.chapter_num), enrichRes.data);
        }
      }
      await api.post("/generate/finalize", body);
    }, {
      stepNum: 4,
      taskType: "finalize",
      taskMessage: `Finalizing chapter ${config?.other_params.chapter_num}...`,
      logStart: `Step 4: Finalizing chapter ${config?.other_params.chapter_num}...`,
      logSuccess: `Step 4: Chapter ${config?.other_params.chapter_num} finalized.`,
      logError: "Step 4 Error",
      toastTitle: "Chapter Finalized",
      toastErrorTitle: "Finalization Failed",
    });

  const runBatch = () => {
    setBatchDialog(false);
    return runStep(
      () => api.post("/generate/batch", {
        ...getRequestBody(),
        start_chapter: batchStart,
        end_chapter: batchEnd,
        expected_word_count: batchExpected,
        min_word_count: batchMin,
        auto_enrich: batchAutoEnrich,
      }),
      {
        taskType: "batch",
        taskMessage: `Batch generating chapters ${batchStart}~${batchEnd}...`,
        logStart: `Batch: Starting chapters ${batchStart}~${batchEnd}...`,
        logSuccess: `Batch: Chapters ${batchStart}~${batchEnd} generated.`,
        logError: "Batch Error",
        toastTitle: "Batch Generation Completed",
        toastErrorTitle: "Batch Failed",
        onSuccess: refreshChapters,
      }
    );
  };

  const runConsistency = () =>
    runStep(async () => {
      const body = getRequestBody();
      const res = await api.post<string>("/generate/consistency", { ...body, chapter_text: chapterText });
      return res.data;
    }, {
      taskType: "consistency",
      taskMessage: "Checking consistency...",
      logStart: "Consistency check started...",
      logSuccess: "Consistency check done.",
      logError: "Consistency Error",
      toastTitle: "Consistency Check",
      toastErrorTitle: "Consistency Failed",
    });

  const importKnowledge = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".txt";
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const form = new FormData();
      form.append("file", file); form.append("novel_path", novelPath);
      const embName = Object.keys(config?.embedding_configs || {})[0] || "";
      form.append("embedding_config_name", embName);
      runStep(() => api.post("/knowledge/import", form, { headers: { "Content-Type": "multipart/form-data" } }), {
        taskType: "knowledge",
        taskMessage: "Importing knowledge...",
        logStart: "Importing knowledge file...",
        logSuccess: "Knowledge imported successfully.",
        logError: "Knowledge Error",
        toastTitle: "Knowledge Imported",
        toastErrorTitle: "Import Failed",
      });
    };
    input.click();
  };

  const clearVectorStore = () => {
    if (!window.confirm("Are you sure to clear vector store?")) return;
    if (!window.confirm("This action is irreversible. Confirm again?")) return;
    runStep(() => api.delete("/vectorstore", { params: { novel_path: novelPath } }), {
      taskType: "clear_vectorstore",
      taskMessage: "Clearing vector store...",
      logStart: "Clearing vector store...",
      logSuccess: "Vector store cleared.",
      logError: "Clear Vector Error",
      toastTitle: "Vector Store Cleared",
      toastErrorTitle: "Clear Failed",
    });
  };

  const showPlotArcs = async () => {
    try {
      const res = await api.get<string>("/files/plot_arcs", { params: { novel_path: novelPath } });
      window.alert(res.data || "No plot arcs found.");
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex gap-2 flex-wrap shrink-0">
        <Button onClick={runStep1} disabled={generating}>Step1 Architecture</Button>
        <Button onClick={runStep2} disabled={generating}>Step2 Blueprint</Button>
        <Button onClick={runStep3} disabled={generating}>Step3 Draft</Button>
        <Button onClick={runStep4} disabled={generating}>Step4 Finalize</Button>
        <Button variant="secondary" onClick={() => setBatchDialog(true)} disabled={generating}>Batch</Button>
      </div>

      <div className="flex-1 flex gap-2 min-h-0">
        {/* Left: Pipeline + Logs + Task Center */}
        <div className="w-80 flex flex-col gap-2 shrink-0">
          <div className="rounded border p-3 dark:border-slate-700 bg-white dark:bg-slate-950">
            <h3 className="text-sm font-semibold mb-2">Pipeline Status</h3>
            <PipelineStatus />
          </div>
          <div className="flex-1 min-h-0 rounded border p-2 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden">
            <TaskCenter />
          </div>
          <div className="h-48 min-h-0 rounded border p-2 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden">
            <LogConsole />
          </div>
        </div>

        {/* Right: Chapter Editor */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between shrink-0">
            <Label>Chapter Editor</Label>
            <span className="text-xs text-slate-500">Words: {getWordCount(chapterText)}</span>
          </div>
          <Textarea className="flex-1 min-h-[200px] font-mono text-sm" value={chapterText} onChange={(e) => setChapterText(e.target.value)} />
          <div className="flex gap-2 flex-wrap shrink-0">
            <Button size="sm" variant="outline" onClick={async () => { await setChapterContent(currentChapterNum, chapterText); toast({ title: "Chapter Saved" }); }}>Save Chapter</Button>
            <Button size="sm" variant="outline" onClick={runConsistency} disabled={generating}>Consistency</Button>
            <Button size="sm" variant="outline" onClick={importKnowledge} disabled={generating}>Import Knowledge</Button>
            <Button size="sm" variant="outline" onClick={clearVectorStore} disabled={generating}>Clear VectorStore</Button>
            <Button size="sm" variant="outline" onClick={showPlotArcs}>Plot Arcs</Button>
          </div>
        </div>
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
