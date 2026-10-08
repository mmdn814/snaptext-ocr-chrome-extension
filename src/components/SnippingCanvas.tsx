import React, { useState, useRef, useEffect, useCallback } from "react";
import { CropArea } from "../types";
import { cropImage } from "../utils/imageCropper";
import {
  Crop,
  Maximize2,
  RotateCcw,
  Sparkles,
  Loader2,
  ZoomIn,
  ZoomOut,
  Highlighter,
  SlidersHorizontal,
} from "lucide-react";

interface SnippingCanvasProps {
  imageSrc: string;
  onCropAndRecognize: (croppedDataUrl: string, mode: string, cropInfo?: CropArea) => void;
  isLoading: boolean;
  ocrMode: string;
  setOcrMode: (mode: string) => void;
}

export const SnippingCanvas: React.FC<SnippingCanvasProps> = ({
  imageSrc,
  onCropAndRecognize,
  isLoading,
  ocrMode,
  setOcrMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Crop area in natural image pixels
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Moving / Resizing states
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number; crop: CropArea } | null>(null);

  // Zoom scale
  const [zoom, setZoom] = useState<number>(1);

  // Reset crop when source image changes
  useEffect(() => {
    setCrop(null);
    setZoom(1);
  }, [imageSrc]);

  // Convert client coordinates to image natural pixel coordinates
  const getNaturalCoords = useCallback(
    (clientX: number, clientY: number) => {
      const img = imageRef.current;
      if (!img) return { x: 0, y: 0 };
      const rect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;

      const x = Math.max(0, Math.min(img.naturalWidth, (clientX - rect.left) * scaleX));
      const y = Math.max(0, Math.min(img.naturalHeight, (clientY - rect.top) * scaleY));

      return { x: Math.round(x), y: Math.round(y) };
    },
    []
  );

  // Convert natural crop to displayed percentage / pixel coordinates on the element
  const getRenderStyle = () => {
    const img = imageRef.current;
    if (!img || !crop || img.naturalWidth === 0 || img.naturalHeight === 0) {
      return { display: "none" };
    }

    const leftPct = (crop.x / img.naturalWidth) * 100;
    const topPct = (crop.y / img.naturalHeight) * 100;
    const widthPct = (crop.width / img.naturalWidth) * 100;
    const heightPct = (crop.height / img.naturalHeight) * 100;

    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLoading) return;
    // Don't start drawing if clicking on handle or toolbar
    if ((e.target as HTMLElement).closest(".crop-handle") || (e.target as HTMLElement).closest(".crop-inner")) {
      return;
    }

    const coords = getNaturalCoords(e.clientX, e.clientY);
    setIsDrawing(true);
    setDrawStart(coords);
    setCrop({
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLoading) return;

    if (isDrawing && drawStart) {
      const current = getNaturalCoords(e.clientX, e.clientY);
      const x = Math.min(drawStart.x, current.x);
      const y = Math.min(drawStart.y, current.y);
      const width = Math.abs(current.x - drawStart.x);
      const height = Math.abs(current.y - drawStart.y);

      setCrop({ x, y, width, height });
    } else if (activeHandle && dragStartPos) {
      const img = imageRef.current;
      if (!img) return;
      const current = getNaturalCoords(e.clientX, e.clientY);
      const dx = current.x - dragStartPos.x;
      const dy = current.y - dragStartPos.y;
      const orig = dragStartPos.crop;

      let newX = orig.x;
      let newY = orig.y;
      let newW = orig.width;
      let newH = orig.height;

      if (activeHandle === "move") {
        newX = Math.max(0, Math.min(img.naturalWidth - orig.width, orig.x + dx));
        newY = Math.max(0, Math.min(img.naturalHeight - orig.height, orig.y + dy));
      } else {
        if (activeHandle.includes("w")) {
          newX = Math.max(0, Math.min(orig.x + orig.width - 20, orig.x + dx));
          newW = orig.width - (newX - orig.x);
        }
        if (activeHandle.includes("e")) {
          newW = Math.max(20, Math.min(img.naturalWidth - orig.x, orig.width + dx));
        }
        if (activeHandle.includes("n")) {
          newY = Math.max(0, Math.min(orig.y + orig.height - 20, orig.y + dy));
          newH = orig.height - (newY - orig.y);
        }
        if (activeHandle.includes("s")) {
          newH = Math.max(20, Math.min(img.naturalHeight - orig.y, orig.height + dy));
        }
      }

      setCrop({ x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setDrawStart(null);
      if (crop && (crop.width < 10 || crop.height < 10)) {
        setCrop(null); // Ignore tiny click
      }
    }
    setActiveHandle(null);
    setDragStartPos(null);
  };

  const startHandleDrag = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (!crop) return;
    setActiveHandle(handle);
    const coords = getNaturalCoords(e.clientX, e.clientY);
    setDragStartPos({ x: coords.x, y: coords.y, crop: { ...crop } });
  };

  const selectFullImage = () => {
    const img = imageRef.current;
    if (!img) return;
    setCrop({
      x: 0,
      y: 0,
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  const resetCrop = () => {
    setCrop(null);
  };

  const handleConfirmOcr = async () => {
    if (isLoading) return;
    const img = imageRef.current;
    if (!img) return;

    let targetCrop = crop;
    if (!targetCrop || targetCrop.width < 10 || targetCrop.height < 10) {
      // If no selection or small, recognize entire image
      targetCrop = {
        x: 0,
        y: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    }

    try {
      const croppedUrl = await cropImage(imageSrc, targetCrop);
      onCropAndRecognize(croppedUrl, ocrMode, targetCrop);
    } catch (err) {
      console.error("Failed to crop image:", err);
      // Fallback to full image
      onCropAndRecognize(imageSrc, ocrMode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Crop className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-slate-200">划选截图区域</span>
          <span className="hidden sm:inline-block text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md">
            按住鼠标拖拽即可框选文字
          </span>
        </div>

        {/* OCR Mode Select */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setOcrMode("standard")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                ocrMode === "standard"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="完整保留原文字排版与顺序"
            >
              通用排版
            </button>
            <button
              onClick={() => setOcrMode("highlight_only")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                ocrMode === "highlight_only"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="精准提取图片中被红/黄记号笔高亮的部分"
            >
              <Highlighter className="w-3 h-3" />
              仅高亮重点
            </button>
            <button
              onClick={() => setOcrMode("merge_paragraphs")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                ocrMode === "merge_paragraphs"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="自动合并折行断句，适合小说与长文"
            >
              智能合并
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/50">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded"
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-400 px-1 font-mono">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative flex-1 overflow-auto flex items-center justify-center p-4 select-none cursor-crosshair bg-radial from-slate-900 via-slate-950 to-black"
        style={{ minHeight: "360px" }}
      >
        <div
          className="relative transition-transform duration-75 inline-block max-w-full shadow-2xl rounded-lg overflow-hidden border border-slate-800"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="待识别源图"
            className="block max-h-[62vh] max-w-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* Dimmed Overlay when crop exists */}
          {crop && crop.width > 0 && crop.height > 0 && (
            <div
              className="absolute inset-0 bg-black/45 pointer-events-none"
              style={{
                clipPath: `polygon(
                  0% 0%, 0% 100%, 100% 100%, 100% 0%,
                  0% 0%,
                  ${getRenderStyle().left} ${getRenderStyle().top},
                  calc(${getRenderStyle().left} + ${getRenderStyle().width}) ${getRenderStyle().top},
                  calc(${getRenderStyle().left} + ${getRenderStyle().width}) calc(${getRenderStyle().top} + ${getRenderStyle().height}),
                  ${getRenderStyle().left} calc(${getRenderStyle().top} + ${getRenderStyle().height}),
                  ${getRenderStyle().left} ${getRenderStyle().top}
                )`,
              }}
            />
          )}

          {/* Active Crop Box */}
          {crop && crop.width > 0 && crop.height > 0 && (
            <div
              className="absolute border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20 group"
              style={getRenderStyle()}
            >
              {/* Inner draggable area */}
              <div
                className="crop-inner absolute inset-0 cursor-move bg-blue-500/10"
                onMouseDown={(e) => startHandleDrag(e, "move")}
              />

              {/* Dimension tag */}
              <div className="absolute -top-7 left-0 bg-blue-600 text-white text-[11px] font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                {crop.width} × {crop.height} px
              </div>

              {/* 8 Resize Handles */}
              {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => {
                let positionClasses = "";
                if (handle === "nw") positionClasses = "-top-1.5 -left-1.5 cursor-nwse-resize";
                if (handle === "n") positionClasses = "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize";
                if (handle === "ne") positionClasses = "-top-1.5 -right-1.5 cursor-nesw-resize";
                if (handle === "e") positionClasses = "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize";
                if (handle === "se") positionClasses = "-bottom-1.5 -right-1.5 cursor-nwse-resize";
                if (handle === "s") positionClasses = "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize";
                if (handle === "sw") positionClasses = "-bottom-1.5 -left-1.5 cursor-nesw-resize";
                if (handle === "w") positionClasses = "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize";

                return (
                  <div
                    key={handle}
                    onMouseDown={(e) => startHandleDrag(e, handle)}
                    className={`crop-handle absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-sm z-30 shadow-sm ${positionClasses}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={selectFullImage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            全图选择
          </button>
          {crop && (
            <button
              onClick={resetCrop}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              清除选框
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {crop ? `已框选区域 (${crop.width}×${crop.height})` : "未选区将识别全图"}
          </span>

          <button
            onClick={handleConfirmOcr}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg ${
              isLoading
                ? "bg-blue-600/50 text-blue-200 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-blue-900/30 hover:shadow-blue-600/40"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>智能识字中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{crop ? "提取选区文字 (OCR)" : "提取整图文字 (OCR)"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
