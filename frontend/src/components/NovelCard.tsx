import React from "react";
import type { NovelMetadata } from "../types";
import { Badge } from "./ui/Badge";
import { Trash2, BookOpen } from "lucide-react";
import { designSystem } from "../designSystem";

interface NovelCardProps {
  novel: NovelMetadata;
  onClick: () => void;
  onDelete: () => void;
}

const NovelCard: React.FC<NovelCardProps> = ({ novel, onClick, onDelete }) => {
  const [hovered, setHovered] = React.useState(false);

  const statusColor: Record<string, string> = {
    draft: designSystem.statusBadge.draft,
    generating: designSystem.statusBadge.generating,
    completed: designSystem.statusBadge.completed,
  };

  const statusText: Record<string, string> = {
    draft: "草稿",
    generating: "生成中",
    completed: "已完成",
  };

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div
        className={designSystem.novelCard.container(hovered)}
        style={designSystem.novelCard.gradient(hovered)}
      >
        {/* Decorative top band */}
        <div className={designSystem.novelCard.topBand} />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          <BookOpen size={28} className={designSystem.novelCard.icon} />
          <h3 className={designSystem.novelCard.title}>
            {novel.title}
          </h3>
          {novel.genre && (
            <span className={designSystem.novelCard.genre}>{novel.genre}</span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-[#05020c]/90 via-[#05020c]/40 to-transparent">
          <div className="flex items-center justify-between">
            <span className={designSystem.novelCard.footerText}>
              {novel.num_chapters} 章
            </span>
            <span className={designSystem.novelCard.footerText}>
              {novel.word_count.toLocaleString()} 字
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div className={designSystem.novelCard.statusBadge}>
          <Badge className={`text-[9px] px-1.5 py-0 ${statusColor[novel.status] || statusColor.draft}`}>
            {statusText[novel.status] || "草稿"}
          </Badge>
        </div>

        {/* Delete button on hover */}
        {hovered && (
          <button
            className={designSystem.novelCard.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确定要删除《${novel.title}》吗？此操作不可恢复。`)) {
                onDelete();
              }
            }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default NovelCard;
