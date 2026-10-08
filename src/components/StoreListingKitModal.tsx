import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Globe,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  ShieldCheck,
  Key,
  ExternalLink,
  Layers,
  Search,
  Eye,
  Award,
} from "lucide-react";

interface StoreListingKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
}

export const StoreListingKitModal: React.FC<StoreListingKitModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<"copy" | "seo" | "graphics">("copy");
  const [selectedLang, setSelectedLang] = useState<"zh_CN" | "en" | "ja">("zh_CN");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = async (text: string, keyName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      onShowToast(`已复制到剪贴板！`, "success");
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      onShowToast("复制失败", "error");
    }
  };

  const storeCopies = {
    zh_CN: {
      langName: "🇨🇳 简体中文 (大中华区)",
      name: "SnapText OCR - 截图识字与 AI 深度文字提取",
      summary: "划选屏幕秒级提取文字并自动复制到剪贴板！0-Token 基础快速模式 + AI 深度增强，支持网页、公式与视频当前帧字幕抓取。",
      keywords: "OCR, 截图识字, 文字提取, 截图转文字, 视频字幕提取, 图片识字, 禁止复制, 屏幕文字识别, AI OCR, Gemini Vision, Markdown, 生产力工具",
      description: `⚡ 还在手动抄写网页不可复制的文本、视频字幕或表格吗？
SnapText OCR 是您浏览器中最敏捷、最强大的截图识字与 AI 智能排版助手！只需轻轻一划，或按下快捷键 Alt+Shift+S，屏幕上的任意文字即可瞬间提取并自动同步至剪贴板，彻底告别繁琐的手动打字！

🌟 为什么全球专业人士都选择 SnapText OCR？

1. 🟢 0-Token 基础极速识别（完全免费 · 永无配额焦虑）
- 日常截图提取毫秒级秒出，纯离线/快速通道不消耗大模型 Token！
- 无论是网页禁止复制的文章、图片内文字还是网页报错提示，秒级复制。

2. ✨ AI 深度增强排版与纠错（按需自主唤起）
- 遇到复杂表格、手写行书、数学公式或倾斜模糊图片？
- 点击浮窗内的「✨ AI 深度增强」按钮，即刻调用尖端 Vision 大模型进行智能标点纠错、段落梳理与标准 Markdown 结构化输出。

3. 🎬 视频当前帧一键字幕抓取
- 鼠标悬停在 Bilibili、YouTube 或任意 HTML5 视频画面上，即可看到「视频识字」徽标。
- 一键捕获当前高清画面并自动识别字幕，制作学习笔记或会议纪要效率提升 10 倍！

4. 📝 连续追加写字板模式（Scratchpad Mode）
- 勾选「连续追加写字板」后，连续多次截取的文字会自动换行追加合并，绝不会冲掉上一段文本，查资料写论文一气呵成。

5. 📌 100% 常驻防误触浮窗
- 独创常驻拖动工作台，绝不在用户切换网页时意外关闭！
- 支持最小化为轻量悬浮胶囊，任务在后台无损保持，随时展开继续编辑。

6. 🔒 隐私第一 · 纯本地存储
- 您的识别历史与 Token 消耗统计仅存储在您本地浏览器的 Chrome Local Storage 中，绝不上载第三方服务器，安全无忧。

7. 🛠️ 自由接入多模型 API Key
- 支持自带 Google Gemini、OpenAI (GPT-4o)、DeepSeek、通义千问等个人 API Key，额度透明可见，消费明明白白。

---
⌨️ 常用快捷键：
- 启动划选截图：Alt + Shift + S（Mac 上为 Command + Shift + S）
- 退出划选模式：ESC

让每一次截屏都变成触手可及的文字生产力。立即免费安装 SnapText OCR！`,
    },
    en: {
      langName: "🇺🇸 English (Global / US / EU)",
      name: "SnapText OCR - Screenshot to Text & AI Extractor",
      summary: "Snip any screen area to extract text & auto-copy to clipboard. Fast 0-Token mode + AI Smart Enhance for web, formulas, and video frames.",
      keywords: "screenshot to text, OCR, screen snip OCR, text extractor, copy protected text, video subtitle OCR, image to text, Gemini OCR, handwritten OCR, markdown extractor, productivity",
      description: `⚡ Still manually retyping uncopyable text, video subtitles, or complex data tables?
SnapText OCR is the ultimate browser extension for instant screen capture and optical character recognition. Simply snip any area or hit Alt+Shift+S — extracted text is automatically copied to your clipboard in milliseconds!

🌟 Top Features You Will Love:

1. 🟢 0-Token Fast Standard Mode (100% Free · Zero Quota Anxiety)
- Lightning-fast extraction in under 1 second without consuming any AI tokens.
- Works perfectly for uncopyable websites, error logs, PDFs, and slide decks.

2. ✨ AI Smart Enhance on Demand
- Encountering messy layouts, handwritten notes, tables, or math formulas?
- Click "✨ AI Smart Enhance" to invoke cutting-edge Vision models for deep error correction, punctuation cleanup, and clean Markdown formatting.

3. 🎬 Instant Video Frame Subtitle Snip
- Hover over any HTML5 video (YouTube, Vimeo, webinars) and click "Video Snip".
- Capture crisp video text and subtitles without pausing or tedious typing!

4. 📝 Continuous Scratchpad Append Mode
- Enable append mode to accumulate multiple snips into a unified notes pad without losing previous snippets.

5. 📌 Persistent, Non-Intrusive Floating Workspace
- Draggable and sticky: never disappears accidentally when you click outside!
- Minimize to a discreet floating pill while browsing other tabs, with zero loss of task state.

6. 🔒 Privacy-First & Local Storage
- All snip history and token logs stay 100% in your local Chrome browser storage. No unauthorized cloud telemetry.

7. 🛠️ Multi-Provider Bring-Your-Own-Key (BYOK) Support
- Connect your own Google Gemini, OpenAI (GPT-4o), DeepSeek, or custom endpoints with full token consumption transparency.

---
⌨️ Default Shortcuts:
- Snip area: Alt + Shift + S (Command + Shift + S on Mac)
- Cancel: ESC

Supercharge your reading, studying, and coding workflow. Install SnapText OCR today!`,
    },
    ja: {
      langName: "🇯🇵 日本語 (高付加価値ビジネス市場)",
      name: "SnapText OCR - 画面キャプチャ文字起こし＆AI構造化",
      summary: "画面をドラッグ選択するだけで瞬時に文字起こし＆自動クリップボードコピー！0トークン高速モード＋AI推敲機能。動画字幕や表組みも即時テキスト化。",
      keywords: "OCR, 文字起こし, 画面キャプチャ, 画像テキスト化, コピーガード解除, 動画字幕抽出, テキスト抽出, 翻訳支援, Gemini, 業務効率化, プロダクティビティ",
      description: `⚡ コピー禁止のWebサイトや画像、動画の字幕を手入力で書き写していませんか？
「SnapText OCR」は、ブラウザ内のあらゆる文字をワンアクションで高精度にテキスト化し、瞬時にクリップボードへ自動コピーする最新鋭の拡張機能です。

ショートカットキー「Alt + Shift + S」を押してドラッグするだけで、瞬時に文字を抽出。日々の情報収集やビジネス業務の効率を劇的に向上させます。

🌟 SnapText OCR が選ばれる理由：

1. 🟢 トークン消費ゼロの超高速モード（完全無料・回数無制限）
- 通常の文字抽出はAIモデルを消費しない「0-Token高速モード」で動作。
- 1秒未満の爆速レスポンスで、Webページのコピーガードや画像内の文章を即座にテキスト化します。

2. ✨ ワンクリックで呼び出す「AI高度推敲・構造化」
- 複雑な表組み、崩れたレイアウト、手書き文字、数式も高精度解析。
- 「✨ AI高度推敲」ボタンを押した時だけ最新のAIビジョンモデルが起動し、綺麗なMarkdown形式や自然な日本語に整形します。

3. 🎬 動画の字幕・スライドをワンクリック抽出
- YouTubeや社内研修動画などの画面上にマウスを合わせると「動画識字」ボタンが出現。
- 現在のフレームから字幕やプレゼン資料の文字を一瞬でキャプチャできます。

4. 📝 連続追記スクラッチパッド機能
- 複数箇所を連続でキャプチャしても前の文章が消えず、改行してどんどん追记。レポート作成や論文調査に最適です。

5. 📌 消えない安心設計・ドラッグ移動対応
- 誤って別のタブをクリックしても作業画面が勝手に消えない常駐型フローティングパネル。
- 画面端の小さなカプセルに最小化でき、作業の邪魔になりません。

6. 🔒 安心のプライバシー保護・完全ローカル保存
- 抽出した履歴データやトークン使用量はブラウザ内のローカルストレージにのみ保存され、第三者のサーバーに送信されることはありません。

7. 🛠️ 各種AI APIキー（BYOK）に対応
- Google Gemini、OpenAI、DeepSeekなどのAPI Keyを自由に設定可能。使用したトークン数はリアルタイムで透明に表示されます。

---
⌨️ ショートカットキー：
- 範囲選択の開始：Alt + Shift + S（Macは Command + Shift + S）
- キャンセル：ESC

ビジネス、学術研究、プログラミングの作業効率を今すぐ最大化しましょう。SnapText OCR をぜひお試しください！`,
    },
  };

  const currentCopy = storeCopies[selectedLang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Chrome Web Store 上架资产与 SEO 营销中心
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                  多语言 + SEO 优化套件
                </span>
              </div>
              <p className="text-xs text-slate-400">
                针对全球 Chrome 网上应用店高权重排名精心调优的元数据、多语言描述与视觉素材规范
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab("copy")}
            className={`flex items-center gap-2 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === "copy"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>多语言上架文案 (Copywriting)</span>
          </button>

          <button
            onClick={() => setActiveTab("seo")}
            className={`flex items-center gap-2 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === "seo"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>SEO 排名提权策略 (Rank Playbook)</span>
          </button>

          <button
            onClick={() => setActiveTab("graphics")}
            className={`flex items-center gap-2 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === "graphics"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>宣传素材与截图规格 (Visual Assets)</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "copy" && (
            <div className="space-y-6">
              {/* Language Switcher */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-400">选择发布目标市场语言：</span>
                <div className="flex items-center gap-2">
                  {(["zh_CN", "en", "ja"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setSelectedLang(l)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedLang === l
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {storeCopies[l].langName}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Extension Name */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">扩展名称 (Name)</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {currentCopy.name.length} / 45 字符（符合限制）
                    </span>
                  </div>
                  <button
                    onClick={() => copyText(currentCopy.name, "name")}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {copiedKey === "name" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "name" ? "已复制" : "一键复制"}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-200 bg-slate-900 px-3 py-2.5 rounded-lg border border-slate-800">
                  {currentCopy.name}
                </div>
              </div>

              {/* 2. Short Summary */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">简短说明 (Summary)</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {currentCopy.summary.length} / 132 字符（首屏吸睛）
                    </span>
                  </div>
                  <button
                    onClick={() => copyText(currentCopy.summary, "summary")}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {copiedKey === "summary" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "summary" ? "已复制" : "一键复制"}</span>
                  </button>
                </div>
                <div className="text-xs text-slate-300 bg-slate-900 px-3 py-2.5 rounded-lg border border-slate-800 leading-relaxed">
                  {currentCopy.summary}
                </div>
              </div>

              {/* 3. SEO Keywords */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">精准搜索关键词与标签 (SEO Keywords)</span>
                  <button
                    onClick={() => copyText(currentCopy.keywords, "keywords")}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {copiedKey === "keywords" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "keywords" ? "已复制" : "一键复制"}</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-amber-300/90 bg-slate-900 px-3 py-2.5 rounded-lg border border-slate-800 leading-relaxed">
                  {currentCopy.keywords}
                </div>
              </div>

              {/* 4. Full Store Description */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">详细说明 (Full Store Description)</span>
                    <span className="text-[10px] text-slate-400">富文本结构化排版 · 重点前置</span>
                  </div>
                  <button
                    onClick={() => copyText(currentCopy.description, "desc")}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {copiedKey === "desc" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "desc" ? "已复制完整描述" : "一键复制完整说明"}</span>
                  </button>
                </div>
                <pre className="text-xs font-sans text-slate-300 bg-slate-900 p-4 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {currentCopy.description}
                </pre>
              </div>

              {/* 5. Permissions Rationale for Review */}
              <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-200">Google 官方审核权限声明模版 (Privacy Rationale)</span>
                  </div>
                  <button
                    onClick={() =>
                      copyText(
                        `1. activeTab: Required to capture the visible tab screenshot when user explicitly triggers the snipping shortcut (Alt+Shift+S) or clicks extension action.
2. scripting: Used to inject selection overlay onto the current webpage only when user requests an OCR snip.
3. storage: Used to store user preferences, history, and token metrics strictly in local storage (chrome.storage.local).
4. clipboardWrite: Essential feature to automatically write recognized text to system clipboard upon successful extraction.`,
                        "perms"
                      )
                    }
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {copiedKey === "perms" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>复制审核申报说明</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  在 Chrome 开发者后台填写「隐私权实践 (Privacy Practices)」时直接粘贴，确保 100% 快速过审。
                </p>
              </div>
            </div>
          )}

          {activeTab === "seo" && (
            <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
              {/* Playbook Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <TrendingUp className="w-4 h-4" />
                    <span>法则 1：标题 25 字符前置核心大词</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Chrome 搜索结果列表中，超过 30 字符的标题会被截断为省略号。必须把 <strong className="text-white">“OCR”</strong>、<strong className="text-white">“截图识字”</strong> 或 <strong className="text-white">“Screenshot to Text”</strong> 紧随产品名放在前 25 字符内。
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <Eye className="w-4 h-4" />
                    <span>法则 2：前 3 行“折叠线 (Fold)”痛点吸睛</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    商店详情页默认只展示前 3 行文字（约 180 字符），超过部分需点击“展开更多”。切忌第一段写公司介绍，直接以“还在手动抄写网页无法复制的文字吗？”痛点开篇！
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Globe className="w-4 h-4" />
                    <span>法则 3：多语言独立 Listing 权重翻倍</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Chrome Web Store 会对已上传本地化语言（如日文、英文）的插件给予该国用户搜索优先曝光。日文区拥有极高付费意愿与企业端合规需求，务必上传日文独立文案！
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold">
                    <Award className="w-4 h-4" />
                    <span>法则 4：权限精简换取“Featured 精选徽章”</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Google 会为权限少、符合 Manifest V3 且隐私申明规范的插件打上“Featured”蓝色推荐徽章。SnapText 仅申请 4 项必要权限，完全契合精选评定标准。
                  </p>
                </div>
              </div>

              {/* Review Process Checklist */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-200">🚀 开发者后台提交检查清单 (Submission Checklist)</span>
                <div className="space-y-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>已下载最新版 <code className="text-blue-300">snaptext-ocr-chrome-extension.zip</code> 扩展包</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>已准备好 128x128 像素的扩展高清透明图标</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>已分别填写中文、英文、日文三种语言的商店名称、摘要与长描述</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>隐私权政策中勾选“不收集任何用户个人身份数据 (Does not collect user data)”</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "graphics" && (
            <div className="space-y-6">
              <div className="text-xs text-slate-400">
                Chrome Web Store 官方规定截图尺寸为 <strong className="text-white">1280 × 800 像素</strong>（或 640 × 400）。以下为 4 套高转化率的核心卖点宣传图规划：
              </div>

              {/* Graphic Mockup Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mockup 1 */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
                  <div className="aspect-[16/10] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-slate-700/60 rounded-lg p-3 flex flex-col justify-between relative shadow-inner">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 截图 1：0-Token 极速划选
                      </span>
                      <span className="text-blue-300 bg-blue-900/40 px-1.5 py-0.5 rounded font-mono">1280 × 800</span>
                    </div>

                    <div className="my-auto text-center space-y-1">
                      <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-200">
                        ⚡ 划选屏幕 · 秒级自动复制
                      </div>
                      <div className="text-[10px] text-emerald-300 font-medium">
                        🟢 0-Token 基础极速模式 · 完全免费无额度焦虑
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded p-2 text-[9px] text-slate-300 flex items-center justify-between">
                      <span>✓ 识别文字已自动写入剪贴板</span>
                      <span className="text-emerald-400 font-bold">0 Tokens</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-200">核心诉求：</strong> 突出日常文字提取零延迟、免 Token 消耗与一键自动复制到剪贴板。
                  </div>
                </div>

                {/* Mockup 2 */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
                  <div className="aspect-[16/10] bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border border-slate-700/60 rounded-lg p-3 flex flex-col justify-between relative shadow-inner">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span> 截图 2：AI 深度增强
                      </span>
                      <span className="text-purple-300 bg-purple-900/40 px-1.5 py-0.5 rounded font-mono">1280 × 800</span>
                    </div>

                    <div className="my-auto text-center space-y-1">
                      <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-pink-200">
                        ✨ AI 深度增强 · 格式一网打尽
                      </div>
                      <div className="text-[10px] text-purple-300 font-medium">
                        复杂表格 · 手写行书 · 数学公式 ➜ 标准 Markdown
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded p-2 text-[9px] text-slate-300 flex items-center justify-between">
                      <span>✨ 调用 Vision 大模型深度解析</span>
                      <span className="text-purple-400 font-bold">~250 Tokens</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-200">核心诉求：</strong> 解决疑难图片、公式与手写笔记的结构化排版，按需调用大模型。
                  </div>
                </div>

                {/* Mockup 3 */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
                  <div className="aspect-[16/10] bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 border border-slate-700/60 rounded-lg p-3 flex flex-col justify-between relative shadow-inner">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span> 截图 3：视频当前帧字幕识字
                      </span>
                      <span className="text-cyan-300 bg-cyan-900/40 px-1.5 py-0.5 rounded font-mono">1280 × 800</span>
                    </div>

                    <div className="my-auto text-center space-y-1">
                      <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-200">
                        🎬 视频字幕与画面文字抓取
                      </div>
                      <div className="text-[10px] text-cyan-300 font-medium">
                        鼠标悬停即刻抓帧 · 网课笔记与外语学习神器
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded p-2 text-[9px] text-slate-300 flex items-center justify-between">
                      <span>YouTube / Bilibili / 网课视频直接识图</span>
                      <span className="text-cyan-400 font-bold">1-Click</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-200">核心诉求：</strong> 独家视频抓屏识字，提升学生、研究员和内容创作者的做笔记效率。
                  </div>
                </div>

                {/* Mockup 4 */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
                  <div className="aspect-[16/10] bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-slate-700/60 rounded-lg p-3 flex flex-col justify-between relative shadow-inner">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 截图 4：隐私第一与多模型
                      </span>
                      <span className="text-emerald-300 bg-emerald-900/40 px-1.5 py-0.5 rounded font-mono">1280 × 800</span>
                    </div>

                    <div className="my-auto text-center space-y-1">
                      <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-white to-teal-200">
                        🔒 本地永久存储 · 隐私无忧
                      </div>
                      <div className="text-[10px] text-emerald-300 font-medium">
                        支持个人 Key · Gemini / OpenAI / DeepSeek
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded p-2 text-[9px] text-slate-300 flex items-center justify-between">
                      <span>数据仅保存在浏览器本地，永不上载</span>
                      <span className="text-emerald-400 font-bold">100% Local</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-200">核心诉求：</strong> 数据不出本地，消除企业与个人对数据泄露的担忧，支持自带 API Key。
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>完整上架指南文档已同步保存至根目录 CHROME_WEB_STORE_SUBMISSION_GUIDE_AND_SEO.md</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors"
          >
            关闭面板
          </button>
        </div>
      </div>
    </div>
  );
};
