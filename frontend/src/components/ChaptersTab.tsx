import React from "react";
import { Button } from "./ui/Button";
import { useNovelStore } from "../stores/novelStore";
import { useConfigStore } from "../stores/configStore";
import { ScrollArea } from "./ui/ScrollArea";

export default function ChaptersTab() {
  const chapters = useNovelStore((s) => s.chapters);
  const refreshChapters = useNovelStore((s) => s.refreshChapters);
  const loadChapter = useNovelStore((s) => s.loadChapter);
  const currentChapterNum = useNovelStore((s) => s.currentChapterNum);
  const setCurrentChapterNum = useNovelStore((s) => s.setCurrentChapterNum);
  const novelPath = useNovelStore((s) => s.novelPath);
  const config = useConfigStore((s) => s.config);

  React.useEffect(() => {
    refreshChapters();
  }, [novelPath]);

  const handleSelect = async (num: string) => {
    setCurrentChapterNum(num);
    await loadChapter(num);
    if (config) {
      useConfigStore.getState().updateOtherParams({ chapter_num: num });
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Chapters</h3>
        <Button size="sm" variant="outline" onClick={refreshChapters}>Refresh</Button>
      </div>
      <ScrollArea className="flex-1 rounded border">
        <div className="p-2 space-y-1">
          {chapters.length === 0 && <div className="text-sm text-slate-400">No chapters found.</div>}
          {chapters.map((ch) => (
            <button
              key={ch.number}
              onClick={() => handleSelect(ch.number)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                currentChapterNum === ch.number
                  ? "bg-slate-200 dark:bg-slate-700 font-semibold"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex justify-between">
                <span>Chapter {ch.number}</span>
                <span className="text-xs text-slate-400">{ch.wordCount} words</span>
              </div>
              <div className="text-xs text-slate-500 truncate">{ch.title || "Untitled"}</div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
