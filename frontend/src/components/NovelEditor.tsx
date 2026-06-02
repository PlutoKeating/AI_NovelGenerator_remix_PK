import React from "react";
import { useNovelEditorStore } from "../stores/novelEditorStore";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Label } from "./ui/Label";
import { Input } from "./ui/Input";
import { Badge } from "./ui/Badge";
import { ArrowLeft, Save, Sparkles, Play, Loader2 } from "lucide-react";
import AIDialogModal from "./AIDialogModal";
import { designSystem } from "../designSystem";

interface NovelEditorProps {
  onBack: () => void;
}

const NovelEditor: React.FC<NovelEditorProps> = ({ onBack }) => {
  const store = useNovelEditorStore();
  const currentNovel = store.currentNovel;
  const info = store.info;
  const chapters = store.chapters;
  const selectedChapters = store.selectedChapters;
  const currentChapterContent = store.currentChapterContent;
  const currentChapterNum = store.currentChapterNum;
  const aiDialogOpen = store.aiDialogOpen;
  const aiDialogContext = store.aiDialogContext;

  const [chapterText, setChapterText] = React.useState(currentChapterContent);

  React.useEffect(() => {
    if (currentNovel) {
      store.loadNovelDetail(currentNovel.id);
    }
  }, []);

  React.useEffect(() => {
    setChapterText(currentChapterContent);
  }, [currentChapterContent]);

  if (!currentNovel) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono animate-pulse">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Toolbar */}
      <div className={designSystem.panelHeader}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-zinc-400 hover:text-pink-400">
            <ArrowLeft size={16} />
            返回书架
          </Button>
          <h2 className={designSystem.panelTitle}>{currentNovel.title}</h2>
          <Badge variant="outline" className="text-xs border-fuchsia-950 text-zinc-400">
            {currentNovel.genre || "未分类"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => store.saveInfo()} 
            disabled={store.loading}
            className="gap-1"
          >
            {store.loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存设定
          </Button>
          <Button 
            size="sm" 
            onClick={() => store.generateFullText()} 
            disabled={store.loading}
            className="gap-1 bg-pink-600 hover:bg-pink-500 border-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]"
          >
            {store.loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {store.loading ? "正在生成..." : "生成全文"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden bg-[#0c081d]/30">
        {/* Left Sidebar - Chapters */}
        <div className={designSystem.sidebarBg}>
          <div className={designSystem.sidebarHeader}>
            <span className={designSystem.sidebarTitle}>章节列表</span>
            <span className={designSystem.sidebarCount}>{chapters.length} 章</span>
          </div>
          <div className={designSystem.sidebarList}>
            {chapters.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-4 font-mono">暂无章节</div>
            ) : (
              chapters.map((ch) => {
                const selected = selectedChapters.includes(ch.number);
                const isCurrent = currentChapterNum === ch.number;
                return (
                  <div
                    key={ch.number}
                    className={`
                      flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs
                      transition-colors font-mono
                      ${isCurrent ? designSystem.chapterItemActive : designSystem.chapterItemHover}
                      ${selected ? designSystem.chapterRing : ""}
                    `}
                    onClick={() => {
                      store.selectChapter(ch.number, false);
                      store.loadChapter(ch.number);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        e.stopPropagation();
                        store.selectChapter(ch.number, true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={designSystem.checkboxAccent}
                    />
                    <span className="truncate flex-1">
                      第{ch.number}章 {ch.title}
                    </span>
                    <span className={designSystem.chapterWordCount}>{ch.wordCount}字</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center - Info + Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Info Panel */}
          <div className={designSystem.panelSubHeader}>
            <div className="flex items-center justify-between">
              <h3 className={designSystem.panelSubTitle}>基本信息设定</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-pink-400 hover:text-pink-300"
                  onClick={() => store.openAIDialog("background")}
                  disabled={store.loading}
                >
                  <Sparkles size={12} />
                  AI润色背景
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-pink-400 hover:text-pink-300"
                  onClick={() => store.openAIDialog("characters")}
                  disabled={store.loading}
                >
                  <Sparkles size={12} />
                  AI润色角色
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={designSystem.label}>背景环境</Label>
                <Textarea
                  rows={3}
                  className="mt-1 text-xs"
                  value={info.background}
                  onChange={(e) => store.updateInfo({ background: e.target.value })}
                  placeholder="描述小说的世界观、时代背景、地理环境等..."
                />
              </div>
              <div>
                <Label className={designSystem.label}>人物角色</Label>
                <Textarea
                  rows={3}
                  className="mt-1 text-xs"
                  value={info.characters}
                  onChange={(e) => store.updateInfo({ characters: e.target.value })}
                  placeholder="描述主要角色的姓名、性格、关系等..."
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className={designSystem.label}>篇幅（字/章）</Label>
                <Input
                  type="number"
                  className="mt-1 text-xs cursor-not-allowed opacity-75"
                  value={currentNovel.num_chapters}
                  readOnly
                />
              </div>
              <div>
                <Label className={designSystem.label}>章节数</Label>
                <Input
                  type="number"
                  className="mt-1 text-xs cursor-not-allowed opacity-75"
                  value={currentNovel.num_chapters}
                  readOnly
                />
              </div>
              <div>
                <Label className={designSystem.label}>关键道具</Label>
                <Input
                  className="mt-1 text-xs"
                  value={info.key_items}
                  onChange={(e) => store.updateInfo({ key_items: e.target.value })}
                  placeholder="关键道具..."
                />
              </div>
              <div>
                <Label className={designSystem.label}>场景地点</Label>
                <Input
                  className="mt-1 text-xs"
                  value={info.scene_location}
                  onChange={(e) => store.updateInfo({ scene_location: e.target.value })}
                  placeholder="主要场景..."
                />
              </div>
            </div>
          </div>

          {/* Chapter Editor */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 bg-[#0c081d]/20">
            <div className="flex items-center justify-between mb-2">
              <span className={designSystem.panelSubTitle}>
                第{currentChapterNum}章 编辑
              </span>
              <div className="flex gap-2">
                {selectedChapters.length > 1 && (
                  <Badge variant="outline" className="text-xs border-pink-500/50 text-pink-400 shadow-[0_0_6px_rgba(236,72,153,0.2)]">
                    已选 {selectedChapters.length} 章
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => store.openAIDialog("chapter")}
                  disabled={store.loading}
                >
                  <Sparkles size={12} />
                  AI修改
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => store.saveChapter(currentChapterNum, chapterText)}
                  disabled={store.loading}
                >
                  保存
                </Button>
              </div>
            </div>
            <Textarea
              className="flex-1 text-sm resize-none leading-relaxed"
              value={chapterText}
              onChange={(e) => setChapterText(e.target.value)}
              placeholder="章节内容..."
            />
          </div>
        </div>
      </div>

      {/* AI Dialog Modal */}
      {aiDialogOpen && (
        <AIDialogModal
          open={aiDialogOpen}
          context={aiDialogContext}
          messages={store.aiMessages}
          useAgent={store.aiUseAgent}
          onUseAgentChange={store.setAIUseAgent}
          onClose={store.closeAIDialog}
          onSend={store.sendAIMessage}
          onApply={(text) => {
            if (aiDialogContext === "background") {
              store.updateInfo({ background: text });
            } else if (aiDialogContext === "characters") {
              store.updateInfo({ characters: text });
            } else if (aiDialogContext === "chapter") {
              setChapterText(text);
              store.saveChapter(currentChapterNum, text);
            }
            store.closeAIDialog();
          }}
        />
      )}
    </div>
  );
};

export default NovelEditor;
