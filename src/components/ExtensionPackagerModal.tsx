import React, { useState } from "react";
import {
  Download,
  Check,
  Copy,
  ExternalLink,
  Code2,
  Package,
  Layers,
  Sparkles,
  X,
  FileCode,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { getExtensionFiles, downloadExtensionZip, ExtensionFileItem } from "../utils/extensionGenerator";

interface ExtensionPackagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
  onOpenStoreKit?: () => void;
}

export const ExtensionPackagerModal: React.FC<ExtensionPackagerModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onOpenStoreKit,
}) => {
  const [files] = useState<ExtensionFileItem[]>(getExtensionFiles());
  const [activeFile, setActiveFile] = useState<string>("manifest.json");
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const currentFile = files.find((f) => f.name === activeFile) || files[0];

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
      onShowToast("Chrome 插件安装包已成功打包并开始下载！", "success");
    } catch (err) {
      console.error(err);
      onShowToast("打包下载失败，请直接复制源码", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!currentFile) return;
    try {
      await navigator.clipboard.writeText(currentFile.content);
      setCopiedCode(true);
      onShowToast(`已复制 ${currentFile.name} 完整源代码`, "success");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      onShowToast("复制失败", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">SnapText OCR - Chrome 官方扩展程序包 (Manifest V3)</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  已就绪
                </span>
              </div>
              <p className="text-xs text-slate-400">
                完整的 Chrome 扩展代码包，支持网页一键划选、视频当前帧字幕抓取与一键复制
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStoreKit && (
              <button
                onClick={onOpenStoreKit}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-xl transition-all"
                title="查看多语言上架文案、宣传截图规范与 SEO 排名攻略"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">上架资料与 SEO</span>
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-900/40 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? "正在生成 ZIP..." : "一键下载扩展 ZIP"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 30-Second Quick Installation Steps Banner */}
        <div className="px-6 py-3 bg-blue-950/40 border-b border-blue-900/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-blue-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>安装步骤：</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600/40 text-blue-300 flex items-center justify-center font-bold text-[11px]">
                1
              </span>
              解压 ZIP 文件夹
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600/40 text-blue-300 flex items-center justify-center font-bold text-[11px]">
                2
              </span>
              访问 <code className="px-1.5 py-0.5 bg-slate-800 text-blue-300 rounded font-mono">chrome://extensions</code>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600/40 text-blue-300 flex items-center justify-center font-bold text-[11px]">
                3
              </span>
              开启右上角「开发者模式」
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600/40 text-blue-300 flex items-center justify-center font-bold text-[11px]">
                4
              </span>
              点击「加载已解压的扩展程序」
            </span>
          </div>
        </div>

        {/* User feedback improvement banner */}
        <div className="px-6 py-2.5 bg-amber-950/30 border-b border-amber-900/40 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200/90">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[10px]">
              v1.1.0 改进重点
            </span>
            <span>
              已修复 <strong>Alt+Shift+S</strong> 快捷键激活机制；框选识别后浮动工作台<strong>固定常驻</strong>，绝不会自动消失，支持随意拖动，需手动点击「关闭界面」！
            </span>
          </div>
          <span className="text-[11px] text-amber-400/70">
            注：Chrome 限制在 chrome:// 扩展页自身生效，请切换至任意网站按快捷键
          </span>
        </div>

        {/* Source Code Explorer & Tabs */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[380px]">
          {/* File sidebar */}
          <div className="w-full md:w-56 bg-slate-950/80 border-b md:border-b-0 md:border-r border-slate-800 p-3 space-y-1 overflow-y-auto shrink-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
              扩展包文件清单
            </div>
            {files.map((file) => (
              <button
                key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-left transition-colors ${
                  activeFile === file.name
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-200 font-semibold">{currentFile.name}</span>
                <span className="text-[11px] text-slate-500">— {currentFile.description}</span>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "已复制源码" : "复制代码"}</span>
              </button>
            </div>

            <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-300 leading-relaxed bg-slate-950 selection:bg-blue-900/60 selection:text-white">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>兼容 Google Chrome、Microsoft Edge、Brave 等所有 Chromium 内核浏览器</span>
          <button
            onClick={handleDownload}
            className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下载 snaptext-ocr-chrome-extension.zip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
