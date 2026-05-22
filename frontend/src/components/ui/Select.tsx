import React from "react";
import { cn } from "../../lib/utils";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

const SelectContext = React.createContext<{ value: string; onChange: (v: string) => void; open: boolean; setOpen: (v: boolean) => void } | null>(null);

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <SelectContext.Provider value={{ value, onChange: onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  return (
    <button
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300",
        className
      )}
    >
      {children}
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
    </button>
  );
};

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  return <span>{ctx.value || placeholder}</span>;
};

const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx || !ctx.open) return null;
  return (
    <div className={cn("absolute z-50 mt-1 w-full rounded-md border bg-white p-1 shadow-md dark:bg-slate-950 dark:border-slate-800", className)}>
      {children}
    </div>
  );
};

const SelectItem: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  return (
    <div
      onClick={() => { ctx.onChange(value); ctx.setOpen(false); }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800",
        ctx.value === value && "bg-slate-100 dark:bg-slate-800",
        className
      )}
    >
      {children}
    </div>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
