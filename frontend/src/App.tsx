import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/Tabs";
import BookshelfPage from "./components/BookshelfPage";
import SettingsPage from "./components/SettingsPage";
import NovelEditor from "./components/NovelEditor";
import { ToastProvider } from "./components/ui/Toast";
import { useBookshelfStore } from "./stores/bookshelfStore";
import { useNovelEditorStore } from "./stores/novelEditorStore";
import { designSystem } from "./designSystem";

function App() {
  const [activeTab, setActiveTab] = React.useState("bookshelf");
  const selectedNovelId = useBookshelfStore((s) => s.selectedNovelId);
  const selectNovel = useBookshelfStore((s) => s.selectNovel);
  const loadNovelDetail = useNovelEditorStore((s) => s.loadNovelDetail);

  const handleOpenNovel = async (id: string) => {
    selectNovel(id);
    await loadNovelDetail(id);
  };

  const handleBackToBookshelf = () => {
    selectNovel(null);
  };

  return (
    <ToastProvider>
      <div className={designSystem.appBg}>
        <header className={designSystem.headerBg}>
          <div className="flex items-center gap-2">
            <h1 className={designSystem.titleText}>
              批量生成短中长篇小说生产线
            </h1>
            <span className={designSystem.versionBadge}>
              v2.0
            </span>
          </div>
          <span className={designSystem.metaText}>React + Vite + FastAPI</span>
        </header>

        <main className="flex-1 overflow-hidden">
          {selectedNovelId ? (
            <NovelEditor onBack={handleBackToBookshelf} />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className={designSystem.tabsBg}>
                <TabsList className={designSystem.tabsList}>
                  <TabsTrigger
                    value="bookshelf"
                    className={designSystem.tabsTrigger}
                  >
                    书架
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className={designSystem.tabsTrigger}
                  >
                    设置
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="bookshelf" className="h-full">
                  <BookshelfPage onOpenNovel={handleOpenNovel} />
                </TabsContent>
                <TabsContent value="settings" className="h-full">
                  <SettingsPage />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
