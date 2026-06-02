import React from "react";
import { Button } from "./ui/Button";
import { useNovelStore } from "../stores/novelStore";
import { useConfigStore } from "../stores/configStore";
import { ScrollArea } from "./ui/ScrollArea";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Dialog, DialogHeader, DialogTitle } from "./ui/Dialog";
import type { ChapterMetadata } from "../types";

export default function ChaptersTab() {
  const chapters = useNovelStore((s) => s.chapters);
  const chapterMetadata = useNovelStore((s) => s.chapterMetadata);
  const refreshChapters = useNovelStore((s) => s.refreshChapters);
  const loadChapterMetadata = useNovelStore((s) => s.loadChapterMetadata);
  const loadChapter = useNovelStore((s) => s.loadChapter);
  const currentChapterNum = useNovelStore((s) => s.currentChapterNum);
  const setCurrentChapterNum = useNovelStore((s) => s.setCurrentChapterNum);
  const novelPath = useNovelStore((s) => s.novelPath);
  const config = useConfigStore((s) => s.config);

  const [previewMeta, setPreviewMeta] = React.useState<ChapterMetadata | null>(null);

  React.useEffect(() => {
    refreshChapters();
    loadChapterMetadata();
  }, [novelPath]);

  const handleSelect = async (num: string) => {
    setCurrentChapterNum(num);
    await loadChapter(num);
    if (config) {
      useConfigStore.getState().updateOtherParams({ chapter_num: num });
    }
  };

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const avgWords = chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0;

  const getMeta = (num: string) => chapterMetadata.find((m) => m.number === num);

  return (
    <div className="flex flex-col h-full gap-2 p-2">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <Card>
          <CardHeader className="p-2"><CardTitle className="text-xs">Total Chapters</CardTitle></CardHeader>
          <CardContent className="p-2 pt-0"><div className="text-xl font-bold">{chapters.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-2"><CardTitle className="text-xs">Total Words</CardTitle></CardHeader>
          <CardContent className="p-2 pt-0"><div className="text-xl font-bold">{totalWords.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-2"><CardTitle className="text-xs">Avg Words</CardTitle></CardHeader>
          <CardContent className="p-2 pt-0"><div className="text-xl font-bold">{avgWords.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center shrink-0">
        <h3 className="font-semibold">Chapters</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { refreshChapters(); loadChapterMetadata(); }}>Refresh</Button>
        </div>
      </div>

      <ScrollArea className="flex-1 rounded border dark:border-slate-700">
        <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {chapters.length === 0 && <div className="text-sm text-slate-400 col-span-full">No chapters found.</div>}
          {chapters.map((ch) => {
            const meta = getMeta(ch.number);
            return (
              <button
                key={ch.number}
                onClick={() => handleSelect(ch.number)}
                className={`text-left rounded border p-3 transition-colors ${
                  currentChapterNum === ch.number
                    ? "bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold">Chapter {ch.number}</span>
                  <span className="text-xs text-slate-400">{ch.wordCount} words</span>
                </div>
                <div className="text-xs text-slate-500 truncate">{ch.title || "Untitled"}</div>
                {meta && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {meta.role && <Badge variant="outline" className="text-[10px]">{meta.role}</Badge>}
                    {meta.suspenseLevel && <Badge variant="secondary" className="text-[10px]">Suspense: {meta.suspenseLevel}</Badge>}
                    {meta.plotTwistLevel && <Badge variant="secondary" className="text-[10px]">Twist: {meta.plotTwistLevel}</Badge>}
                  </div>
                )}
                {meta?.summary && (
                  <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">{meta.summary}</div>
                )}
                {meta && (
                  <div className="mt-1">
                    <button
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => { e.stopPropagation(); setPreviewMeta(meta); }}
                    >
                      View Details
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {previewMeta && (
        <Dialog open onOpenChange={() => setPreviewMeta(null)}>
          <DialogHeader><DialogTitle>Chapter {previewMeta.number}: {previewMeta.title}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="font-medium">Role:</span> {previewMeta.role}</div>
              <div><span className="font-medium">Suspense:</span> {previewMeta.suspenseLevel}</div>
              <div><span className="font-medium">Twist:</span> {previewMeta.plotTwistLevel}</div>
              <div><span className="font-medium">Foreshadowing:</span> {previewMeta.foreshadowing}</div>
            </div>
            <div><span className="font-medium">Purpose:</span> {previewMeta.purpose}</div>
            <div><span className="font-medium">Summary:</span> {previewMeta.summary}</div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
