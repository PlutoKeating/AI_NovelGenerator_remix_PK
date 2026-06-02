import React from "react";
import { cn } from "../../lib/utils";

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

const TabsContext = React.createContext<{ value: string; onChange: (v: string) => void } | null>(null);

const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onValueChange, children, className }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = value !== undefined ? value : internalValue;
  const handleChange = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value: currentValue, onChange: handleChange }}>
      <div className={cn("", className)}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("inline-flex h-9 items-center justify-center rounded bg-[#140f29] border border-fuchsia-950 p-1 text-zinc-400", className)}>
    {children}
  </div>
);

const TabsTrigger: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  return (
    <button
      onClick={() => ctx.onChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 disabled:pointer-events-none disabled:opacity-50",
        ctx.value === value
          ? "bg-pink-600 text-white shadow-[0_0_8px_rgba(236,72,153,0.4)]"
          : "hover:text-pink-400 hover:bg-[#1c1435]/50",
        className
      )}
    >
      {children}
    </button>
  );
};

const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return <div className={cn("focus-visible:outline-none", className)}>{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
