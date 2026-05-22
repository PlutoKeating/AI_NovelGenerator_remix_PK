import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/Tabs";
import ConfigPanel from "./components/ConfigPanel";
import NovelParams from "./components/NovelParams";
import GenerationPanel from "./components/GenerationPanel";
import ChaptersTab from "./components/ChaptersTab";
import FileEditor from "./components/FileEditor";
import RoleLibrary from "./components/RoleLibrary";
import WebDAVPanel from "./components/WebDAVPanel";
import { ToastProvider } from "./components/ui/Toast";
import { useConfigStore } from "./stores/configStore";

function App() {
  const loadConfig = useConfigStore((s) => s.loadConfig);

  React.useEffect(() => {
    loadConfig();
  }, []);

  return (
    <ToastProvider>
      <div className="h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header className="border-b px-4 py-2 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold">AI Novel Generator</h1>
          <span className="text-xs text-slate-400">React + Vite Edition</span>
        </header>
        <main className="flex-1 overflow-hidden p-2">
          <Tabs defaultValue="generation" className="h-full flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="generation">Generation</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="novel">Novel Params</TabsTrigger>
              <TabsTrigger value="chapters">Chapters</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="roles">Role Library</TabsTrigger>
              <TabsTrigger value="webdav">WebDAV</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-hidden mt-2">
              <TabsContent value="generation" className="h-full"><GenerationPanel /></TabsContent>
              <TabsContent value="config" className="h-full"><ConfigPanel /></TabsContent>
              <TabsContent value="novel" className="h-full"><NovelParams /></TabsContent>
              <TabsContent value="chapters" className="h-full"><ChaptersTab /></TabsContent>
              <TabsContent value="files" className="h-full"><FileEditor /></TabsContent>
              <TabsContent value="roles" className="h-full"><RoleLibrary /></TabsContent>
              <TabsContent value="webdav" className="h-full"><WebDAVPanel /></TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
