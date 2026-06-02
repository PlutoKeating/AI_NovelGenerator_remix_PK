import React from "react";
import { useBookshelfStore } from "../stores/bookshelfStore";
import { Button } from "./ui/Button";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "./ui/Dialog";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { BookPlus, Sparkles } from "lucide-react";
import NovelCard from "./NovelCard";
import { designSystem } from "../designSystem";

interface BookshelfPageProps {
  onOpenNovel: (id: string) => void;
}

const BookshelfPage: React.FC<BookshelfPageProps> = ({ onOpenNovel }) => {
  const novels = useBookshelfStore((s) => s.novels);
  const loading = useBookshelfStore((s) => s.loading);
  const loadNovels = useBookshelfStore((s) => s.loadNovels);
  const createNovel = useBookshelfStore((s) => s.createNovel);
  const deleteNovel = useBookshelfStore((s) => s.deleteNovel);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newGenre, setNewGenre] = React.useState("");
  const [newChapters, setNewChapters] = React.useState(10);

  React.useEffect(() => {
    loadNovels();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createNovel({
      title: newTitle.trim(),
      genre: newGenre,
      num_chapters: newChapters,
    });
    setCreateOpen(false);
    setNewTitle("");
    setNewGenre("");
    setNewChapters(10);
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-fuchsia-950/60 bg-[#110c22]/30">
        <div>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 tracking-wider">我的书架</h1>
          <p className="text-xs text-zinc-500 mt-0.5 font-mono">共 {novels.length} 本作品</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1">
          <BookPlus size={16} />
          新建小说
        </Button>
      </div>

      {/* Bookshelf Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-zinc-500 text-sm font-mono animate-pulse">加载中...</div>
        ) : novels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <BookPlus size={48} className="mb-4 text-pink-500/30 animate-pulse" />
            <p className="font-semibold text-zinc-400">书架空空如也</p>
            <p className="text-xs mt-1 font-mono">点击右上角"新建小说"开始创作</p>
          </div>
        ) : (
          <div className={designSystem.gridContainer}>
            {novels.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                onClick={() => onOpenNovel(novel.id)}
                onDelete={() => deleteNovel(novel.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {createOpen && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogHeader>
            <DialogTitle>
              <Sparkles size={16} className="text-pink-500 animate-pulse" />
              新建小说
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className={designSystem.label}>标题 <span className="text-pink-500">*</span></Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="输入小说标题" />
            </div>
            <div>
              <Label className={designSystem.label}>类型</Label>
              <Input value={newGenre} onChange={(e) => setNewGenre(e.target.value)} placeholder="如：玄幻、科幻、言情..." />
            </div>
            <div>
              <Label className={designSystem.label}>计划章节数</Label>
              <Input type="number" value={newChapters} onChange={(e) => setNewChapters(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>创建</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
};

export default BookshelfPage;
