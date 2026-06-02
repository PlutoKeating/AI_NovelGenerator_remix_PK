import React from "react";
import { useGenerationStore } from "../stores/generationStore";
import { Badge } from "./ui/Badge";

const STEPS = [
  { key: 1, label: "Step 1: Architecture", desc: "Generate novel architecture" },
  { key: 2, label: "Step 2: Blueprint", desc: "Generate chapter blueprint" },
  { key: 3, label: "Step 3: Draft", desc: "Generate chapter draft" },
  { key: 4, label: "Step 4: Finalize", desc: "Finalize chapter & update memory" },
];

const PipelineStatus: React.FC = () => {
  const currentStep = useGenerationStore((s) => s.currentPipelineStep);
  const pipelineStatus = useGenerationStore((s) => s.pipelineStatus);

  const stepBadge = (stepKey: number) => {
    if (currentStep === stepKey && pipelineStatus === "running") {
      return <Badge variant="secondary" className="animate-pulse">Running</Badge>;
    }
    if (currentStep !== null && stepKey < currentStep) {
      return <Badge variant="default" className="bg-green-600">Done</Badge>;
    }
    if (currentStep === stepKey && pipelineStatus === "error") {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (currentStep === stepKey && pipelineStatus === "completed") {
      return <Badge variant="default" className="bg-green-600">Done</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-2">
      {STEPS.map((step, idx) => (
        <div key={step.key} className="flex items-center gap-3">
          <div className={`
            flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold
            ${currentStep !== null && step.key <= currentStep
              ? "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900"
              : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }
          `}>
            {step.key}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{step.label}</span>
              {stepBadge(step.key)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{step.desc}</div>
          </div>
          {idx < STEPS.length - 1 && (
            <div className="absolute left-4 ml-0 mt-8 h-4 w-[1px] bg-slate-300 dark:bg-slate-700" />
          )}
        </div>
      ))}
    </div>
  );
};

export default PipelineStatus;
