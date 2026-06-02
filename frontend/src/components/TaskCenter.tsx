import React from "react";
import { useTaskStore } from "../stores/taskStore";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Progress } from "./ui/Progress";
import { RefreshCw, Trash2, XCircle } from "lucide-react";
import type { GenerationTask } from "../types";

const statusConfig: Record<
  GenerationTask["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; barClassName: string }
> = {
  pending: { label: "Pending", variant: "secondary", barClassName: "bg-zinc-400" },
  running: { label: "Running", variant: "default", barClassName: "bg-pink-500" },
  succeeded: { label: "Succeeded", variant: "outline", barClassName: "bg-cyan-500" },
  failed: { label: "Failed", variant: "destructive", barClassName: "bg-red-500" },
  cancelled: { label: "Cancelled", variant: "destructive", barClassName: "bg-red-400" },
};

function formatTime(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString();
}

function duration(start?: number, end?: number): string {
  if (!start) return "—";
  const ms = (end || Date.now()) - start;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

const TaskCenter: React.FC = () => {
  const { tasks, loading, fetchTasks, cancelTask, clearCompleted, removeTask } = useTaskStore();

  React.useEffect(() => {
    fetchTasks();
    const id = setInterval(fetchTasks, 3000);
    return () => clearInterval(id);
  }, [fetchTasks]);

  const pendingRunning = tasks.filter((t) => t.status === "pending" || t.status === "running");
  const completed = tasks.filter((t) => t.status !== "pending" && t.status !== "running");

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-zinc-300">Task Center</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={fetchTasks} disabled={loading} className="h-7 px-2 text-zinc-400 hover:text-pink-400">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          {completed.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearCompleted} className="h-7 px-2 text-zinc-400 hover:text-red-400">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-2 pr-1">
        {tasks.length === 0 && (
          <div className="text-xs text-zinc-500 text-center py-4 font-mono">No tasks</div>
        )}

        {tasks.map((task) => {
          const cfg = statusConfig[task.status];
          return (
            <div
              key={task.id}
              className="rounded border border-fuchsia-950/60 bg-[#110c22]/60 p-2.5 space-y-1.5 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={cfg.variant} className="shrink-0">
                    {cfg.label}
                  </Badge>
                  <span className="text-xs font-mono text-zinc-300 truncate capitalize">
                    {task.type}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(task.status === "pending" || task.status === "running") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelTask(task.id)}
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400"
                    >
                      <XCircle size={14} />
                    </Button>
                  )}
                  {task.status !== "pending" && task.status !== "running" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeTask(task.id)}
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>

              {task.progress !== undefined && task.progress > 0 && (
                <Progress value={task.progress * 100} max={100} barClassName={cfg.barClassName} />
              )}

              <p className="text-[10px] text-zinc-400 font-mono truncate">{task.message}</p>

              <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                <span>Created {formatTime(task.createdAt)}</span>
                <span>Duration {duration(task.startedAt, task.finishedAt)}</span>
              </div>

              {task.error && (
                <div className="text-[10px] text-red-300 bg-red-950/30 border border-red-900/40 rounded px-1.5 py-1 font-mono">
                  {task.error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between shrink-0 text-[10px] text-zinc-500 font-mono">
        <span>Active {pendingRunning.length}</span>
        <span>Total {tasks.length}</span>
      </div>
    </div>
  );
};

export default TaskCenter;
