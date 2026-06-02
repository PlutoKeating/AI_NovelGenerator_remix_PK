import React from "react";
import { ScrollArea } from "./ui/ScrollArea";
import { useGenerationStore } from "../stores/generationStore";

const LogConsole: React.FC = () => {
  const logs = useGenerationStore((s) => s.logs);
  const clearLogs = useGenerationStore((s) => s.clearLogs);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColor = (level: string) => {
    switch (level) {
      case "success": return "text-green-600 dark:text-green-400";
      case "error": return "text-red-600 dark:text-red-400";
      case "warning": return "text-amber-600 dark:text-amber-400";
      default: return "text-slate-700 dark:text-slate-300";
    }
  };

  return (
    <div className="flex flex-col h-full rounded border dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between px-2 py-1 border-b dark:border-slate-700 bg-white dark:bg-slate-950">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Console Logs</span>
        <button onClick={clearLogs} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">Clear</button>
      </div>
      <ScrollArea ref={scrollRef} className="flex-1 p-2 font-mono text-xs">
        {logs.length === 0 && <span className="text-slate-400">Logs will appear here...</span>}
        {logs.map((log) => (
          <div key={log.id} className={`${levelColor(log.level)} mb-0.5`}>
            <span className="opacity-60 mr-1">[{log.time}]</span>
            {log.message}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};

export default LogConsole;
