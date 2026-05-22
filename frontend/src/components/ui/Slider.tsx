import React from "react";
import { cn } from "../../lib/utils";

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({ value, min = 0, max = 100, step = 1, onChange, className }) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("w-full accent-slate-900 dark:accent-slate-50", className)}
    />
  );
};

export { Slider };
