import React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

const Progress: React.FC<ProgressProps> = ({ value, max = 100, className, barClassName }) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div
        className={cn("h-full rounded-full bg-slate-900 transition-all dark:bg-slate-50", barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

export { Progress };
