/* Shared pipeline-step runner.
 *
 * Encapsulates the highly-repetitive pattern seen in GenerationPanel:
 * 1. addTask
 * 2. setGenerating(true) + setPipelineStatus("running") + setPipelineStep(step)
 * 3. addLog("info")
 * 4. try { await apiFn() } catch { … } finally { setGenerating(false) }
 * 5. updateTask + addLog + toast on both success and error paths
 */
import { useCallback, useState } from "react";
import { toast } from "../components/ui/Toast";
import { useGenerationStore } from "../stores/generationStore";
import type { TaskType } from "../types";

interface RunOptions {
  stepNum?: number | null;
  taskType: TaskType;
  taskMessage: string;
  logStart: string;
  logSuccess: string;
  logError: string;
  toastTitle: string;
  toastErrorTitle: string;
  onSuccess?: () => void | Promise<void>;
}

export function usePipelineStep() {
  const addTask = useGenerationStore((s) => s.addTask);
  const updateTask = useGenerationStore((s) => s.updateTask);
  const addLog = useGenerationStore((s) => s.addLog);
  const setPipelineStep = useGenerationStore((s) => s.setPipelineStep);
  const setPipelineStatus = useGenerationStore((s) => s.setPipelineStatus);

  const [generating, setGenerating] = useState(false);

  const runStep = useCallback(
    async (apiFn: () => Promise<unknown>, opts: RunOptions) => {
      const taskId = addTask({
        type: opts.taskType,
        status: "running",
        message: opts.taskMessage,
      });
      setGenerating(true);
      setPipelineStatus("running");
      if (opts.stepNum !== undefined && opts.stepNum !== null) {
        setPipelineStep(opts.stepNum);
      }
      addLog(opts.logStart, "info");

      try {
        await apiFn();
        updateTask(taskId, {
          status: "succeeded",
          message: opts.logSuccess,
        });
        setPipelineStatus("completed");
        addLog(opts.logSuccess, "success");
        toast({ title: opts.toastTitle });
        await opts.onSuccess?.();
      } catch (e: any) {
        const err = e.response?.data?.detail || e.message || "请求失败";
        updateTask(taskId, { status: "failed", message: err });
        setPipelineStatus("error");
        addLog(`${opts.logError}: ${err}`, "error");
        toast({
          title: opts.toastErrorTitle,
          description: err,
          variant: "destructive",
        });
      } finally {
        setGenerating(false);
      }
    },
    [addTask, updateTask, addLog, setPipelineStep, setPipelineStatus]
  );

  return { runStep, generating };
}
