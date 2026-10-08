import React, { useState, useEffect, useCallback } from "react";
import {
  Camera,
  Film,
  Upload,
  ClipboardPaste,
  Sparkles,
  History,
  Download,
  Settings,
  Chrome,
  HelpCircle,
  Layers,
  ArrowRight,
  Maximize2,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { OcrResult, PresetSample, CropArea } from "./types";
import { PRESET_SAMPLES } from "./utils/presets";
import { SnippingCanvas } from "./components/SnippingCanvas";
import { VideoPlayerSnipper } from "./components/VideoPlayerSnipper";
import { OcrEditor } from "./components/OcrEditor";
import { HistoryPanel } from "./components/HistoryPanel";
import { ExtensionPackagerModal } from "./components/ExtensionPackagerModal";
import { StoreListingKitModal } from "./components/StoreListingKitModal";
import { ToastContainer, ToastMessage } from "./components/Toast";
import { createThumbnail } from "./utils/imageCropper";
import { i18nData } from "./locales/i18nData";

const STORAGE_KEY = "snaptext_ocr_history_v1";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showStoreKitModal, setShowStoreKitModal] = useState(false);
  const [language, setLanguage] = useState<"zh" | "en" | "ja">("zh");
  const [pureZeroTokenMode, setPureZeroTokenMode] = useState<boolean>(true);

  // Active image in snipping canvas
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(PRESET_SAMPLES[0].imageUrl);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_SAMPLES[0].id);

  // OCR state
  const [ocrMode, setOcrMode] = useState<string>("standard");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<OcrResult | null>(null);

  // History state
  const [history, setHistory] = useState<OcrResult[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
    }

    // Default seeded history from the user's reference samples
    return [
      {
        id: "seed-1",
        title: "股市十条铁律（高对比度视频字牌）",
        text: PRESET_SAMPLES[0].sampleExpectedText || "",
        charCount: PRESET_SAMPLES[0].sampleExpectedText?.length || 0,
        lineCount: 10,
        thumbnailUrl: PRESET_SAMPLES[0].imageUrl,
        timestamp: Date.now() - 3600000 * 2,
        sourceType: "preset",
        isFavorite: true,
      },
      {
        id: "seed-2",
        title: "趋势停顿手写笔记（连笔行书）",
        text: PRESET_SAMPLES[1].sampleExpectedText || "",
        charCount: PRESET_SAMPLES[1].sampleExpectedText?.length || 0,
        lineCount: 8,
        thumbnailUrl: PRESET_SAMPLES[1].imageUrl,
        timestamp: Date.now() - 3600000 * 5,
        sourceType: "preset",
        isFavorite: true,
      },
      {
        id: "seed-3",
        title: "Blue Origin & Jeff Bezos 新闻（红笔高亮重点）",
        text: PRESET_SAMPLES[2].sampleExpectedText || "",
        charCount: PRESET_SAMPLES[2].sampleExpectedText?.length || 0,
        lineCount: 9,
        thumbnailUrl: PRESET_SAMPLES[2].imageUrl,
        timestamp: Date.now() - 3600000 * 12,
        sourceType: "preset",
        isFavorite: false,
      },
    ];
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }, [history]);

  // Set initial active result from first seed
  useEffect(() => {
    if (!activeResult && history.length > 0) {
      setActiveResult(history[0]);
    }
  }, []);

  // Global Paste handler (Ctrl+V / Cmd+V to paste screenshot from clipboard)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                const url = event.target.result as string;
                setCurrentImageSrc(url);
                setSelectedPresetId("");
                setActiveTab("image");
                showToast("已成功从剪贴板粘贴截图！", "success");
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [showToast]);

  // Trigger browser screen/tab/window capture using getDisplayMedia
  const handleScreenCapture = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        showToast("您的浏览器不支持屏幕录制API，请使用上传或剪贴板粘贴", "error");
        return;
      }

      showToast("请在弹出的系统窗口中选择需要截图的标签页、窗口或整个屏幕", "info");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        setTimeout(() => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 1920;
          canvas.height = video.videoHeight || 1080;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/png");
            setCurrentImageSrc(dataUrl);
            setSelectedPresetId("");
            setActiveTab("image");
            showToast("屏幕截图捕获成功！请在画布上划选需要识字的文字区域", "success");
          }

          // Stop all stream tracks
          stream.getTracks().forEach((track) => track.stop());
        }, 300);
      };
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        console.error("Screen capture error:", err);
        showToast("屏幕截图取消或失败", "info");
      }
    }
  };

  // Handle local image file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCurrentImageSrc(event.target.result as string);
          setSelectedPresetId("");
          setActiveTab("image");
          showToast(`已加载图片：${file.name}`, "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Perform OCR call to server `/api/ocr`
  const handleCropAndRecognize = async (
    croppedDataUrl: string,
    mode: string,
    cropInfo?: CropArea,
    forceAi: boolean = false
  ) => {
    setIsLoading(true);

    try {
      const thumbnail = await createThumbnail(croppedDataUrl, 160);

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: croppedDataUrl,
          mode,
          options: {
            pureZeroToken: pureZeroTokenMode && !forceAi,
            forceAi,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "OCR 识别失败");
      }

      const tokenCount = data.tokensUsed || data.usage?.totalTokens || 0;
      const newResult: OcrResult = {
        id: Date.now().toString(),
        text: data.text || "",
        charCount: data.charCount || data.text?.length || 0,
        lineCount: data.lineCount || 1,
        thumbnailUrl: thumbnail,
        timestamp: Date.now(),
        sourceType: activeTab === "video" ? "video" : cropInfo ? "screen" : "image",
        title:
          forceAi
            ? (language === "en" ? "AI Enhanced Extraction" : language === "ja" ? "AI深層抽出" : "AI 深度增强提取")
            : activeTab === "video"
            ? (language === "en" ? "Video Frame" : language === "ja" ? "動画フレーム" : "视频帧提取")
            : cropInfo
            ? (language === "en" ? `Area Crop (${cropInfo.width}×${cropInfo.height})` : language === "ja" ? `選択範囲 (${cropInfo.width}×${cropInfo.height})` : `区域截选 (${cropInfo.width}×${cropInfo.height})`)
            : (language === "en" ? "Full Image" : language === "ja" ? "画像全体" : "全图提取"),
        mode,
        tokensUsed: tokenCount,
      };

      // Auto-copy to clipboard
      if (data.text) {
        navigator.clipboard.writeText(data.text).catch(() => {});
      }

      setActiveResult(newResult);
      setHistory((prev) => [newResult, ...prev.slice(0, 99)]);
      showToast(
        tokenCount > 0
          ? (language === "en" ? `Extracted! Consumed ${tokenCount} Tokens, auto-copied.` : language === "ja" ? `抽出成功！${tokenCount} トークン消費、クリップボードにコピー済` : `文字提取成功！消耗 ${tokenCount} Tokens，已自动复制到剪贴板`)
          : (language === "en" ? "Extracted! 0 Token consumed, auto-copied." : language === "ja" ? "抽出成功！0 トークン消費、クリップボードにコピー済" : "文字提取成功！0 Token 消耗，已自动复制到剪贴板"),
        "success"
      );
    } catch (err: any) {
      console.error("OCR Request Error:", err);
      showToast(err.message || "OCR 服务处理异常，请检查网络或重试", "error");

      // Graceful fallback for demonstration if API key is not configured
      const fallbackPreset = PRESET_SAMPLES.find((p) => p.id === selectedPresetId);
      if (fallbackPreset?.sampleExpectedText) {
        const fallbackResult: OcrResult = {
          id: Date.now().toString(),
          text: fallbackPreset.sampleExpectedText,
          charCount: fallbackPreset.sampleExpectedText.length,
          lineCount: fallbackPreset.sampleExpectedText.split("\n").length,
          thumbnailUrl: fallbackPreset.imageUrl,
          timestamp: Date.now(),
          sourceType: "preset",
          title: fallbackPreset.title,
        };
        setActiveResult(fallbackResult);
        setHistory((prev) => [fallbackResult, ...prev.slice(0, 99)]);
        showToast("已基于示例预设还原文字内容，供实时编辑与复制", "info");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // AI Enhancement handler
  const handleTriggerAiEnhance = () => {
    if (!activeResult) return;
    const imgToUse = activeResult.thumbnailUrl || currentImageSrc;
    showToast(language === "en" ? "✨ AI enhancement in progress..." : language === "ja" ? "✨ AI深層解析を実行中..." : "✨ 正在调用大模型进行深度解析与排版...", "info");
    handleCropAndRecognize(imgToUse, "markdown_structured", undefined, true);
  };

  // Video frame captured -> send to Snipping Canvas or OCR
  const handleCaptureVideoFrame = (frameDataUrl: string, autoCropSubtitle: boolean = false) => {
    setCurrentImageSrc(frameDataUrl);
    setSelectedPresetId("");
    setActiveTab("image");

    if (autoCropSubtitle) {
      showToast("已提取视频字幕区域，正在进行智能识别...", "info");
      handleCropAndRecognize(frameDataUrl, "standard");
    } else {
      showToast("已抓取视频当前帧！请在画面上框选字幕、数据表或文字区域", "success");
    }
  };

  // Update text in active editor
  const handleUpdateText = (newText: string) => {
    if (!activeResult) return;
    const updated = {
      ...activeResult,
      text: newText,
      charCount: newText.length,
      lineCount: newText ? newText.split("\n").filter((l) => l.trim().length > 0).length : 0,
    };
    setActiveResult(updated);
  };

  // Save changes to history item
  const handleSaveToHistory = (resultToSave: OcrResult) => {
    setHistory((prev) => {
      const exists = prev.some((h) => h.id === resultToSave.id);
      if (exists) {
        return prev.map((h) => (h.id === resultToSave.id ? resultToSave : h));
      } else {
        return [resultToSave, ...prev];
      }
    });
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    if (activeResult?.id === id) {
      setActiveResult(null);
    }
    showToast("已删除该条历史记录", "info");
  };

  const handleToggleFavorite = (id: string) => {
    setHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, isFavorite: !h.isFavorite } : h))
    );
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    setActiveResult(null);
    showToast("已清空所有历史识字档案", "info");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Camera className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  SnapText OCR
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  Chrome 插件 & 工作台
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                视频/图片划选截图 • 毫秒级提取 • 一键复制 • 历史记录保存
              </p>
            </div>
          </div>

          {/* Core Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Real Screen Snip */}
            <button
              onClick={handleScreenCapture}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30 transition-all active:scale-95"
              title="调用浏览器屏幕捕获，截取任意窗口、标签页或视频"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">屏幕截取识字</span>
              <span className="sm:hidden">截屏</span>
            </button>

            {/* Upload image */}
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">上传图片</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            {/* Paste from clipboard tip */}
            <button
              onClick={() => showToast("快捷提示：在页面任意位置直接按 Ctrl+V 或 Cmd+V 即可粘贴截图", "info")}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
              title="支持全局 Ctrl+V / Cmd+V 粘贴"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]">按 Ctrl+V 粘贴</span>
            </button>

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs outline-none cursor-pointer hover:bg-slate-700 transition-colors font-medium"
              title="切换语言 (Language)"
            >
              <option value="zh">🇨🇳 简体中文</option>
              <option value="en">🇺🇸 English</option>
              <option value="ja">🇯🇵 日本語</option>
            </select>

            {/* Chrome Extension Packager Modal Trigger */}
            <button
              onClick={() => setShowExtensionModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm transition-all"
            >
              <Chrome className="w-4 h-4 text-emerald-400" />
              <span>{language === "en" ? "Chrome Extension" : language === "ja" ? "Chrome 拡張" : "Chrome 插件包"}</span>
            </button>

            {/* Store Listing & SEO Kit Modal Trigger */}
            <button
              onClick={() => setShowStoreKitModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm transition-all"
              title="Chrome 商店上架资料、多语言 SEO 文案与排名攻略"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">
                {language === "en" ? "Store SEO Kit" : language === "ja" ? "SEO・公開資料" : "上架资料与 SEO"}
              </span>
              <span className="sm:hidden">SEO</span>
            </button>

            {/* Mobile History Toggle */}
            <button
              onClick={() => setShowHistoryMobile(!showHistoryMobile)}
              className="xl:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="打开历史档案"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* Mode Selector & Quick Presets Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
          {/* Main Workspace Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("image")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "image"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>划选截图识字工作台</span>
            </button>

            <button
              onClick={() => setActiveTab("video")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "video"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>视频画面与字幕截取</span>
            </button>
          </div>

          {/* Pure 0 Token Mode Switch */}
          <label
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs cursor-pointer select-none shrink-0 hover:border-slate-700 transition-colors"
            title={i18nData[language]?.mode?.freeTooltip || i18nData.zh.mode.freeTooltip}
          >
            <input
              type="checkbox"
              checked={pureZeroTokenMode}
              onChange={(e) => setPureZeroTokenMode(e.target.checked)}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <span className={pureZeroTokenMode ? "text-emerald-400 font-semibold" : "text-slate-400"}>
              {i18nData[language]?.mode?.freeToggle || i18nData.zh.mode.freeToggle}
            </span>
          </label>

          {/* Presets Gallery (Image 1, 2, 3 as requested) */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <span className="text-[11px] font-medium text-slate-400 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-400 inline mr-1" />
              {language === "en" ? "Test Presets:" : language === "ja" ? "サンプル:" : "快速测试预设："}
            </span>
            {PRESET_SAMPLES.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setCurrentImageSrc(preset.imageUrl);
                  setSelectedPresetId(preset.id);
                  setActiveTab("image");
                  showToast(`已载入：${preset.title}`, "info");
                }}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                  selectedPresetId === preset.id
                    ? "bg-slate-800 text-blue-300 border-blue-500/50 shadow-sm"
                    : "bg-slate-950/70 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
                }`}
                title={preset.description}
              >
                <img
                  src={preset.imageUrl}
                  alt={preset.title}
                  className="w-4 h-4 rounded object-cover border border-slate-700"
                />
                <span>{preset.title.split("：")[1] || preset.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3-Column / 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[580px]">
          {/* Left Column (Canvas or Video) - 7 cols on LG, 6 on XL */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col h-full min-h-[460px]">
            {activeTab === "image" ? (
              <SnippingCanvas
                imageSrc={currentImageSrc}
                onCropAndRecognize={handleCropAndRecognize}
                isLoading={isLoading}
                ocrMode={ocrMode}
                setOcrMode={setOcrMode}
              />
            ) : (
              <VideoPlayerSnipper onCaptureFrame={handleCaptureVideoFrame} />
            )}
          </div>

          {/* Center Column: OCR Result Editor - 6 cols on LG, 4 on XL */}
          <div className="lg:col-span-6 xl:col-span-4 flex flex-col h-full min-h-[460px]">
            <OcrEditor
              result={activeResult}
              onUpdateText={handleUpdateText}
              onSaveToHistory={handleSaveToHistory}
              onShowToast={showToast}
              isLoading={isLoading}
              onTriggerAiEnhance={handleTriggerAiEnhance}
              language={language}
            />
          </div>

          {/* Right Column: History Archive - 3 cols on XL (collapsible on mobile/tablet) */}
          <div
            className={`xl:col-span-3 flex flex-col h-full min-h-[460px] ${
              showHistoryMobile ? "block" : "hidden xl:block"
            }`}
          >
            <HistoryPanel
              history={history}
              activeId={activeResult?.id}
              onSelectHistory={(item) => {
                setActiveResult(item);
                if (item.thumbnailUrl) {
                  setCurrentImageSrc(item.thumbnailUrl);
                }
                showToast("已载入该条历史识别结果", "info");
              }}
              onDeleteHistory={handleDeleteHistory}
              onToggleFavorite={handleToggleFavorite}
              onClearAll={handleClearAllHistory}
              onShowToast={showToast}
            />
          </div>
        </div>

        {/* Bottom Feature Guide / Extension highlight bar */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>支持中英文印刷体、手写笔记、视频动态字幕高精提取</span>
            </div>
            <span className="hidden sm:inline text-slate-700">•</span>
            <div>自动清理换行与空格排版</div>
            <span className="hidden sm:inline text-slate-700">•</span>
            <div>本地 IndexedDB / LocalStorage 历史持久保存</div>
          </div>

          <button
            onClick={() => setShowExtensionModal(true)}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
          >
            <span>如何把此工具安装到 Chrome 浏览器插件栏？</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      {/* Chrome Extension Packager & Install Modal */}
      <ExtensionPackagerModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
        onShowToast={showToast}
        onOpenStoreKit={() => {
          setShowExtensionModal(false);
          setShowStoreKitModal(true);
        }}
      />

      {/* Store Listing & SEO Kit Modal */}
      <StoreListingKitModal
        isOpen={showStoreKitModal}
        onClose={() => setShowStoreKitModal(false)}
        onShowToast={showToast}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
