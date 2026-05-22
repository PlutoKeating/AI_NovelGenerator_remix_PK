import React from "react";
import { cn } from "../../lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ checked, onChange, className }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    checked={checked}
    onChange={onChange}
    className={cn(
      "h-4 w-4 rounded border border-slate-300 text-slate-900 focus:ring-slate-950 dark:border-slate-700 dark:text-slate-50",
      className
    )}
  />
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
