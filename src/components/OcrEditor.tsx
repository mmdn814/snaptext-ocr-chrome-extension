import React, { useState, useEffect } from "react";
import { OcrResult } from "../types";
import {
  Copy,
  Check,
  Download,
  Volume2,
  VolumeX,
  FileText,
  AlignLeft,
  Scissors,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Share2,
  FileSpreadsheet,
} from "lucide-react";

interface OcrEditorProps {
  result: OcrResult | null;
  onUpdateText: (newText: string) => void;
  onSaveToHistory: (result: OcrResult) => void;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
  isLoading: boolean;
  onTriggerAiEnhance?: () => void;
  language?: "zh" | "en" | "ja";
}

export const OcrEditor: React.FC<OcrEditorProps> = ({
  result,
  onUpdateText,
  onSaveToHistory,
  onShowToast,
  isLoading,
  onTriggerAiEnhance,
  language = "zh",
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showOriginalImage, setShowOriginalImage] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Copy to clipboard
  const handleCopy = async (format: "plain" | "json" | "markdown" = "plain") => {
    if (!result?.text) {
      onShowToast("暂无可复制的文本内容", "info");
      return;
    }

    let textToCopy = result.text;
    if (format === "json") {
      textToCopy = JSON.stringify(
        {
          text: result.text,
          charCount: result.text.length,
          timestamp: new Date(result.timestamp).toISOString(),
          source: result.sourceType,
        },
        null,
        2
      );
    } else if (format === "markdown") {
      textToCopy = result.text
        .split("\n")
        .map((line) => (line.trim().length > 0 ? `${line}\n` : ""))
        .join("\n");
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      onShowToast("文本已成功复制到剪贴板！", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard error:", err);
      onShowToast("复制失败，请手动选中文本复制", "error");
    }
  };

  // Merge paragraphs (strip newline within paragraph)
  const handleMergeParagraphs = () => {
    if (!result?.text) return;
    // Keep double newlines, merge single newlines
    const merged = result.text
      .split(/\n\s*\n/)
      .map((para) => para.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ").trim())
      .join("\n\n");
    onUpdateText(merged);
    onShowToast("已自动合并单行换行", "success");
  };

  // Clean redundant whitespace
  const handleCleanSpaces = () => {
    if (!result?.text) return;
    const cleaned = result.text
      .replace(/[ \t]+/g, " ")
      .split("\n")
      .map((l) => l.trim())
      .join("\n");
    onUpdateText(cleaned);
    onShowToast("已清理多余空格与空白字符", "success");
  };

  // Format Chinese punctuation
  const handleFormatPunctuation = () => {
    if (!result?.text) return;
    const formatted = result.text
      .replace(/,/g, "，")
      .replace(/:/g, "：")
      .replace(/;/g, "；")
      .replace(/\?/g, "？")
      .replace(/!/g, "！")
      .replace(/\(/g, "（")
      .replace(/\)/g, "）");
    onUpdateText(formatted);
    onShowToast("已规范化中文标点符号", "success");
  };

  // Download as TXT file
  const handleDownloadTxt = () => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OCR-Text-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast("已导出为 .txt 文件", "success");
  };

  // Download as Markdown file
  const handleDownloadMd = () => {
    if (!result?.text) return;
    const blob = new Blob([`# OCR 识别提取文本\n\n> 提取时间: ${new Date().toLocaleString()}\n\n${result.text}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OCR-Notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast("已导出为 .md Markdown 文件", "success");
  };

  // Text-To-Speech
  const toggleSpeech = () => {
    if (!window.speechSynthesis) {
      onShowToast("当前浏览器不支持语音朗读", "error");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!result?.text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.text);
    // Auto detect language
    if (/[\u4e00-\u9fa5]/.test(result.text)) {
      utterance.lang = "zh-CN";
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    onShowToast("正在朗读文本...", "info");
  };

  const handleSave = () => {
    if (result) {
      onSaveToHistory(result);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      onShowToast("已更新并保存至历史记录", "success");
    }
  };

  // Calculate live statistics
  const text = result?.text || "";
  const charCount = text.length;
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const wordCount = (text.match(/[a-zA-Z0-9_-]+/g) || []).length;
  const lineCount = text ? text.split("\n").filter((l) => l.trim().length > 0).length : 0;

  return (
    <div className="flex flex-col h-full bg-slate-950/70 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header with Title & Big One-Click Copy Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">OCR 识别结果与实时编辑</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>{charCount} 字符</span>
              <span>•</span>
              {chineseCharCount > 0 && <span>{chineseCharCount} 汉字</span>}
              {wordCount > 0 && <span>{wordCount} 英文词</span>}
              <span>•</span>
              <span>{lineCount} 行</span>
              <span>•</span>
              {typeof result?.tokensUsed === "number" && result.tokensUsed > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold" title="本次调用消耗的模型 Token 数量">
                  ⚡ {language === "en" ? `Consumed ${result.tokensUsed} Tokens` : language === "ja" ? `${result.tokensUsed} トークン消費` : `消耗 ${result.tokensUsed} Tokens`}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold" title="未消耗任何模型 Token，完全免费">
                  🟢 {language === "en" ? "0 Token (Free)" : language === "ja" ? "0 トークン (無料)" : "0 Token (免额度)"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: AI Enhance, Copy & Save */}
        <div className="flex flex-wrap items-center gap-2">
          {onTriggerAiEnhance && (
            <button
              onClick={onTriggerAiEnhance}
              disabled={isLoading || !result}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-md shadow-purple-900/30 transition-all active:scale-95 border border-purple-400/30 disabled:opacity-50"
              title="调用大模型进行深度解析与智能排版优化"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {language === "en"
                  ? "✨ AI Enhance (~350 Tok)"
                  : language === "ja"
                  ? "✨ AI高精度強化 (~350 Tok)"
                  : "✨ AI 深度增强 (预估 ~350 Tokens)"}
              </span>
            </button>
          )}

          <button
            onClick={() => handleCopy("plain")}
            disabled={!text}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg active:scale-95 ${
              copied
                ? "bg-emerald-600 text-white shadow-emerald-900/40"
                : text
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 hover:shadow-emerald-600/30"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
            title="一键复制提取到的全部文字至剪贴板"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-200 stroke-[3]" />
                <span>{language === "en" ? "Copied!" : language === "ja" ? "コピー完了！" : "已复制！"}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{language === "en" ? "Copy Text" : language === "ja" ? "テキストをコピー" : "一键复制 (Copy)"}</span>
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={!result}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              isSaved
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="保存当前编辑后的结果至历史记录"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? "已保存" : "保存"}</span>
          </button>
        </div>
      </div>

      {/* Auxiliary Formatting Tools Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleMergeParagraphs}
            disabled={!text}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700/60 transition-colors disabled:opacity-50"
            title="将断裂的单行合并为连续段落"
          >
            <AlignLeft className="w-3 h-3 text-blue-400" />
            <span>合并换行</span>
          </button>

          <button
            onClick={handleCleanSpaces}
            disabled={!text}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700/60 transition-colors disabled:opacity-50"
            title="去除多余的空格与制表符"
          >
            <Scissors className="w-3 h-3 text-amber-400" />
            <span>清理空格</span>
          </button>

          <button
            onClick={handleFormatPunctuation}
            disabled={!text}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700/60 transition-colors disabled:opacity-50"
            title="将英文标点转换为标准全角中文标点"
          >
            <span>，。标点规范</span>
          </button>

          <button
            onClick={toggleSpeech}
            disabled={!text}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors ${
              isSpeaking
                ? "bg-purple-600 text-white border-purple-500 animate-pulse"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60 disabled:opacity-50"
            }`}
            title="语音朗读识别出的文本"
          >
            {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-purple-400" />}
            <span>{isSpeaking ? "停止朗读" : "语音朗读"}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {result?.thumbnailUrl && (
            <button
              onClick={() => setShowOriginalImage(!showOriginalImage)}
              className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-md transition-colors"
              title="切换原图截图对照窗口"
            >
              {showOriginalImage ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showOriginalImage ? "隐藏截图对照" : "截图对照"}</span>
            </button>
          )}

          <button
            onClick={handleDownloadTxt}
            disabled={!text}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
            title="下载为 .txt 纯文本文件"
          >
            .TXT
          </button>
          <button
            onClick={handleDownloadMd}
            disabled={!text}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
            title="下载为 .md Markdown 文件"
          >
            .MD
          </button>
        </div>
      </div>

      {/* Editor & Compare View */}
      <div className="relative flex-1 flex flex-col md:flex-row min-h-[360px] overflow-hidden">
        {/* Source Image Crop Preview (Collapsible) */}
        {showOriginalImage && result?.thumbnailUrl && (
          <div className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 p-3 flex flex-col shrink-0">
            <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center justify-between">
              <span>截图原图对照</span>
              <span className="text-[10px] text-blue-400">核对校准</span>
            </div>
            <div className="flex-1 flex items-center justify-center bg-black/60 rounded-lg p-2 overflow-hidden border border-slate-800/80">
              <img
                src={result.thumbnailUrl}
                alt="截图原图"
                className="max-h-56 max-w-full object-contain rounded"
              />
            </div>
            <div className="mt-2 text-[10px] text-slate-500 text-center">
              识别时间：{new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* Real-Time Editable Textarea */}
        <div className="relative flex-1 flex flex-col h-full bg-slate-950/80">
          <textarea
            value={text}
            onChange={(e) => onUpdateText(e.target.value)}
            placeholder={isLoading ? "AI 引擎正在高精度识别截图中文字..." : "暂无识别文字，请在左侧截取图像或选择示例图片"}
            className="w-full h-full p-4 bg-transparent text-slate-100 placeholder-slate-600 font-sans text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 selection:bg-blue-600 selection:text-white"
            style={{ minHeight: "260px" }}
          />

          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-blue-400 absolute inset-0 m-auto" />
              </div>
              <p className="text-sm font-medium text-slate-300">正在通过 Gemini 多模态视觉模型提取文字...</p>
              <p className="text-xs text-slate-500">毫秒级自动解析排版、标点与语言结构</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom status */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>💡 提示：在此文本框中修改任意字词将实时生效，点击「保存」可固化至历史记录。</span>
        <button
          onClick={() => onUpdateText("")}
          disabled={!text}
          className="text-slate-500 hover:text-rose-400 transition-colors"
          title="清空当前编辑区"
        >
          清空
        </button>
      </div>
    </div>
  );
};
