import React, { useState, useMemo } from "react";
import { OcrResult } from "../types";
import {
  History,
  Search,
  Star,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Download,
  Filter,
  Film,
  Camera,
  FileImage,
  Sparkles,
} from "lucide-react";

interface HistoryPanelProps {
  history: OcrResult[];
  activeId?: string;
  onSelectHistory: (item: OcrResult) => void;
  onDeleteHistory: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onClearAll: () => void;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  activeId,
  onSelectHistory,
  onDeleteHistory,
  onToggleFavorite,
  onClearAll,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered items
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSource = filterSource === "all" || item.sourceType === filterSource;
      const matchesFav = !onlyFavorites || item.isFavorite;

      return matchesSearch && matchesSource && matchesFav;
    });
  }, [history, searchTerm, filterSource, onlyFavorites]);

  const handleCopy = async (e: React.MouseEvent, item: OcrResult) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      onShowToast("已从历史记录一键复制文字！", "success");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      onShowToast("复制失败", "error");
    }
  };

  const handleExportAll = () => {
    if (history.length === 0) return;
    const jsonStr = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snaptext-ocr-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast("已导出全部历史记录备份", "success");
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "video":
        return <Film className="w-3 h-3 text-purple-400" />;
      case "screen":
        return <Camera className="w-3 h-3 text-sky-400" />;
      case "preset":
        return <Sparkles className="w-3 h-3 text-amber-400" />;
      default:
        return <FileImage className="w-3 h-3 text-emerald-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">识字历史档案</h3>
            <span className="text-[11px] text-slate-500 font-mono">共 {history.length} 条记录</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportAll}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="导出历史数据 (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (confirm("确定要清空全部历史记录吗？")) {
                    onClearAll();
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="清空全部历史"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/40 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索历史文字或关键词..."
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {["all", "screen", "video", "image"].map((src) => (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterSource === src
                    ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {src === "all" ? "全部" : src === "screen" ? "截屏" : src === "video" ? "视频" : "图片"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              onlyFavorites
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Star className={`w-3 h-3 ${onlyFavorites ? "fill-amber-400 text-amber-400" : ""}`} />
            <span>收藏</span>
          </button>
        </div>
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 text-xs">
            <History className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
            <p>暂无符合条件的历史识字记录</p>
            <p className="text-[11px] text-slate-600 mt-1">识字提取成功后将自动保存在此处</p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isActive = item.id === activeId;
            return (
              <div
                key={item.id}
                onClick={() => onSelectHistory(item)}
                className={`group relative flex flex-col gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/30"
                    : "bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                {/* Top Row: Thumbnail + Source Tag + Star */}
                <div className="flex items-start gap-2.5">
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt="截图"
                      className="w-12 h-10 object-cover rounded-md border border-slate-800 shrink-0 bg-black/40"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {getSourceIcon(item.sourceType)}
                        <span className="font-medium text-slate-300 truncate max-w-[120px]">
                          {item.title || "截图识字"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(item.id);
                          }}
                          className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                            item.isFavorite ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                          }`}
                          title="标记为收藏"
                        >
                          <Star className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-amber-400" : ""}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistory(item.id);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                          title="删除此记录"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(item.timestamp).toLocaleString("zh-CN", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* Text snippet preview */}
                <p className="text-xs text-slate-300 line-clamp-3 font-sans leading-relaxed break-all">
                  {item.text}
                </p>

                {/* Bottom stats and One-Click Copy */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                  <span className="font-mono text-slate-500">{item.charCount} 字</span>

                  <button
                    onClick={(e) => handleCopy(e, item)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      copiedId === item.id
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white"
                    }`}
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-200" />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>一键复制</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
