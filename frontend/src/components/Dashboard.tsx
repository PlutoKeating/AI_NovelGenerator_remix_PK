import React from "react";
import { useConfigStore } from "../stores/configStore";
import { useGenerationStore } from "../stores/generationStore";
import { useNovelStore } from "../stores/novelStore";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Progress } from "./ui/Progress";

import { ScrollArea } from "./ui/ScrollArea";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const config = useConfigStore((s) => s.config);
  const { complete, missing } = useConfigStore((s) => s.isConfigComplete)();
  const tasks = useGenerationStore((s) => s.tasks);
  const logs = useGenerationStore((s) => s.logs);
  const pipelineStatus = useGenerationStore((s) => s.pipelineStatus);
  const currentStep = useGenerationStore((s) => s.currentPipelineStep);
  const novelPath = useNovelStore((s) => s.novelPath);
  const chapters = useNovelStore((s) => s.chapters);

  const llmCount = config ? Object.keys(config.llm_configs).length : 0;
  const embCount = config ? Object.keys(config.embedding_configs).length : 0;

  const latestTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {novelPath ? `Project: ${novelPath}` : "No project path set"}
          </p>
        </div>
        <div className="flex gap-2">
          {complete ? (
            <Badge variant="default" className="bg-green-600">Ready</Badge>
          ) : (
            <Badge variant="destructive">Incomplete</Badge>
          )}
        </div>
      </div>

      {/* Config Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">LLM Configs</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold">{llmCount}</div>
            <div className="text-xs text-slate-500">{llmCount > 0 ? "Configured" : "Missing"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Embedding</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold">{embCount}</div>
            <div className="text-xs text-slate-500">{embCount > 0 ? "Configured" : "Missing"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Chapters</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold">{chapters.length}</div>
            <div className="text-xs text-slate-500">Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold capitalize">{pipelineStatus}</div>
            <div className="text-xs text-slate-500">
              {currentStep ? `Step ${currentStep}` : "Idle"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missing Configs */}
      {!complete && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader className="p-3">
            <CardTitle className="text-sm text-red-800 dark:text-red-200">Missing Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-2">
              {missing.map((m: string) => (
                <Badge key={m} variant="destructive">{m}</Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => onNavigate("config")}>Go to Config</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate("novel")}>Go to Novel Setup</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onNavigate("pipeline")}>Open Pipeline</Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("chapters")}>View Chapters</Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("architecture")}>Edit Architecture</Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("blueprint")}>Edit Blueprint</Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("roles")}>Role Library</Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest Task + Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Latest Task</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {latestTask ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{latestTask.type}</span>
                  <Badge variant={latestTask.status === "succeeded" ? "default" : latestTask.status === "failed" ? "destructive" : "secondary"}>
                    {latestTask.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">{latestTask.message}</div>
                {latestTask.progress !== undefined && <Progress value={latestTask.progress} max={100} />}
              </div>
            ) : (
              <div className="text-sm text-slate-400">No tasks yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Recent Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 flex-1">
            <ScrollArea className="h-32 text-xs font-mono">
              {logs.slice(-10).map((log) => (
                <div key={log.id} className="mb-0.5 text-slate-600 dark:text-slate-400">
                  <span className="opacity-60">[{log.time}]</span> {log.message}
                </div>
              ))}
              {logs.length === 0 && <span className="text-slate-400">No logs</span>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
