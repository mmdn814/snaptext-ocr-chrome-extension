import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  Camera,
  RotateCcw,
  SkipBack,
  SkipForward,
  Upload,
  Film,
  Sparkles,
  Info,
} from "lucide-react";
import { captureVideoFrame } from "../utils/imageCropper";

interface VideoPlayerSnipperProps {
  onCaptureFrame: (frameDataUrl: string, autoCropSubtitles?: boolean) => void;
}

export const VideoPlayerSnipper: React.FC<VideoPlayerSnipperProps> = ({ onCaptureFrame }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasSimRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [isSimulatedVideo, setIsSimulatedVideo] = useState(true);

  // Simulated video canvas animation loop
  useEffect(() => {
    if (!isSimulatedVideo) return;
    const canvas = canvasSimRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const subtitles = [
      "1. 市场趋势分析：连续三日成交量放大，突破颈线阻力位",
      "2. 资金动向监控：主力资金大单净流入 68.5 亿元，计算机与芯片领涨",
      "3. 核心买卖策略：不盲目追高，等待分时均线回踩确认后再行介入",
      "4. 风险控制要点：严格设置5%止损线，严禁重仓单一题材",
      "5. 行业研报摘要：人工智能与低空经济迎来政策催化，订单持续放量",
    ];

    const renderFrame = () => {
      if (isPlaying) {
        t += 0.03;
        setCurrentTime((prev) => (prev >= 25 ? 0 : prev + 0.03));
      }

      const w = canvas.width;
      const h = canvas.height;

      // Dark trading terminal background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, h - 80);
        ctx.stroke();
      }
      for (let y = 60; y < h - 80; y += 40) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w - 40, y);
        ctx.stroke();
      }

      // Title bar
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, 40);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("LIVE 盘中实时交易内参 | 证券代码 600519 研判直播", 20, 26);

      // Watermark timestamp
      ctx.fillStyle = "#64748b";
      ctx.font = "12px monospace";
      const now = new Date();
      ctx.fillText(`录像时间: ${now.toLocaleTimeString()}.${Math.floor((t * 100) % 100)}`, w - 210, 26);

      // Draw dynamic candlestick chart
      const barCount = 18;
      const barWidth = 14;
      const startX = 60;
      for (let i = 0; i < barCount; i++) {
        const x = startX + i * 28;
        const seed = Math.sin(i * 1.5 + t * 0.5) * 50 + 180;
        const open = seed;
        const close = seed + Math.cos(i * 2 + t) * 35;
        const isUp = close >= open;

        ctx.strokeStyle = isUp ? "#ef4444" : "#22c55e";
        ctx.fillStyle = isUp ? "#ef4444" : "#22c55e";

        // Wick
        ctx.beginPath();
        ctx.moveTo(x + barWidth / 2, Math.min(open, close) - 15);
        ctx.lineTo(x + barWidth / 2, Math.max(open, close) + 15);
        ctx.stroke();

        // Body
        ctx.fillRect(x, Math.min(open, close), barWidth, Math.max(4, Math.abs(close - open)));
      }

      // Moving trend line
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < barCount; i++) {
        const x = startX + i * 28 + barWidth / 2;
        const y = Math.sin(i * 1.5 + t * 0.5) * 50 + 175;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Right-side metrics board
      ctx.fillStyle = "#1e293b";
      ctx.roundRect(w - 220, 60, 190, 170, 8);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("实时行情看板", w - 205, 85);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.fillText("当前价格: ", w - 205, 115);
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 14px monospace";
      ctx.fillText("¥ 1,842.50 (+2.38%)", w - 145, 115);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.fillText("成交额: ", w - 205, 145);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "12px monospace";
      ctx.fillText("42.8 亿元", w - 145, 145);

      ctx.fillStyle = "#94a3b8";
      ctx.fillText("主力净买: ", w - 205, 175);
      ctx.fillStyle = "#ef4444";
      ctx.fillText("+6.32 亿元", w - 145, 175);

      ctx.fillStyle = "#94a3b8";
      ctx.fillText("换手率: ", w - 205, 205);
      ctx.fillStyle = "#f8fafc";
      ctx.fillText("1.85%", w - 145, 205);

      // Subtitle banner at bottom of video
      const subIndex = Math.floor(t * 0.4) % subtitles.length;
      const currentSub = subtitles[subIndex];

      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.fillRect(20, h - 68, w - 40, 48);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1;
      ctx.strokeRect(20, h - 68, w - 40, 48);

      ctx.fillStyle = "#facc15";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(currentSub, w / 2, h - 38);
      ctx.textAlign = "start";

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isSimulatedVideo]);

  const handleCapture = (autoCropSubtitle: boolean = false) => {
    let dataUrl = "";
    if (isSimulatedVideo && canvasSimRef.current) {
      if (autoCropSubtitle) {
        // Crop subtitle banner specifically
        const cvs = canvasSimRef.current;
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cvs.width - 40;
        cropCanvas.height = 54;
        const ctx = cropCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(cvs, 20, cvs.height - 70, cvs.width - 40, 54, 0, 0, cropCanvas.width, cropCanvas.height);
          dataUrl = cropCanvas.toDataURL("image/png");
        }
      } else {
        dataUrl = canvasSimRef.current.toDataURL("image/png");
      }
    } else if (videoRef.current) {
      dataUrl = captureVideoFrame(videoRef.current);
    }

    if (dataUrl) {
      onCaptureFrame(dataUrl, autoCropSubtitle);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setIsSimulatedVideo(false);
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-200">视频字幕与画面截取识字</h3>
              <span className="text-[11px] px-2 py-0.5 bg-purple-900/40 text-purple-300 border border-purple-700/40 rounded-full font-medium">
                {isSimulatedVideo ? "演示直播视频流" : "本地视频已加载"}
              </span>
            </div>
            <p className="text-xs text-slate-400">播放到目标画面时暂停，一键截取当帧字幕或图表提取文本</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>打开本地视频 (.mp4/.webm)</span>
            <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleFileUpload} />
          </label>

          {!isSimulatedVideo && (
            <button
              onClick={() => {
                setVideoSrc(null);
                setIsSimulatedVideo(true);
              }}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              返回演示视频
            </button>
          )}
        </div>
      </div>

      {/* Video / Canvas Stage */}
      <div className="relative bg-black flex items-center justify-center p-4 min-h-[380px]">
        {isSimulatedVideo ? (
          <canvas
            ref={canvasSimRef}
            width={720}
            height={380}
            className="w-full max-w-[720px] aspect-video rounded-xl shadow-2xl border border-slate-800/80 bg-slate-950"
          />
        ) : (
          <video
            ref={videoRef}
            src={videoSrc || ""}
            className="w-full max-w-[720px] aspect-video rounded-xl shadow-2xl bg-black"
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) setDuration(videoRef.current.duration);
            }}
          />
        )}

        {/* Hover quick capture badge in top right (simulating the Chrome extension experience!) */}
        <div className="absolute top-7 right-7">
          <button
            onClick={() => handleCapture(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-medium rounded-lg border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Chrome 插件同款：鼠标悬浮视频画面时一键截图识字"
          >
            <Camera className="w-3.5 h-3.5 text-blue-400" />
            <span>捕获此画面</span>
          </button>
        </div>
      </div>

      {/* Playback Controls & Capture Actions */}
      <div className="flex flex-col gap-3 px-5 py-4 bg-slate-900/90 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Play / Pause / Step Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isSimulatedVideo) {
                  setIsPlaying(!isPlaying);
                } else if (videoRef.current) {
                  if (isPlaying) videoRef.current.pause();
                  else videoRef.current.play();
                  setIsPlaying(!isPlaying);
                }
              }}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={() => {
                if (isSimulatedVideo) setCurrentTime((t) => Math.max(0, t - 1));
                else if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 1);
              }}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="后退1秒"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (isSimulatedVideo) setCurrentTime((t) => Math.min(duration, t + 1));
                else if (videoRef.current)
                  videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 1);
              }}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="前进1秒"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-slate-400 ml-2">
              {Math.floor(currentTime / 60)
                .toString()
                .padStart(2, "0")}
              :
              {Math.floor(currentTime % 60)
                .toString()
                .padStart(2, "0")}{" "}
              /{" "}
              {Math.floor(duration / 60)
                .toString()
                .padStart(2, "0")}
              :
              {Math.floor(duration % 60)
                .toString()
                .padStart(2, "0")}
            </span>
          </div>

          {/* Capture Frame Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleCapture(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all hover:border-amber-500/50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>智能提取视频字幕</span>
            </button>

            <button
              onClick={() => handleCapture(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>截取当前帧并框选识字</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
