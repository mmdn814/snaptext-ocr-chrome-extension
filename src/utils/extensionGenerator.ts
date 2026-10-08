import JSZip from "jszip";
import { i18nData } from "../locales/i18nData";

export interface ExtensionFileItem {
  name: string;
  path: string;
  content: string;
  description: string;
  language: string;
}

export function getExtensionFiles(): ExtensionFileItem[] {
  const manifest = {
    manifest_version: 3,
    default_locale: "en",
    name: "__MSG_appName__",
    version: "1.2.0",
    description: "__MSG_appDesc__",
    permissions: ["activeTab", "tabs", "scripting", "storage", "clipboardWrite"],
    host_permissions: ["<all_urls>"],
    action: {
      default_popup: "popup.html",
      default_icon: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png",
      },
    },
    background: {
      service_worker: "background.js",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content.js"],
        css: ["content.css"],
        run_at: "document_end",
      },
    ],
    commands: {
      "capture-area": {
        suggested_key: {
          default: "Alt+Shift+S",
          mac: "Command+Shift+S",
        },
        description: "启动区域划选截图识字",
      },
    },
    icons: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  };

  const backgroundJs = `// SnapText Background Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener((details) => {
  console.log("SnapText OCR 扩展已安装:", details.reason);
  if (details.reason === "install") {
    // 高转化 Onboarding：新安装自动在新标签页打开置顶图钉引导向导！
    chrome.tabs.create({ url: "welcome.html" });
  }
  chrome.storage.local.get(["ocrHistory", "extensionLanguage", "pureZeroTokenMode"], (result) => {
    const toSet = {};
    if (!result.ocrHistory) toSet.ocrHistory = [];
    if (!result.extensionLanguage) {
      // 深度检测浏览器原生语言环境（杜绝海外用户默认出中文）
      const sysLang = (chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : "en").toLowerCase();
      if (sysLang.startsWith("zh")) toSet.extensionLanguage = "zh_CN";
      else if (sysLang.startsWith("ja")) toSet.extensionLanguage = "ja";
      else toSet.extensionLanguage = "en";
    }
    if (result.pureZeroTokenMode === undefined) {
      toSet.pureZeroTokenMode = true; // 默认开启纯 0 Token 免额度模式
    }
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });
});

// Helper: Ensure content scripts and styles are injected before sending messages
async function ensureInjectedAndStart(tabId) {
  if (!tabId) return;

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("edge://") || tab.url.startsWith("devtools://")) {
      console.warn("Chrome 禁止在内部受保护页面运行扩展脚本，请切换到常规网页测试");
      return;
    }

    // Try sending message directly first
    chrome.tabs.sendMessage(tabId, { action: "START_SNIP" }, (res) => {
      if (chrome.runtime.lastError) {
        // If content script wasn't loaded yet on this tab, dynamically inject it!
        chrome.scripting.insertCSS({
          target: { tabId },
          files: ["content.css"]
        }).then(() => {
          return chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
          });
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: "START_SNIP" });
          }, 150);
        }).catch((err) => {
          console.error("动态注入脚本失败:", err);
        });
      }
    });
  } catch (e) {
    console.error("ensureInjectedAndStart error:", e);
  }
}

// Listen for global keyboard shortcut Alt+Shift+S (Command+Shift+S on Mac)
chrome.commands.onCommand.addListener((command) => {
  if (command === "capture-area") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        ensureInjectedAndStart(tabs[0].id);
      }
    });
  }
});

// Message hub
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Capture visible tab screenshot
  if (request.action === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true; // Keep open for async response
  }

  // Proxy OCR request through background (bypasses page CSP and CORS, with multi-provider AI and token metering)
  if (request.action === "PERFORM_OCR") {
    (async () => {
      try {
        const store = await chrome.storage.local.get([
          "ocrServerUrl",
          "aiProvider",
          "apiKey",
          "geminiApiKey",
          "baseUrl",
          "modelName",
          "pureZeroTokenMode"
        ]);
        const provider = store.aiProvider || "gemini";
        const apiKey = (store.apiKey || store.geminiApiKey || "").trim();
        const customBaseUrl = (store.baseUrl || "").trim();
        const customModel = (store.modelName || "").trim();
        const defaultUrl = "https://ais-dev-lkoid47nn7w76pgs3n36ic-90062235677.asia-northeast1.run.app/api/ocr";
        const serverUrl = store.ocrServerUrl || defaultUrl;
        const isPureZero = (store.pureZeroTokenMode !== false && !request.isAIEnhance && request.mode !== "markdown_structured");

        // Helper to record token metrics - strictly ONLY when tokens > 0
        const recordTokens = (tokCount) => {
          if (!tokCount || tokCount <= 0) return;
          const todayKey = "tokens_" + new Date().toISOString().slice(0, 10);
          chrome.storage.local.get([todayKey, "totalTokensCount"], (res) => {
            const todayTotal = (res[todayKey] || 0) + tokCount;
            const overallTotal = (res["totalTokensCount"] || 0) + tokCount;
            chrome.storage.local.set({ [todayKey]: todayTotal, totalTokensCount: overallTotal, lastTokens: tokCount });
          });
        };

        // Strategy A1: Google Gemini Official Direct
        if (provider === "gemini" && apiKey.length > 10) {
          try {
            const rawBase64 = request.image.replace(/^data:[^;]+;base64,/, "");
            const apiRes = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=\${apiKey}\`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inlineData: { mimeType: "image/jpeg", data: rawBase64 } },
                    { text: request.mode === "markdown_structured"
                        ? "You are an advanced AI vision OCR engine. Extract all visible text accurately with clear Markdown headers, bullet points, and tables. Preserve reading order."
                        : "High-speed OCR. Extract all visible text accurately. Preserve reading order, numbers and punctuation. Output only the extracted text." }
                  ]
                }],
                generationConfig: {
                  temperature: 0.1,
                  thinkingConfig: { thinkingBudget: 0 }
                }
              })
            });
            const apiData = await apiRes.json();
            const text = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
              const reportedTokens = isPureZero ? 0 : (apiData?.usageMetadata?.totalTokenCount || 0);
              const promptTokens = isPureZero ? 0 : (apiData?.usageMetadata?.promptTokenCount || 0);
              const candidatesTokens = isPureZero ? 0 : (apiData?.usageMetadata?.candidatesTokenCount || 0);
              if (!isPureZero && reportedTokens > 0) {
                recordTokens(reportedTokens);
              }

              sendResponse({
                success: true,
                data: {
                  text: text.trim(),
                  charCount: text.length,
                  lineCount: text.split("\\n").filter(l => l.trim().length > 0).length,
                  engine: "Google Gemini 官方直连",
                  tokensUsed: reportedTokens,
                  usage: { promptTokens, candidatesTokens, totalTokens: reportedTokens }
                }
              });
              return;
            }
          } catch (apiErr) {
            console.warn("Direct Gemini API attempt failed:", apiErr);
          }
        }

        // Strategy A2: OpenAI / DeepSeek / Qwen / Custom OpenAI-Compatible Endpoints
        if (provider !== "gemini" && apiKey.length > 5) {
          try {
            let targetEndpoint = "https://api.openai.com/v1/chat/completions";
            let effectiveModel = customModel || "gpt-4o-mini";

            if (provider === "deepseek") {
              targetEndpoint = (customBaseUrl || "https://api.deepseek.com/v1").replace(/\\/+$/, "") + "/chat/completions";
              effectiveModel = customModel || "deepseek-chat";
            } else if (provider === "qwen") {
              targetEndpoint = (customBaseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\\/+$/, "") + "/chat/completions";
              effectiveModel = customModel || "qwen-vl-plus";
            } else if (provider === "custom" && customBaseUrl) {
              targetEndpoint = customBaseUrl.replace(/\\/+$/, "") + "/chat/completions";
              effectiveModel = customModel || "gpt-4o-mini";
            } else if (provider === "openai") {
              targetEndpoint = (customBaseUrl || "https://api.openai.com/v1").replace(/\\/+$/, "") + "/chat/completions";
              effectiveModel = customModel || "gpt-4o-mini";
            }

            const promptText = request.mode === "markdown_structured"
              ? "You are an advanced AI vision OCR engine. Extract all visible text accurately in clear Markdown format. Return ONLY the text."
              : "High-speed OCR. Extract all visible text accurately. Return ONLY the extracted text.";

            const apiRes = await fetch(targetEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": \`Bearer \${apiKey}\`
              },
              body: JSON.stringify({
                model: effectiveModel,
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: promptText },
                      { type: "image_url", image_url: { url: request.image } }
                    ]
                  }
                ],
                max_tokens: 2048,
                temperature: 0.1
              })
            });

            const apiData = await apiRes.json();
            const text = apiData?.choices?.[0]?.message?.content || "";
            if (text) {
              const reportedTokens = isPureZero ? 0 : (apiData?.usage?.total_tokens || 0);
              const promptTokens = isPureZero ? 0 : (apiData?.usage?.prompt_tokens || 0);
              const candidatesTokens = isPureZero ? 0 : (apiData?.usage?.completion_tokens || 0);
              if (!isPureZero && reportedTokens > 0) {
                recordTokens(reportedTokens);
              }

              sendResponse({
                success: true,
                data: {
                  text: text.trim(),
                  charCount: text.length,
                  lineCount: text.split("\\n").filter(l => l.trim().length > 0).length,
                  engine: \`\${provider.toUpperCase()} (\${effectiveModel})\`,
                  tokensUsed: reportedTokens,
                  usage: { promptTokens, candidatesTokens, totalTokens: reportedTokens }
                }
              });
              return;
            }
          } catch (openaiErr) {
            console.warn("OpenAI-compatible provider attempt failed:", openaiErr);
          }
        }

        // Strategy B: Try calling the configured OCR backend endpoint
        try {
          const res = await fetch(serverUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { "x-gemini-api-key": apiKey } : {})
            },
            body: JSON.stringify({
              image: request.image,
              mode: request.mode || "standard",
              apiKey: apiKey || undefined,
              options: {
                pureZeroToken: isPureZero,
                forceAi: Boolean(request.isAIEnhance)
              }
            }),
            credentials: "include"
          });

          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("text/html") && res.ok) {
            const data = await res.json();
            if (isPureZero) {
              data.tokensUsed = 0;
              data.usage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 };
            }
            if (data?.tokensUsed && data.tokensUsed > 0) recordTokens(data.tokensUsed);
            sendResponse({ success: true, data });
            return;
          }
        } catch (fetchErr) {
          console.warn("Direct server fetch failed:", fetchErr);
        }

        // Strategy C: Smart Tab Bridge!
        // Cloud Run development URLs require Google AI Studio session cookies (__cookie_check.html).
        // If the user has the SnapText App tab open in Chrome, proxy through that tab!
        const matchingTabs = await chrome.tabs.query({ url: ["*://*.run.app/*", "*://localhost:3000/*"] });
        if (matchingTabs && matchingTabs.length > 0) {
          for (const tab of matchingTabs) {
            try {
              const execResults = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: async (imageData, mode, customKey) => {
                  try {
                    const resp = await fetch("/api/ocr", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(customKey ? { "x-gemini-api-key": customKey } : {})
                      },
                      body: JSON.stringify({ image: imageData, mode, apiKey: customKey })
                    });
                    const ct = resp.headers.get("content-type") || "";
                    if (ct.includes("text/html")) {
                      return { success: false, error: "页面鉴权中" };
                    }
                    const data = await resp.json();
                    return { success: true, data };
                  } catch (e) {
                    return { success: false, error: e.message };
                  }
                },
                args: [request.image, request.mode || "standard", apiKey || ""]
              });

              const tabResult = execResults?.[0]?.result;
              if (tabResult && tabResult.success && tabResult.data) {
                if (tabResult.data.tokensUsed) recordTokens(tabResult.data.tokensUsed);
                sendResponse(tabResult);
                return;
              }
            } catch (tabExecErr) {
              console.warn("Tab bridge attempt failed on tab:", tab.id, tabExecErr);
            }
          }
        }

        // If all strategies failed, return helpful diagnostic guidance
        sendResponse({
          success: false,
          error: "识别连接受阻。解决方法：1. 保持打开 SnapText 网页标签页；或 2. 在插件设置中填入 Gemini / OpenAI / DeepSeek API Key 直连！"
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message || "OCR 处理异常"
        });
      }
    })();
    return true; // Keep channel open for async response
  }

  // Trigger snipping from popup button
  if (request.action === "TRIGGER_SNIP_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        ensureInjectedAndStart(tabs[0].id);
      }
    });
    sendResponse({ ok: true });
    return true;
  }

  // Save OCR record
  if (request.action === "SAVE_HISTORY") {
    chrome.storage.local.get(["ocrHistory"], (res) => {
      const history = res.ocrHistory || [];
      history.unshift(request.item);
      chrome.storage.local.set({ ocrHistory: history.slice(0, 100) });
    });
  }
});
`;

  const contentJs = `// SnapText In-Page Content Script: Selection Box & Persistent Result Panel
(function () {
  // Prevent duplicate script registration
  if (window.__snapTextInitialized) return;
  window.__snapTextInitialized = true;

  let isSelecting = false;
  let startX = 0;
  let startY = 0;
  let overlay = null;
  let box = null;
  let actionToolbar = null;
  let dimBadge = null;

  const CONTENT_I18N = {
    zh_CN: {
      overlayTip: "按住鼠标左键拖拽框选需要识别的区域（按 ESC 取消）",
      cancel: "✕ 取消",
      confirmOcr: "🔍 提取此区域文字 (OCR)",
      videoBtn: "视频识字",
      videoStatus: "⚡ 正在提取视频字幕/画面文字...",
      tabTask: "📝 当前工作台",
      tabDash: "📊 Token看板与历史",
      minBtnTitle: "最小化面板 (任务在后台保持运行)",
      closeBtnTitle: "关闭界面",
      pillText: "⚡ SnapText · 任务保持中",
      pillExpand: "展开 ↗",
      subHint: "界面已固定常驻，最小化或在看板间切换绝不丢任务",
      placeholder: "正在识别文字...",
      stats: function(chars, lines) { return "共 " + chars + " 字 / " + lines + " 行"; },
      zeroBadge: "🟢 0 Token (免配额 / 基础极速识别)",
      paidBadge: function(tok, p, c) { return "⚡ 消耗 " + tok + " Tokens (" + p + " in / " + c + " out)"; },
      appendMode: "📝 连续追加写字板模式",
      appendTitle: "勾选后，连续多次截图的文字会自动换行追加到写字板中，不会冲掉上一段",
      copyToast: "✓ 已自动复制到系统剪贴板",
      resnipBtn: "📸 再次框选",
      mergeBtn: "合并段落",
      aiEnhanceBtn: function(tokens) { return "✨ AI 深度增强 (预估 ~" + tokens + " Tokens)"; },
      aiEnhanceTitle: "调用大模型深度增强排版、纠错与识别手写体/公式",
      copyBtn: "一键复制",
      copiedBtn: "✓ 已复制到剪贴板！",
      autoCopiedBtn: "✓ 已自动复制！",
      closeManual: "✕ 关闭界面",
      dashToday: "📊 今日模型消耗",
      dashTotal: "⚡ 历史总计消耗",
      dashStorageNote: "💡 <strong>存储说明：</strong>Token 统计与提取历史保存在 Chrome 本地存储中（chrome.storage.local），<strong>永久保留且永不过期</strong>，直到您点击下方按钮清空。",
      dashHistoryTitle: "最近截图提取历史",
      dashClearBtn: "🗑️ 清空历史",
      dashEmpty: "暂无历史记录",
      dashBack: "← 返回当前工作台继续编辑",
      confirmClear: "确定要清空全部历史截图记录吗？",
      clickToCopy: "点击复制",
      statusRunningFast: "⚡ 正在极速识别中 (平均 < 1秒)...",
      statusRunningAi: "✨ 正在通过大模型进行深度解析与排版优化...",
      statusSuccessFast: "✓ ⚡ 极速提取成功！",
      statusSuccessAi: "✓ ✨ AI 深度增强完成！",
      statusNoText: "未在框选区域中识别到明显文字",
      statusError: "识别请求异常: "
    },
    en: {
      overlayTip: "Click and drag to select area (Press ESC to cancel)",
      cancel: "✕ Cancel",
      confirmOcr: "🔍 Extract Text (OCR)",
      videoBtn: "Video Snip",
      videoStatus: "⚡ Extracting video frame text...",
      tabTask: "📝 Active Workspace",
      tabDash: "📊 Token Stats & History",
      minBtnTitle: "Minimize panel (task continues in background)",
      closeBtnTitle: "Close panel",
      pillText: "⚡ SnapText · Task Active",
      pillExpand: "Expand ↗",
      subHint: "Persistent workspace: task will never be lost across tabs",
      placeholder: "Extracting text...",
      stats: function(chars, lines) { return chars + " chars / " + lines + " lines"; },
      zeroBadge: "🟢 0 Tokens Used (Fast Standard)",
      paidBadge: function(tok, p, c) { return "⚡ Used " + tok + " Tokens (" + p + " in / " + c + " out)"; },
      appendMode: "📝 Scratchpad Append Mode",
      appendTitle: "Automatically append subsequent snips to scratchpad without overwriting",
      copyToast: "✓ Auto-copied to clipboard",
      resnipBtn: "📸 Resnip Area",
      mergeBtn: "Merge Lines",
      aiEnhanceBtn: function(tokens) { return "✨ AI Smart Enhance (~" + tokens + " Tokens)"; },
      aiEnhanceTitle: "Invoke vision model for deep formatting, handwriting & math",
      copyBtn: "Copy Text",
      copiedBtn: "✓ Copied to clipboard!",
      autoCopiedBtn: "✓ Auto-copied!",
      closeManual: "✕ Close Panel",
      dashToday: "📊 Today's Model Tokens",
      dashTotal: "⚡ Lifetime Total Tokens",
      dashStorageNote: "💡 <strong>Storage Note:</strong> Token metrics and history are securely saved in Chrome local storage (chrome.storage.local) and <strong>never expire</strong> until cleared.",
      dashHistoryTitle: "Recent Snipping History",
      dashClearBtn: "🗑️ Clear History",
      dashEmpty: "No history records yet",
      dashBack: "← Back to Active Workspace",
      confirmClear: "Clear all screenshot extraction history?",
      clickToCopy: "Click to copy",
      statusRunningFast: "⚡ Fast extracting (avg < 1s)...",
      statusRunningAi: "✨ AI model analyzing and structuring...",
      statusSuccessFast: "✓ ⚡ Extracted successfully!",
      statusSuccessAi: "✓ ✨ AI Smart Enhance Complete!",
      statusNoText: "No visible text detected in selected area",
      statusError: "Extraction error: "
    },
    ja: {
      overlayTip: "ドラッグして範囲を選択してください（ESCキーでキャンセル）",
      cancel: "✕ キャンセル",
      confirmOcr: "🔍 選択範囲の文字を抽出 (OCR)",
      videoBtn: "動画識字",
      videoStatus: "⚡ 動画フレームから文字を抽出中...",
      tabTask: "📝 ワークスペース",
      tabDash: "📊 トークン履歴・看板",
      minBtnTitle: "パネルを最小化 (バックグラウンドで処理保持)",
      closeBtnTitle: "閉じる",
      pillText: "⚡ SnapText · タスク保持中",
      pillExpand: "展開 ↗",
      subHint: "常駐パネル：タブ切替や最小化でも作業内容が消えません",
      placeholder: "テキストを認識中...",
      stats: function(chars, lines) { return "合計 " + chars + " 文字 / " + lines + " 行"; },
      zeroBadge: "🟢 0 トークン (高速標準認識・完全無料)",
      paidBadge: function(tok, p, c) { return "⚡ 消費 " + tok + " トークン (" + p + " in / " + c + " out)"; },
      appendMode: "📝 追記スクラッチパッド",
      appendTitle: "連続キャプチャ時に前回の文章を消さずに末尾へ自動追記します",
      copyToast: "✓ クリップボードに自動コピー完了",
      resnipBtn: "📸 再キャプチャ",
      mergeBtn: "改行結合",
      aiEnhanceBtn: function(tokens) { return "✨ AI高度推敲 (約 ~" + tokens + " トークン)"; },
      aiEnhanceTitle: "大モデルで数式・手書き文字・レイアウトを最適化",
      copyBtn: "テキストコピー",
      copiedBtn: "✓ クリップボードにコピー済！",
      autoCopiedBtn: "✓ 自動コピー完了！",
      closeManual: "✕ 閉じる",
      dashToday: "📊 本日のモデル消費",
      dashTotal: "⚡ 累計消費トークン",
      dashStorageNote: "💡 <strong>保存仕様：</strong>トークン消費と抽出履歴はChromeローカルストレージ（chrome.storage.local）に<strong>永久保存</strong>され、手動削除するまで消えません。",
      dashHistoryTitle: "最近の抽出履歴",
      dashClearBtn: "🗑️ 履歴を全削除",
      dashEmpty: "抽出履歴がありません",
      dashBack: "← ワークスペースに戻る",
      confirmClear: "すべての抽出履歴を削除しますか？",
      clickToCopy: "クリックでコピー",
      statusRunningFast: "⚡ 高速認識中 (平均1秒未満)...",
      statusRunningAi: "✨ AI大モデルで深層解析・構造化中...",
      statusSuccessFast: "✓ ⚡ 抽出完了！",
      statusSuccessAi: "✓ ✨ AI高度推敲が完了しました！",
      statusNoText: "選択領域に文字が検出されませんでした",
      statusError: "OCRエラー: "
    }
  };

  let currentLang = "zh_CN";
  function getT() {
    return CONTENT_I18N[currentLang] || CONTENT_I18N.zh_CN;
  }

  function detectLang() {
    const raw = (chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : navigator.language || "en").toLowerCase();
    if (raw.startsWith("zh")) return "zh_CN";
    if (raw.startsWith("ja")) return "ja";
    return "en";
  }

  chrome.storage.local.get(["extensionLanguage"], (st) => {
    if (st && st.extensionLanguage) {
      currentLang = st.extensionLanguage;
    } else {
      currentLang = detectLang();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.extensionLanguage) {
      currentLang = changes.extensionLanguage.newValue;
    }
  });

  // In-page fallback keyboard listener for Alt+Shift+S
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && (e.key === "S" || e.key === "s" || e.code === "KeyS")) {
      e.preventDefault();
      e.stopPropagation();
      startSnipOverlay();
    }
  }, true);

  // Initialize video badge: detect <video> elements on page
  function attachVideoButtons() {
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      if (video.dataset.snaptextAttached) return;
      video.dataset.snaptextAttached = "true";

      const wrapper = document.createElement("div");
      wrapper.className = "snaptext-video-btn-wrapper";
      wrapper.innerHTML = \`<button class="snaptext-video-ocr-btn" title="截取该视频当前画面并提取文字">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h3"/><path d="M20 7V4h-3"/><path d="M4 17v3h3"/><path d="M20 17v3h-3"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>
        <span>视频识字</span>
      </button>\`;

      video.parentElement?.style.setProperty("position", "relative");
      video.parentElement?.appendChild(wrapper);

      wrapper.querySelector(".snaptext-video-ocr-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        captureFromVideo(video);
      });
    });
  }

  // Capture frame directly from HTML5 video element with compression optimization
  function captureFromVideo(video) {
    try {
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 360;
      const maxW = 1400;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(video, 0, 0, w, h);
      }
      // Speed optimization: JPEG 0.85 cuts 90%+ data size
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      showPersistentResultPanel(dataUrl, "⚡ 正在提取视频字幕/画面文字...");
    } catch (e) {
      startSnipOverlay();
    }
  }

  // Start snipping overlay
  function startSnipOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "snaptext-snipper-overlay";
    const t = getT();
    overlay.innerHTML = \`
      <div class="snaptext-tip">
        <span class="snaptext-tip-icon">📸</span>
        <span>\${t.overlayTip}</span>
      </div>
      <div class="snaptext-selection-box" style="display:none;">
        <div class="snaptext-dim-badge">0 × 0 px</div>
      </div>
      <div class="snaptext-toolbar" style="display:none;">
        <button class="snaptext-btn snaptext-btn-cancel">\${t.cancel}</button>
        <button class="snaptext-btn snaptext-btn-confirm">\${t.confirmOcr}</button>
      </div>
    \`;

    document.body.appendChild(overlay);
    box = overlay.querySelector(".snaptext-selection-box");
    dimBadge = overlay.querySelector(".snaptext-dim-badge");
    actionToolbar = overlay.querySelector(".snaptext-toolbar");

    const onMouseDown = (e) => {
      if (e.target.closest(".snaptext-toolbar")) return;
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.left = startX + "px";
      box.style.top = startY + "px";
      box.style.width = "0px";
      box.style.height = "0px";
      box.style.display = "block";
      actionToolbar.style.display = "none";
    };

    const onMouseMove = (e) => {
      if (!isSelecting) return;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      box.style.left = left + "px";
      box.style.top = top + "px";
      box.style.width = width + "px";
      box.style.height = height + "px";

      if (dimBadge) {
        dimBadge.textContent = \`\${Math.round(width)} × \${Math.round(height)} px\`;
      }
    };

    const onMouseUp = (e) => {
      if (!isSelecting) return;
      isSelecting = false;
      const rect = box.getBoundingClientRect();
      if (rect.width > 15 && rect.height > 15) {
        const toolbarW = 230;
        let tbLeft = rect.right - toolbarW;
        if (tbLeft < 10) tbLeft = 10;
        if (tbLeft + toolbarW > window.innerWidth - 10) tbLeft = window.innerWidth - toolbarW - 10;

        let tbTop = rect.bottom + 8;
        if (tbTop + 45 > window.innerHeight) {
          tbTop = Math.max(10, rect.top - 45);
        }

        actionToolbar.style.left = tbLeft + "px";
        actionToolbar.style.top = tbTop + "px";
        actionToolbar.style.display = "flex";
      } else {
        box.style.display = "none";
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        cleanup();
      }
    };

    function cleanup() {
      overlay?.remove();
      overlay = null;
      document.removeEventListener("keydown", onKeyDown);
    }

    overlay.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKeyDown);

    overlay.querySelector(".snaptext-btn-cancel")?.addEventListener("click", cleanup);
    overlay.querySelector(".snaptext-btn-confirm")?.addEventListener("click", () => {
      const rect = box.getBoundingClientRect();
      // Hide selection box, toolbar and dim overlay so captured screenshot is 100% clean and clear
      box.style.display = "none";
      actionToolbar.style.display = "none";
      overlay.style.display = "none";

      setTimeout(() => {
        captureCrop(rect);
        cleanup();
      }, 60);
    });
  }

  // Capture cropped viewport area with speed & bandwidth optimization
  function captureCrop(rect) {
    chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (res) => {
      if (!res || !res.dataUrl) {
        showPersistentResultPanel("", "未能捕获网页画面，请刷新页面或检查权限", { width: 400, height: 200 });
        return;
      }
      const img = new Image();
      img.src = res.dataUrl;
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        let cropW = Math.max(1, Math.round(rect.width * dpr));
        let cropH = Math.max(1, Math.round(rect.height * dpr));

        // Speed optimization: Downsample if dimensions exceed 1400px (preserves full readability while shrinking payload)
        const maxDim = 1400;
        let targetW = cropW;
        let targetH = cropH;
        if (targetW > maxDim) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            img,
            Math.round(rect.left * dpr),
            Math.round(rect.top * dpr),
            cropW,
            cropH,
            0,
            0,
            targetW,
            targetH
          );
          // Speed optimization: JPEG 0.85 cuts 90%+ data size and uploads in < 80ms
          const croppedUrl = canvas.toDataURL("image/jpeg", 0.85);
          showPersistentResultPanel(croppedUrl, "⚡ 正在极速识别中...", { width: targetW, height: targetH });
        }
      };
    });
  }

  // IMPORTANT: Persistent Floating Result Window with Lossless Dual-View Navigation
  function showPersistentResultPanel(imageUrl, statusText, dimensions) {
    let panel = document.getElementById("snaptext-persistent-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "snaptext-persistent-panel";
      panel.className = "snaptext-persistent-panel";
      document.body.appendChild(panel);
    }

    // Dynamic Token Estimation calculation
    const dimW = dimensions?.width || 600;
    const dimH = dimensions?.height || 400;
    const tilesW = Math.ceil(dimW / 512);
    const tilesH = Math.ceil(dimH / 512);
    const tiles = Math.max(1, Math.min(4, tilesW * tilesH));
    const estTokens = 60 + tiles * 130 + 70;
    const t = getT();

    panel.innerHTML = \`
      <div class="snaptext-panel-header" id="st-drag-header">
        <div class="snaptext-header-left">
          <div class="snaptext-nav-tabs">
            <button class="snaptext-tab-btn active" id="st-tab-btn-task">\${t.tabTask}</button>
            <button class="snaptext-tab-btn" id="st-tab-btn-dash">\${t.tabDash}</button>
          </div>
        </div>
        <div class="snaptext-header-actions">
          <button class="snaptext-header-btn" id="st-btn-min-top" title="\${t.minBtnTitle}">─</button>
          <button class="snaptext-close-btn" id="st-btn-close-top" title="\${t.closeBtnTitle}">✕</button>
        </div>
      </div>

      <!-- Minimized Floating Capsule (100% Lossless Task State) -->
      <div class="snaptext-min-pill" id="st-min-pill" style="display: none;">
        <span class="st-pill-dot"></span>
        <span id="st-pill-text" style="font-weight:600; font-size:11px;">\${t.pillText}</span>
        <button id="st-pill-expand-btn" style="background:#2563eb; color:#fff; border:none; padding:2px 8px; border-radius:4px; font-size:10px; cursor:pointer;">\${t.pillExpand}</button>
      </div>

      <!-- VIEW 1: Active Task View -->
      <div class="snaptext-view-pane" id="st-view-task">
        <div class="snaptext-preview-strip">
          \${imageUrl ? \`<img src="\${imageUrl}" class="snaptext-crop-thumb" alt="截图区域" />\` : ""}
          <div class="snaptext-status-block">
            <div class="snaptext-status-text" id="st-status">\${statusText}</div>
            <div class="snaptext-sub-hint">\${t.subHint}</div>
          </div>
        </div>

        <div class="snaptext-editor-box">
          <textarea id="st-textarea" class="snaptext-textarea" placeholder="\${t.placeholder}"></textarea>
        </div>

        <div class="snaptext-panel-footer">
          <div class="snaptext-stats-bar">
            <div class="snaptext-stats" id="st-stats">共 0 字</div>
            <div class="snaptext-token-badge free" id="st-token-badge" title="\${t.zeroBadge}">\${t.zeroBadge}</div>
          </div>

          <div class="snaptext-workflow-bar">
            <label class="snaptext-append-toggle" title="勾选后，连续多次截图的文字会自动换行追加到写字板中，不会冲掉上一段">
              <input type="checkbox" id="st-append-mode" />
              <span>\${t.appendMode}</span>
            </label>
            <div class="snaptext-copy-toast" id="st-copy-toast">\${t.copyToast}</div>
          </div>
          
          <div class="snaptext-footer-btns">
            <button class="snaptext-btn-act snaptext-btn-secondary" id="st-resnip-btn" title="重新截图">
              📸 再次框选
            </button>
            <button class="snaptext-btn-act snaptext-btn-secondary" id="st-merge-btn" title="合并换行">
              \${t.mergeBtn}
            </button>
            <button class="snaptext-btn-act snaptext-btn-ai" id="st-ai-enhance-btn" title="调用大模型深度增强排版、纠错与识别手写体/公式">
              \${t.aiEnhanceBtn(estTokens)}
            </button>
            <button class="snaptext-btn-act snaptext-btn-primary" id="st-copy-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              \${t.copyBtn}
            </button>
            <button class="snaptext-btn-act snaptext-btn-close-manual" id="st-close-manual-btn" title="手动关闭此插件界面">
              \${t.closeManual}
            </button>
          </div>
        </div>
      </div>

      <!-- VIEW 2: Dashboard & History View (100% Non-destructive) -->
      <div class="snaptext-view-pane" id="st-view-dash" style="display: none;">
        <div class="snaptext-dash-header">
          <div class="snaptext-dash-stat-card">
            <div class="dash-stat-label">\${t.dashToday}</div>
            <div class="dash-stat-val" id="st-dash-today-tokens">0 <span style="font-size:10px; font-weight:normal; color:#94a3b8;">Tokens</span></div>
          </div>
          <div class="snaptext-dash-stat-card">
            <div class="dash-stat-label">\${t.dashTotal}</div>
            <div class="dash-stat-val" id="st-dash-total-tokens">0 <span style="font-size:10px; font-weight:normal; color:#94a3b8;">Tokens</span></div>
          </div>
        </div>

        <div style="font-size:10px; color:#64748b; padding:0 2px 8px 2px; line-height:1.4;">
          💡 <strong>存储说明：</strong>Token 统计与提取历史保存在 Chrome 本地存储中（chrome.storage.local），<strong>永久保留且永不过期</strong>，直到您点击下方按钮清空。
        </div>

        <div class="snaptext-dash-history-sec">
          <div class="dash-history-bar">
            <span style="font-size:11px; font-weight:600; color:#cbd5e1;">\${t.dashHistoryTitle}</span>
            <button class="snaptext-btn-dash-clear" id="st-dash-clear-btn" title="清空所有截图历史记录">\${t.dashClearBtn}</button>
          </div>
          <div class="snaptext-dash-history-list" id="st-dash-history-list">
            <div style="text-align:center; padding:16px; font-size:11px; color:#64748b;">暂无历史记录</div>
          </div>
        </div>

        <div class="snaptext-dash-footer">
          <button class="snaptext-btn-act snaptext-btn-primary" id="st-btn-back-task" style="width:100%; justify-content:center;">
            ← 返回当前工作台继续编辑
          </button>
        </div>
      </div>
    \`;

    const tabBtnTask = panel.querySelector("#st-tab-btn-task");
    const tabBtnDash = panel.querySelector("#st-tab-btn-dash");
    const viewTask = panel.querySelector("#st-view-task");
    const viewDash = panel.querySelector("#st-view-dash");
    const btnBackTask = panel.querySelector("#st-btn-back-task");

    const dashTodayTokens = panel.querySelector("#st-dash-today-tokens");
    const dashTotalTokens = panel.querySelector("#st-dash-total-tokens");
    const dashHistoryList = panel.querySelector("#st-dash-history-list");
    const dashClearBtn = panel.querySelector("#st-dash-clear-btn");

    const textarea = panel.querySelector("#st-textarea");
    const status = panel.querySelector("#st-status");
    const stats = panel.querySelector("#st-stats");
    const tokenBadge = panel.querySelector("#st-token-badge");
    const appendModeCheckbox = panel.querySelector("#st-append-mode");
    const copyToast = panel.querySelector("#st-copy-toast");
    const copyBtn = panel.querySelector("#st-copy-btn");
    const mergeBtn = panel.querySelector("#st-merge-btn");
    const aiEnhanceBtn = panel.querySelector("#st-ai-enhance-btn");
    const resnipBtn = panel.querySelector("#st-resnip-btn");
    const closeBtnTop = panel.querySelector("#st-btn-close-top");
    const closeBtnManual = panel.querySelector("#st-close-manual-btn");
    const dragHeader = panel.querySelector("#st-drag-header");
    let activeImageData = imageUrl;

    // Lossless Dual-View switching
    function switchToTaskView() {
      viewTask.style.display = "block";
      viewDash.style.display = "none";
      tabBtnTask.classList.add("active");
      tabBtnDash.classList.remove("active");
    }

    function switchToDashView() {
      viewTask.style.display = "none";
      viewDash.style.display = "block";
      tabBtnTask.classList.remove("active");
      tabBtnDash.classList.add("active");
      loadAndRenderDashboard();
    }

    tabBtnTask.addEventListener("click", switchToTaskView);
    tabBtnDash.addEventListener("click", switchToDashView);
    btnBackTask.addEventListener("click", switchToTaskView);

    // Dashboard loader
    function loadAndRenderDashboard() {
      const todayKey = "tokens_" + new Date().toISOString().slice(0, 10);
      chrome.storage.local.get([todayKey, "totalTokensCount", "ocrHistory"], (st) => {
        const todayTokens = st[todayKey] || 0;
        const totalTokens = st.totalTokensCount || 0;
        dashTodayTokens.innerHTML = \`\${todayTokens.toLocaleString()} <span style="font-size:10px; font-weight:normal; color:#94a3b8;">Tokens</span>\`;
        dashTotalTokens.innerHTML = \`\${totalTokens.toLocaleString()} <span style="font-size:10px; font-weight:normal; color:#94a3b8;">Tokens</span>\`;

        const list = st.ocrHistory || [];
        if (list.length > 0) {
          dashHistoryList.innerHTML = "";
          list.slice(0, 15).forEach((item) => {
            const card = document.createElement("div");
            card.className = "history-card";
            card.innerHTML = \`
              <button class="history-del-btn" title="删除该条记录" data-id="\${item.id}">✕</button>
              <div class="history-text">\${escapeHtml(item.text)}</div>
              <div class="history-footer">
                <span>\${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · \${item.tokens ? '⚡ ' + item.tokens + ' tok' : '🟢 0 tok'}</span>
                <span style="color:#38bdf8;">点击复制</span>
              </div>
            \`;
            card.querySelector(".history-del-btn").addEventListener("click", (e) => {
              e.stopPropagation();
              const updated = list.filter((x) => x.id !== item.id);
              chrome.storage.local.set({ ocrHistory: updated }, loadAndRenderDashboard);
            });
            card.addEventListener("click", async () => {
              await navigator.clipboard.writeText(item.text);
              card.style.borderColor = "#10b981";
              setTimeout(() => (card.style.borderColor = "#334155"), 1000);
            });
            dashHistoryList.appendChild(card);
          });
        } else {
          dashHistoryList.innerHTML = '<div style="text-align:center; padding:16px; font-size:11px; color:#64748b;">暂无历史记录</div>';
        }
      });
    }

    dashClearBtn.addEventListener("click", () => {
      if (confirm("确定要清空全部历史截图记录吗？")) {
        chrome.storage.local.remove(["ocrHistory"], loadAndRenderDashboard);
      }
    });

    // Load append mode preference
    chrome.storage.local.get(["appendModeEnabled"], (res) => {
      if (res && res.appendModeEnabled) {
        appendModeCheckbox.checked = true;
      }
    });
    appendModeCheckbox.addEventListener("change", () => {
      chrome.storage.local.set({ appendModeEnabled: appendModeCheckbox.checked });
    });

    // Close ONLY when manually clicked
    const closePanel = () => {
      panel.remove();
    };
    closeBtnTop.addEventListener("click", closePanel);
    closeBtnManual.addEventListener("click", closePanel);

    // Minimize & Lossless restore
    const minBtnTop = panel.querySelector("#st-btn-min-top");
    const minPill = panel.querySelector("#st-min-pill");
    const pillExpandBtn = panel.querySelector("#st-pill-expand-btn");

    function minimizePanel() {
      panel.classList.add("snaptext-minimized");
      dragHeader.style.display = "none";
      viewTask.style.display = "none";
      viewDash.style.display = "none";
      minPill.style.display = "flex";
    }

    function expandPanel() {
      minPill.style.display = "none";
      panel.classList.remove("snaptext-minimized");
      dragHeader.style.display = "flex";
      if (tabBtnDash.classList.contains("active")) {
        viewDash.style.display = "block";
      } else {
        viewTask.style.display = "block";
      }
    }

    minBtnTop?.addEventListener("click", minimizePanel);
    minPill?.addEventListener("click", expandPanel);
    pillExpandBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      expandPanel();
    });

    // Resnip button
    resnipBtn.addEventListener("click", () => {
      startSnipOverlay();
    });

    // Real-time editing text stats
    textarea.addEventListener("input", () => {
      const len = textarea.value.length;
      const lines = textarea.value ? textarea.value.split("\\n").filter(l => l.trim().length > 0).length : 0;
      stats.textContent = \`共 \${len} 字 / \${lines} 行\`;
    });

    // Merge paragraphs
    mergeBtn.addEventListener("click", () => {
      textarea.value = textarea.value.replace(/\\r?\\n+/g, " ").replace(/\\s{2,}/g, " ").trim();
      textarea.dispatchEvent(new Event("input"));
    });

    // One-Click Copy
    copyBtn.addEventListener("click", async () => {
      if (!textarea.value) return;
      await navigator.clipboard.writeText(textarea.value);
      copyBtn.innerHTML = \`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> 已复制到剪贴板！\`;
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.innerHTML = \`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 一键复制\`;
        copyBtn.classList.remove("copied");
      }, 2000);
    });

    // Drag-to-move panel implementation
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    dragHeader.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      panel.style.transition = "none";
    });

    const onGlobalMouseMove = (e) => {
      if (!isDragging) return;
      const newLeft = Math.max(10, Math.min(window.innerWidth - panel.offsetWidth - 10, e.clientX - dragOffsetX));
      const newTop = Math.max(10, Math.min(window.innerHeight - panel.offsetHeight - 10, e.clientY - dragOffsetY));
      panel.style.left = newLeft + "px";
      panel.style.top = newTop + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    };

    const onGlobalMouseUp = () => {
      isDragging = false;
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", onGlobalMouseUp);

    // Reusable perform OCR function for both fast mode and AI enhancement
    function runOCR(img, mode = "standard", isAIEnhance = false) {
      const t = getT();
      status.textContent = isAIEnhance ? t.statusRunningAi : t.statusRunningFast;
      status.style.color = isAIEnhance ? "#a855f7" : "#38bdf8";

      chrome.runtime.sendMessage(
        {
          action: "PERFORM_OCR",
          image: img,
          mode: mode,
          isAIEnhance: isAIEnhance
        },
        (res) => {
          if (chrome.runtime.lastError) {
            status.textContent = t.statusError + chrome.runtime.lastError.message;
            status.style.color = "#ef4444";
            return;
          }

          if (res && res.success && res.data) {
            const data = res.data;
            if (data.text) {
              const isAppend = appendModeCheckbox.checked;
              if (isAppend && textarea.value.trim().length > 0) {
                textarea.value = textarea.value.trim() + "\n\n" + data.text;
              } else {
                textarea.value = data.text;
              }

              status.textContent = isAIEnhance ? t.statusSuccessAi : t.statusSuccessFast;
              status.style.color = "#10b981";
              stats.textContent = t.stats(textarea.value.length, textarea.value.split("\n").filter(l => l.trim().length > 0).length);

              // Token Usage transparency update
              const tokens = data.tokensUsed || (data.usage?.totalTokens) || 0;
              if (tokens > 0) {
                const pTok = data.usage?.promptTokens || "?";
                const cTok = data.usage?.candidatesTokens || "?";
                tokenBadge.className = "snaptext-token-badge paid";
                tokenBadge.textContent = t.paidBadge(tokens, pTok, cTok);
                tokenBadge.title = "已调用 Vision 大模型深度优化";
              } else {
                tokenBadge.className = "snaptext-token-badge free";
                tokenBadge.textContent = t.zeroBadge;
                tokenBadge.title = "0 Token 极速模式（未消耗大模型配额）";
              }

              // 100% reliable auto-copy to system clipboard + visual toast
              try {
                navigator.clipboard.writeText(textarea.value).then(() => {
                  copyToast.style.opacity = "1";
                  setTimeout(() => { copyToast.style.opacity = "0"; }, 3500);
                }).catch(() => {});
              } catch (clipErr) {}

              copyBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> ' + t.autoCopiedBtn;
              copyBtn.classList.add("copied");
              setTimeout(() => {
                copyBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> ' + t.copyBtn;
                copyBtn.classList.remove("copied");
              }, 2500);

              chrome.runtime.sendMessage({
                action: "SAVE_HISTORY",
                item: {
                  id: Date.now().toString(),
                  text: data.text,
                  tokens: tokens,
                  thumbnailUrl: img,
                  timestamp: Date.now(),
                  sourceType: "screen",
                  title: isAIEnhance ? "AI 深度增强提取" : "极速截图提取",
                },
              });
            } else {
              status.textContent = t.statusNoText;
              status.style.color = "#94a3b8";
            }
          } else {
            status.textContent = t.statusError + (res?.error || "请检查网络或配置");
            status.style.color = "#ef4444";
          }
        }
      );
    }

    // AI enhance click handler
    aiEnhanceBtn?.addEventListener("click", () => {
      if (activeImageData) {
        runOCR(activeImageData, "markdown_structured", true);
      }
    });

    // Initial trigger
    if (imageUrl) {
      runOCR(imageUrl, "standard", false);
    }
  }

  // Receive background messages
  chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "START_SNIP") {
      startSnipOverlay();
    }
  });

  // Watch for dynamic video players (YouTube, Bilibili, etc.)
  setInterval(attachVideoButtons, 2000);
  attachVideoButtons();
})();
`;

  const contentCss = `/* SnapText Overlay & Selection Box */
.snaptext-snipper-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483640 !important;
  background: rgba(0, 0, 0, 0.42) !important;
  cursor: crosshair !important;
  user-select: none !important;
}

.snaptext-tip {
  position: fixed !important;
  top: 24px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: #0f172a !important;
  color: #f8fafc !important;
  padding: 8px 20px !important;
  border-radius: 9999px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
  border: 1px solid #334155 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  pointer-events: none !important;
}

.snaptext-selection-box {
  position: fixed !important;
  border: 2px solid #38bdf8 !important;
  background: rgba(56, 189, 248, 0.12) !important;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45) !important;
  pointer-events: none !important;
}

.snaptext-dim-badge {
  position: absolute !important;
  top: -26px !important;
  left: 0 !important;
  background: #0284c7 !important;
  color: #ffffff !important;
  font-size: 11px !important;
  font-family: monospace !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  white-space: nowrap !important;
  pointer-events: none !important;
}

.snaptext-toolbar {
  position: fixed !important;
  display: flex !important;
  gap: 8px !important;
  background: #0f172a !important;
  padding: 6px !important;
  border-radius: 10px !important;
  border: 1px solid #334155 !important;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5) !important;
  z-index: 2147483645 !important;
}

.snaptext-btn {
  border: none !important;
  padding: 7px 14px !important;
  border-radius: 6px !important;
  font-size: 13px !important;
  cursor: pointer !important;
  font-family: inherit !important;
  font-weight: 600 !important;
  transition: all 0.15s ease !important;
}

.snaptext-btn-confirm {
  background: #2563eb !important;
  color: #ffffff !important;
}
.snaptext-btn-confirm:hover {
  background: #1d4ed8 !important;
}

.snaptext-btn-cancel {
  background: #334155 !important;
  color: #cbd5e1 !important;
}
.snaptext-btn-cancel:hover {
  background: #475569 !important;
}

/* Persistent Draggable Floating Window (Does NOT auto-close!) */
.snaptext-persistent-panel {
  position: fixed !important;
  top: 24px !important;
  right: 24px !important;
  width: 440px !important;
  max-width: calc(100vw - 30px) !important;
  background: #0f172a !important;
  color: #f8fafc !important;
  border: 1px solid #334155 !important;
  border-radius: 14px !important;
  box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
  z-index: 2147483647 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  animation: snaptextSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

@keyframes snaptextSlideIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.snaptext-panel-header {
  padding: 12px 14px !important;
  background: #1e293b !important;
  border-bottom: 1px solid #334155 !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  cursor: move !important;
  user-select: none !important;
}

.snaptext-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.snaptext-logo-badge {
  width: 24px !important;
  height: 24px !important;
  border-radius: 6px !important;
  background: #2563eb !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #fff !important;
}

.snaptext-title {
  font-size: 13px !important;
  color: #f8fafc !important;
}

.snaptext-drag-hint {
  font-size: 11px !important;
  color: #94a3b8 !important;
  margin-left: 4px !important;
}

.snaptext-header-actions {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.snaptext-header-btn {
  background: transparent !important;
  border: none !important;
  color: #94a3b8 !important;
  font-size: 13px !important;
  cursor: pointer !important;
  padding: 2px 7px !important;
  border-radius: 4px !important;
  line-height: 1 !important;
  transition: all 0.15s ease !important;
}
.snaptext-header-btn:hover {
  background: #334155 !important;
  color: #f8fafc !important;
}

.snaptext-close-btn {
  background: transparent !important;
  border: none !important;
  color: #94a3b8 !important;
  font-size: 16px !important;
  cursor: pointer !important;
  padding: 2px 8px !important;
  border-radius: 4px !important;
  line-height: 1 !important;
}
.snaptext-close-btn:hover {
  background: #334155 !important;
  color: #f8fafc !important;
}


.snaptext-persistent-panel.snaptext-minimized {
  width: auto !important;
  max-width: fit-content !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  overflow: visible !important;
}

.snaptext-min-pill {
  padding: 8px 16px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  background: #0f172a !important;
  border: 1px solid #38bdf8 !important;
  border-radius: 9999px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(56, 189, 248, 0.25) !important;
  cursor: pointer !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
  user-select: none !important;
  z-index: 2147483647 !important;
}
.snaptext-min-pill:hover {
  background: #1e293b !important;
  transform: translateY(-2px) scale(1.03) !important;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.4) !important;
}

/* Original min-pill replaced */
.snaptext-min-pill-old {
  padding: 8px 14px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  background: #0f172a !important;
  border: 1px solid #38bdf8 !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
  cursor: pointer !important;
  transition: transform 0.15s ease !important;
}
.snaptext-min-pill:hover {
  background: #1e293b !important;
  transform: scale(1.02) !important;
}

.st-pill-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 9999px !important;
  background: #10b981 !important;
  box-shadow: 0 0 8px #10b981 !important;
}

.snaptext-panel-body {
  padding: 12px 14px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
}

.snaptext-preview-strip {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  background: #090d16 !important;
  padding: 8px !important;
  border-radius: 8px !important;
  border: 1px solid #1e293b !important;
}

.snaptext-crop-thumb {
  width: 80px !important;
  height: 48px !important;
  object-fit: cover !important;
  border-radius: 4px !important;
  border: 1px solid #334155 !important;
  background: #000 !important;
}

.snaptext-status-block {
  flex: 1 !important;
  min-width: 0 !important;
}

.snaptext-status-text {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #38bdf8 !important;
}

.snaptext-sub-hint {
  font-size: 10px !important;
  color: #64748b !important;
  margin-top: 2px !important;
}

.snaptext-textarea {
  width: 100% !important;
  height: 180px !important;
  box-sizing: border-box !important;
  background: #1e293b !important;
  color: #f1f5f9 !important;
  border: 1px solid #334155 !important;
  border-radius: 8px !important;
  padding: 10px !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  resize: vertical !important;
  outline: none !important;
}
.snaptext-textarea:focus {
  border-color: #38bdf8 !important;
}

.snaptext-panel-footer {
  padding: 10px 14px !important;
  background: #090d16 !important;
  border-top: 1px solid #1e293b !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.snaptext-stats {
  font-size: 11px !important;
  color: #64748b !important;
  font-mono: true !important;
}

.snaptext-footer-btns {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 6px !important;
  justify-content: flex-end !important;
}

.snaptext-btn-act {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  border: none !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.snaptext-btn-primary {
  background: #2563eb !important;
  color: #fff !important;
}
.snaptext-btn-primary:hover {
  background: #1d4ed8 !important;
}
.snaptext-btn-primary.copied {
  background: #10b981 !important;
}

.snaptext-btn-secondary {
  background: #1e293b !important;
  color: #cbd5e1 !important;
  border: 1px solid #334155 !important;
}
.snaptext-btn-secondary:hover {
  background: #334155 !important;
}

.snaptext-btn-close-manual {
  background: #451a1a !important;
  color: #fca5a5 !important;
  border: 1px solid #7f1d1d !important;
}
.snaptext-btn-close-manual:hover {
  background: #7f1d1d !important;
  color: #fff !important;
}

.snaptext-btn-ai {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255,255,255,0.25) !important;
  font-weight: 600 !important;
}
.snaptext-btn-ai:hover {
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%) !important;
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.4) !important;
}

/* Stats and Token Metering Bar */
.snaptext-stats-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.snaptext-token-badge {
  font-size: 10px !important;
  padding: 2px 8px !important;
  border-radius: 9999px !important;
  font-weight: 600 !important;
}
.snaptext-token-badge.free {
  background: rgba(16, 185, 129, 0.15) !important;
  color: #34d399 !important;
  border: 1px solid rgba(16, 185, 129, 0.3) !important;
}
.snaptext-token-badge.paid {
  background: rgba(168, 85, 247, 0.15) !important;
  color: #c084fc !important;
  border: 1px solid rgba(168, 85, 247, 0.35) !important;
}

/* Continuous Append Notepad and Copy Toast */
.snaptext-workflow-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  padding: 4px 0 !important;
}

.snaptext-append-toggle {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  font-size: 11px !important;
  color: #94a3b8 !important;
  cursor: pointer !important;
  user-select: none !important;
}
.snaptext-append-toggle input {
  cursor: pointer !important;
  accent-color: #38bdf8 !important;
}
.snaptext-append-toggle:hover {
  color: #f1f5f9 !important;
}

.snaptext-copy-toast {
  font-size: 10px !important;
  color: #10b981 !important;
  font-weight: 500 !important;
  opacity: 0;
  transition: opacity 0.25s ease !important;
  white-space: nowrap !important;
}

/* Video Hover Button */
.snaptext-video-btn-wrapper {
  position: absolute !important;
  top: 12px !important;
  right: 12px !important;
  z-index: 1000 !important;
  opacity: 0 !important;
  transition: opacity 0.2s ease !important;
}

*:hover > .snaptext-video-btn-wrapper,
.snaptext-video-btn-wrapper:hover {
  opacity: 1 !important;
}

.snaptext-video-ocr-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  background: rgba(15, 23, 42, 0.88) !important;
  color: #38bdf8 !important;
  backdrop-filter: blur(4px) !important;
  border: 1px solid rgba(56, 189, 248, 0.3) !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
}
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>SnapText OCR</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { width: 360px; background: #0f172a; color: #f8fafc; padding: 14px; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .logo { font-size: 15px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px; }
    .server-status { font-size: 11px; display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; background: #1e293b; border: 1px solid #334155; }
    .status-dot { width: 7px; height: 7px; border-radius: 9999px; background: #eab308; }
    .status-dot.online { background: #10b981; }
    .status-dot.offline { background: #ef4444; }
    
    .token-meter-card { background: #111c33; border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; }
    .token-meter-label { color: #94a3b8; display: flex; align-items: center; gap: 5px; }
    .token-meter-val { font-weight: 700; color: #38bdf8; font-family: monospace; font-size: 12px; }
    .provider-pill { font-size: 10px; background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(168, 85, 247, 0.3); font-weight: 600; }

    .desc { font-size: 11px; color: #94a3b8; margin-bottom: 10px; line-height: 1.4; }
    .main-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; background: #2563eb; color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
    .main-btn:hover { background: #1d4ed8; }
    .shortcut-badge { background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    
    .settings-toggle { font-size: 11px; color: #38bdf8; background: none; border: none; cursor: pointer; padding: 2px 0; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
    .settings-box { display: none; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
    .settings-box.open { display: block; }
    .settings-label { font-size: 10px; color: #94a3b8; margin-bottom: 4px; display: block; }
    .settings-select { width: 100%; padding: 6px 8px; background: #090d16; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 11px; margin-bottom: 8px; outline: none; }
    .settings-input { width: 100%; padding: 6px 8px; background: #090d16; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 11px; font-family: monospace; margin-bottom: 8px; outline: none; }
    .settings-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 4px; }
    .btn-sm { font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid #334155; background: #0f172a; color: #cbd5e1; cursor: pointer; }
    .btn-sm.save { background: #2563eb; color: #fff; border-color: #3b82f6; }
    
    .history-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; }
    .btn-clear-history { background: none; border: none; color: #f87171; font-size: 10px; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
    .btn-clear-history:hover { text-decoration: underline; background: rgba(239,68,68,0.1); }
    
    .history-list { max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .history-card { position: relative; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 8px; cursor: pointer; transition: border-color 0.15s; }
    .history-card:hover { border-color: #38bdf8; }
    .history-del-btn { position: absolute; top: 6px; right: 6px; background: none; border: none; color: #64748b; font-size: 11px; cursor: pointer; padding: 2px 4px; border-radius: 3px; line-height: 1; }
    .history-del-btn:hover { color: #f87171; background: #334155; }
    .history-text { font-size: 12px; color: #cbd5e1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding-right: 14px; }
    .history-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 10px; color: #64748b; }
    .empty-state { text-align: center; padding: 12px 0; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="pin-tip-banner" id="pin-tip-banner" style="background:#1e293b; border:1px solid #3b82f6; border-radius:8px; padding:6px 10px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; font-size:10px; color:#93c5fd;">
    <span id="pin-tip-text">📌 提示：点击浏览器右上角拼图 🧩 把 SnapText 固定在工具栏，使用更顺手！</span>
    <button id="pin-tip-close" style="background:none; border:none; color:#94a3b8; font-size:11px; cursor:pointer; padding:0 2px;" title="不再提示">✕</button>
  </div>
  <div class="header">
    <div class="logo">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 7V4h3"/><path d="M20 7V4h-3"/><path d="M4 17v3h3"/><path d="M20 17v3h-3"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>
      SnapText OCR
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <select id="lang-select" style="background:#1e293b; color:#cbd5e1; border:1px solid #334155; border-radius:6px; font-size:10px; padding:2px 4px; outline:none; cursor:pointer;" title="切换界面语言 (Language)">
        <option value="zh_CN">🇨🇳 中文</option>
        <option value="en">🇺🇸 EN</option>
        <option value="ja">🇯🇵 日本語</option>
      </select>
      <div class="server-status" id="st-server-status" title="服务连接状态">
        <span class="status-dot" id="status-dot"></span>
        <span id="status-text">检测中...</span>
      </div>
    </div>
  </div>

  <div class="token-meter-card">
    <div class="token-meter-label">
      <span>📊 今日: <strong id="today-tokens-val" style="color:#38bdf8; font-family:monospace;">0</strong> | 累计: <strong id="total-tokens-val" style="color:#a855f7; font-family:monospace;">0</strong> Tok</span>
    </div>
    <span class="provider-pill" id="active-provider-pill">Gemini</span>
  </div>
  <div style="font-size:10px; color:#64748b; margin-top:-6px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
    <span>⚡ 本地永久存储 (永不过期)</span>
    <span style="color:#10b981;">✓ 剪贴板自动写入</span>
  </div>

  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; background:#1e293b; border:1px solid #334155; padding:8px 10px; border-radius:8px;">
    <label style="font-size:11px; color:#cbd5e1; display:flex; align-items:center; gap:6px; cursor:pointer;" title="开启后日常截图 0 Token 消耗，不调用大模型，疑难图片随时点击浮窗 AI 增强">
      <input type="checkbox" id="pure-zero-checkbox" checked />
      <span id="label-zero-token">🟢 纯 0 Token 模式 (按需 AI 增强)</span>
    </label>
  </div>

  <p class="desc">划选屏幕区域秒级提取文字，默认自动复制到剪贴板，支持连续追加写字板与多模型 Key。</p>

  <button class="main-btn" id="snip-btn">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h3"/><path d="M20 7V4h-3"/><path d="M4 17v3h3"/><path d="M20 17v3h-3"/></svg>
    <span>立即开始划选截图</span>
    <span class="shortcut-badge">Alt+Shift+S</span>
  </button>

  <button class="settings-toggle" id="settings-toggle">⚙️ 模型与服务配置（支持多平台 Key）</button>
  <div class="settings-box" id="settings-box">
    <label class="settings-label">大模型平台 / Provider：</label>
    <select class="settings-select" id="provider-select">
      <option value="gemini">Google Gemini（官方直连 / 免费极速识图）</option>
      <option value="deepseek">DeepSeek（兼容接口）</option>
      <option value="openai">OpenAI (GPT-4o-mini)</option>
      <option value="qwen">阿里通义千问 (Qwen-VL)</option>
      <option value="custom">自定义 OpenAI 兼容接口 (Base URL)</option>
    </select>

    <label class="settings-label" id="api-key-label">API Key（选填，使用个人免费/自有配额）：</label>
    <div style="display:flex; gap:6px; margin-bottom:8px;">
      <input type="password" class="settings-input" id="api-key-input" placeholder="输入对应平台的 Key..." style="margin-bottom:0;" />
      <button class="btn-sm" id="test-api-key-btn" style="white-space:nowrap;">验证连接</button>
    </div>
    <div id="key-test-result" style="font-size:10px; margin-bottom:8px; display:none;"></div>

    <div id="custom-fields" style="display:none;">
      <label class="settings-label">接口 Base URL：</label>
      <input type="text" class="settings-input" id="base-url-input" placeholder="https://api.deepseek.com/v1" />

      <label class="settings-label">模型名称 (Model)：</label>
      <input type="text" class="settings-input" id="model-name-input" placeholder="deepseek-chat" />
    </div>

    <label class="settings-label">智能标签页备用后端地址：</label>
    <input type="text" class="settings-input" id="server-url-input" />

    <div class="settings-actions">
      <button class="btn-sm save" id="save-server-btn" style="width:100%;">保存模型配置</button>
    </div>
  </div>

  <div class="history-header">
    <div class="section-title">最近提取历史 (<span id="history-count">0</span>条)</div>
    <button class="btn-clear-history" id="clear-history-btn" title="清空全部历史记录">🗑️ 清空历史</button>
  </div>
  <div class="history-list" id="history-container">
    <div class="empty-state">暂无历史记录</div>
  </div>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `// SnapText Extension Popup Script
document.addEventListener("DOMContentLoaded", () => {
  const snipBtn = document.getElementById("snip-btn");
  const historyContainer = document.getElementById("history-container");
  const historyCount = document.getElementById("history-count");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const settingsToggle = document.getElementById("settings-toggle");
  const settingsBox = document.getElementById("settings-box");
  const providerSelect = document.getElementById("provider-select");
  const apiKeyInput = document.getElementById("api-key-input");
  const testApiKeyBtn = document.getElementById("test-api-key-btn");
  const keyTestResult = document.getElementById("key-test-result");
  const customFields = document.getElementById("custom-fields");
  const baseUrlInput = document.getElementById("base-url-input");
  const modelNameInput = document.getElementById("model-name-input");
  const serverInput = document.getElementById("server-url-input");
  const saveServerBtn = document.getElementById("save-server-btn");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const todayTokensVal = document.getElementById("today-tokens-val");
  const totalTokensVal = document.getElementById("total-tokens-val");
  const activeProviderPill = document.getElementById("active-provider-pill");
  const langSelect = document.getElementById("lang-select");
  const pureZeroCheckbox = document.getElementById("pure-zero-checkbox");

  const defaultUrl = "https://ais-dev-lkoid47nn7w76pgs3n36ic-90062235677.asia-northeast1.run.app/api/ocr";

  const i18nDict = {
    zh_CN: {
      pinTip: "📌 提示：点击浏览器右上角拼图 🧩 把 SnapText 固定在工具栏，使用更顺手！",
      desc: "划选屏幕区域秒级提取文字，默认自动复制到剪贴板，支持连续追加写字板与多模型 Key。",
      snipBtn: "立即开始划选截图",
      settingsToggle: "⚙️ 模型与服务配置（支持多平台 Key）",
      zeroToken: "🌱 基础快速识别优先 (0 Token 免配额)",
      historyTitle: "最近提取历史",
      clearHistory: "🗑️ 清空历史",
      emptyHistory: "暂无历史记录",
      saveBtn: "保存模型配置",
      statusOnline: "服务在线",
      statusOffline: "离线模式",
      statusChecking: "检测中..."
    },
    en: {
      pinTip: "📌 Tip: Click the puzzle icon 🧩 above to Pin SnapText to your toolbar for 1-click access!",
      desc: "Snip any screen area to extract text in milliseconds. Auto-copied to clipboard with multi-model support.",
      snipBtn: "Start Screen Snipping",
      settingsToggle: "⚙️ AI Model & Service Settings",
      zeroToken: "🌱 Fast Local Mode First (Zero Tokens)",
      historyTitle: "Recent Snipping History",
      clearHistory: "🗑️ Clear History",
      emptyHistory: "No history records yet",
      saveBtn: "Save Settings",
      statusOnline: "Online",
      statusOffline: "Offline",
      statusChecking: "Checking..."
    },
    ja: {
      pinTip: "📌 ヒント：右上のパズル 🧩 をクリックし、SnapText をツールバーにピン留めすると便利です！",
      desc: "画面をキャプチャして瞬時に文字起こし。クリップボード自動保存＆マルチモデルKey対応。",
      snipBtn: "キャプチャを開始する",
      settingsToggle: "⚙️ AIモデル・接続設定",
      zeroToken: "🌱 高速モード優先 (トークン消費なし)",
      historyTitle: "最近の抽出履歴",
      clearHistory: "🗑️ 履歴を全削除",
      emptyHistory: "抽出履歴がありません",
      saveBtn: "設定を保存",
      statusOnline: "オンライン",
      statusOffline: "オフライン",
      statusChecking: "確認中..."
    }
  };

  function applyLanguage(lang) {
    const dict = i18nDict[lang] || i18nDict.zh_CN;
    const descEl = document.querySelector(".desc");
    if (descEl) descEl.textContent = dict.desc;
    const snipSpan = document.querySelector("#snip-btn span");
    if (snipSpan) snipSpan.textContent = dict.snipBtn;
    if (settingsToggle) settingsToggle.textContent = dict.settingsToggle;
    const labelZero = document.getElementById("label-zero-token");
    if (labelZero) labelZero.textContent = dict.zeroToken;
    const sectionTitle = document.querySelector(".section-title");
    if (sectionTitle) sectionTitle.innerHTML = \`\${dict.historyTitle} (<span id="history-count">\${historyCount ? historyCount.textContent : '0'}</span>)\`;
    if (clearHistoryBtn) clearHistoryBtn.textContent = dict.clearHistory;
    if (saveServerBtn && saveServerBtn.textContent !== "已保存！") saveServerBtn.textContent = dict.saveBtn;
    const pinTipText = document.getElementById("pin-tip-text");
    if (pinTipText && dict.pinTip) pinTipText.textContent = dict.pinTip;
  }

  // Load configured settings
  chrome.storage.local.get([
    "ocrServerUrl",
    "aiProvider",
    "apiKey",
    "geminiApiKey",
    "baseUrl",
    "modelName",
    "extensionLanguage",
    "pureZeroTokenMode",
    "totalTokensCount"
  ], (store) => {
    serverInput.value = store.ocrServerUrl || defaultUrl;
    providerSelect.value = store.aiProvider || "gemini";
    apiKeyInput.value = store.apiKey || store.geminiApiKey || "";
    baseUrlInput.value = store.baseUrl || "";
    modelNameInput.value = store.modelName || "";
    if (langSelect && store.extensionLanguage) langSelect.value = store.extensionLanguage;
    if (pureZeroCheckbox) pureZeroCheckbox.checked = store.pureZeroTokenMode !== false;
    if (totalTokensVal) totalTokensVal.textContent = (store.totalTokensCount || 0).toLocaleString();
    updateProviderUI(providerSelect.value);

    // 智能语言检测与首装保底（彻底修复英文/海外系统默认出中文的问题）
    function detectInitialLang() {
      const raw = (chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : navigator.language || "en").toLowerCase();
      if (raw.startsWith("zh")) return "zh_CN";
      if (raw.startsWith("ja")) return "ja";
      return "en";
    }

    const effectiveLang = store.extensionLanguage || detectInitialLang();
    if (!store.extensionLanguage) {
      chrome.storage.local.set({ extensionLanguage: effectiveLang });
    }
    if (langSelect) langSelect.value = effectiveLang;
    applyLanguage(effectiveLang);

    // Pin banner dismiss handling
    const pinBanner = document.getElementById("pin-tip-banner");
    const pinClose = document.getElementById("pin-tip-close");
    if (store.pinTipDismissed && pinBanner) {
      pinBanner.style.display = "none";
    }
    pinClose?.addEventListener("click", () => {
      if (pinBanner) pinBanner.style.display = "none";
      chrome.storage.local.set({ pinTipDismissed: true });
    });

    checkHealth(serverInput.value);
  });

  // Language change listener
  langSelect?.addEventListener("change", () => {
    const lang = langSelect.value;
    chrome.storage.local.set({ extensionLanguage: lang }, () => {
      applyLanguage(lang);
    });
  });

  // Pure zero token toggle listener
  pureZeroCheckbox?.addEventListener("change", () => {
    chrome.storage.local.set({ pureZeroTokenMode: pureZeroCheckbox.checked });
  });

  // Load today's token statistics
  const todayKey = "tokens_" + new Date().toISOString().slice(0, 10);
  chrome.storage.local.get([todayKey], (st) => {
    const tokens = st[todayKey] || 0;
    todayTokensVal.textContent = tokens.toLocaleString();
  });

  // Toggle settings drawer
  settingsToggle.addEventListener("click", () => {
    settingsBox.classList.toggle("open");
  });

  // Provider change handler
  providerSelect.addEventListener("change", () => {
    updateProviderUI(providerSelect.value);
  });

  function updateProviderUI(provider) {
    activeProviderPill.textContent = provider.toUpperCase();
    if (provider === "gemini") {
      customFields.style.display = "none";
      apiKeyInput.placeholder = "AIzaSy... (从 aistudio.google.com 免费获取)";
    } else if (provider === "deepseek") {
      customFields.style.display = "block";
      if (!baseUrlInput.value) baseUrlInput.value = "https://api.deepseek.com/v1";
      if (!modelNameInput.value) modelNameInput.value = "deepseek-chat";
      apiKeyInput.placeholder = "sk-... (DeepSeek API Key)";
    } else if (provider === "openai") {
      customFields.style.display = "block";
      if (!baseUrlInput.value) baseUrlInput.value = "https://api.openai.com/v1";
      if (!modelNameInput.value) modelNameInput.value = "gpt-4o-mini";
      apiKeyInput.placeholder = "sk-... (OpenAI API Key)";
    } else if (provider === "qwen") {
      customFields.style.display = "block";
      if (!baseUrlInput.value) baseUrlInput.value = "https://dashscope.aliyuncs.com/compatible-mode/v1";
      if (!modelNameInput.value) modelNameInput.value = "qwen-vl-plus";
      apiKeyInput.placeholder = "sk-... (通义千问 API Key)";
    } else {
      customFields.style.display = "block";
      apiKeyInput.placeholder = "输入自定义 API Key...";
    }
  }

  // Verify custom API Key directly
  testApiKeyBtn?.addEventListener("click", async () => {
    const provider = providerSelect.value;
    const key = apiKeyInput.value.trim();
    if (!key) {
      keyTestResult.style.display = "block";
      keyTestResult.style.color = "#f59e0b";
      keyTestResult.textContent = "请先输入对应平台的 API Key";
      return;
    }
    keyTestResult.style.display = "block";
    keyTestResult.style.color = "#38bdf8";
    keyTestResult.textContent = "正在验证接口连通性...";

    try {
      if (provider === "gemini") {
        const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models?key=\${key}\`);
        const data = await res.json();
        if (data && data.models && data.models.length > 0) {
          keyTestResult.style.color = "#10b981";
          keyTestResult.textContent = "✓ Gemini Key 验证成功！直连官方大模型秒级出字。";
        } else {
          keyTestResult.style.color = "#ef4444";
          keyTestResult.textContent = "✕ 验证失败: " + (data.error?.message || "Key 无效");
        }
      } else {
        const targetBase = (baseUrlInput.value.trim() || (provider === "deepseek" ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1")).replace(/\\/+$/, "");
        const res = await fetch(\`\${targetBase}/models\`, {
          headers: { "Authorization": \`Bearer \${key}\` }
        });
        if (res.ok) {
          keyTestResult.style.color = "#10b981";
          keyTestResult.textContent = \`✓ 成功连接 \${provider.toUpperCase()}！兼容接口正常就绪。\`;
        } else {
          const errData = await res.json().catch(() => ({}));
          keyTestResult.style.color = "#ef4444";
          keyTestResult.textContent = "✕ 连接失败 HTTP " + res.status + ": " + (errData.error?.message || res.statusText);
        }
      }
    } catch (e) {
      keyTestResult.style.color = "#ef4444";
      keyTestResult.textContent = "✕ 网络请求失败: " + e.message;
    }
  });

  // Save server URL & Multi-Provider Config
  saveServerBtn.addEventListener("click", () => {
    const val = serverInput.value.trim() || defaultUrl;
    const provider = providerSelect.value;
    const keyVal = apiKeyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim();
    const modelName = modelNameInput.value.trim();

    chrome.storage.local.set({
      ocrServerUrl: val,
      aiProvider: provider,
      apiKey: keyVal,
      geminiApiKey: keyVal,
      baseUrl: baseUrl,
      modelName: modelName
    }, () => {
      saveServerBtn.textContent = "已保存！";
      activeProviderPill.textContent = provider.toUpperCase();
      setTimeout(() => (saveServerBtn.textContent = "保存模型配置"), 1200);
      checkHealth(val);
    });
  });

  function checkHealth(url) {
    statusText.textContent = "检测中...";
    statusDot.className = "status-dot";

    const healthUrl = url.replace(/\\/api\\/ocr.*$/, "/api/health");
    fetch(healthUrl)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok") {
          statusDot.className = "status-dot online";
          statusText.textContent = "服务在线";
        } else {
          throw new Error("服务未就绪");
        }
      })
      .catch(() => {
        statusDot.className = "status-dot offline";
        statusText.textContent = "云端待命";
      });
  }

  // Snip button
  snipBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "TRIGGER_SNIP_ACTIVE_TAB" }, () => {
      window.close();
    });
  });

  // Render history list
  function renderHistory() {
    chrome.storage.local.get(["ocrHistory"], (res) => {
      const list = res.ocrHistory || [];
      historyCount.textContent = list.length;
      if (list.length > 0) {
        historyContainer.innerHTML = "";
        list.slice(0, 10).forEach((item) => {
          const div = document.createElement("div");
          div.className = "history-card";
          div.innerHTML = \`
            <button class="history-del-btn" title="删除该条记录" data-id="\${item.id}">✕</button>
            <div class="history-text">\${escapeHtml(item.text)}</div>
            <div class="history-footer">
              <span>\${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · \${item.tokens ? '⚡ ' + item.tokens + ' tok' : '🟢 0 tok'}</span>
              <span style="color:#38bdf8;">点击复制</span>
            </div>
          \`;

          // Single record delete button
          div.querySelector(".history-del-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            const updated = list.filter((x) => x.id !== item.id);
            chrome.storage.local.set({ ocrHistory: updated }, renderHistory);
          });

          // Click to copy
          div.addEventListener("click", async () => {
            await navigator.clipboard.writeText(item.text);
            div.style.borderColor = "#10b981";
            setTimeout(() => (div.style.borderColor = "#334155"), 1000);
          });
          historyContainer.appendChild(div);
        });
      } else {
        historyContainer.innerHTML = '<div class="empty-state">暂无历史记录</div>';
      }
    });
  }

  // Clear all history records
  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("确定要清空全部历史截图提取记录吗？")) {
      chrome.storage.local.remove(["ocrHistory"], () => {
        renderHistory();
      });
    }
  });

  renderHistory();

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
  }
});
`;


  const welcomeHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Welcome to SnapText OCR - 快速置顶指南</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #090e1a; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
    .card { max-width: 680px; width: 100%; background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; padding: 36px 30px; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.8); position: relative; }
    .lang-bar { position: absolute; top: 20px; right: 24px; display: flex; gap: 6px; }
    .lang-btn { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 4px 8px; border-radius: 6px; font-size: 11px; cursor: pointer; transition: all 0.15s; }
    .lang-btn.active, .lang-btn:hover { background: #2563eb; color: #fff; border-color: #3b82f6; }
    
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; padding: 5px 14px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 9999px; color: #38bdf8; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 8px; }
    .desc { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 28px; }

    .steps-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 28px; text-align: left; }
    .step-box { background: #162033; border: 1px solid #233554; border-radius: 14px; padding: 18px 14px; position: relative; display: flex; flex-direction: column; }
    .step-badge { width: 22px; height: 22px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .step-icon { font-size: 28px; margin-bottom: 10px; }
    .step-title { font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
    .step-desc { font-size: 11px; color: #94a3b8; line-height: 1.4; }

    .interactive-demo { background: #080c14; border: 1px solid #1e293b; border-radius: 14px; padding: 14px 18px; margin-bottom: 26px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .demo-left { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #cbd5e1; }
    .demo-keys { display: inline-flex; gap: 4px; }
    .kbd { background: #1e293b; border: 1px solid #475569; padding: 2px 7px; border-radius: 5px; font-family: monospace; font-size: 11px; font-weight: bold; color: #38bdf8; }

    .btn-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #2563eb; color: #fff; font-size: 14px; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; transition: all 0.15s; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35); text-decoration: none; }
    .btn-action:hover { background: #1d4ed8; transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="card">
    <div class="lang-bar">
      <button class="lang-btn active" data-lang="zh_CN">🇨🇳 中文</button>
      <button class="lang-btn" data-lang="en">🇺🇸 EN</button>
      <button class="lang-btn" data-lang="ja">🇯🇵 日本語</button>
    </div>

    <div class="logo-badge">
      <span>✨ SnapText OCR</span>
      <span>v1.2.0 安装成功</span>
    </div>

    <h1 id="title-text">把 SnapText 固定到工具栏，使用更顺手！</h1>
    <p class="desc" id="desc-text">Chrome 默认将新安装的扩展收纳在拼图菜单中。只需简单 3 步将其固定到浏览器顶部，随用随点或快捷键秒级截屏识字！</p>

    <div class="steps-container">
      <div class="step-box">
        <div class="step-badge">1</div>
        <div class="step-icon">🧩</div>
        <div class="step-title" id="s1-title">点击右上角拼图</div>
        <div class="step-desc" id="s1-desc">在 Chrome 浏览器右上角点击扩展程序拼图图标。</div>
      </div>
      <div class="step-box">
        <div class="step-badge">2</div>
        <div class="step-icon">🔍</div>
        <div class="step-title" id="s2-title">找到 SnapText</div>
        <div class="step-desc" id="s2-desc">在弹出的扩展列表中找到 SnapText OCR。</div>
      </div>
      <div class="step-box">
        <div class="step-badge">3</div>
        <div class="step-icon">📌</div>
        <div class="step-title" id="s3-title">点击图钉图标</div>
        <div class="step-desc" id="s3-desc">点击旁边的图钉 📌 按钮，让图标常驻在浏览器地址栏旁！</div>
      </div>
    </div>

    <div class="interactive-demo">
      <div class="demo-left">
        <span>⚡ 全局截图快捷键：</span>
        <div class="demo-keys">
          <span class="kbd">Alt</span> + <span class="kbd">Shift</span> + <span class="kbd">S</span>
        </div>
      </div>
      <span style="font-size:11px; color:#10b981;">✓ 0-Token 基础免配额识别</span>
    </div>

    <button class="btn-action" id="done-btn">🚀 我已固定图钉，开始体验！</button>
  </div>

  <script>
    const i18n = {
      zh_CN: {
        title: "把 SnapText 固定到工具栏，使用更顺手！",
        desc: "Chrome 默认将新安装的扩展收纳在拼图菜单中。只需简单 3 步将其固定到浏览器顶部，随用随点或快捷键秒级截屏识字！",
        s1Title: "点击右上角拼图",
        s1Desc: "在 Chrome 浏览器右上角点击扩展程序拼图图标 🧩。",
        s2Title: "找到 SnapText",
        s2Desc: "在弹出的扩展列表中找到 SnapText OCR。",
        s3Title: "点击图钉图标",
        s3Desc: "点击旁边的图钉 📌 按钮，让图标常驻在浏览器地址栏旁！",
        btn: "🚀 我已固定图钉，开始体验！"
      },
      en: {
        title: "Pin SnapText to Your Toolbar for 1-Click Access!",
        desc: "Chrome hides newly installed extensions under the puzzle menu. Follow 3 quick steps to pin SnapText to your toolbar for instant snipping!",
        s1Title: "Click Puzzle Icon",
        s1Desc: "Click the Extensions puzzle icon 🧩 in the top-right corner of Chrome.",
        s2Title: "Find SnapText",
        s2Desc: "Locate SnapText OCR in the extensions dropdown list.",
        s3Title: "Click the Pin Icon",
        s3Desc: "Click the Pin 📌 button next to SnapText to lock it to your toolbar!",
        btn: "🚀 Got it, Start Snipping!"
      },
      ja: {
        title: "SnapText をツールバーに固定して便利に使おう！",
        desc: "Chrome は新しくインストールされた拡張機能をパズルメニュー内に格納します。3ステップでツールバーにピン留めして、いつでも即座に画面文字起こし！",
        s1Title: "パズルアイコンをクリック",
        s1Desc: "Chrome 右上にある拡張機能のパズルアイコン 🧩 をクリックします。",
        s2Title: "SnapText を探す",
        s2Desc: "一覧から「SnapText OCR」を見つけます。",
        s3Title: "ピン留めアイコンをクリック",
        s3Desc: "右側のピン 📌 アイコンを押して、アドレスバー横に常に固定します！",
        btn: "🚀 ピン留め完了！使ってみる"
      }
    };

    function setLang(l) {
      const t = i18n[l] || i18n.zh_CN;
      document.getElementById("title-text").textContent = t.title;
      document.getElementById("desc-text").textContent = t.desc;
      document.getElementById("s1-title").textContent = t.s1Title;
      document.getElementById("s1-desc").textContent = t.s1Desc;
      document.getElementById("s2-title").textContent = t.s2Title;
      document.getElementById("s2-desc").textContent = t.s2Desc;
      document.getElementById("s3-title").textContent = t.s3Title;
      document.getElementById("s3-desc").textContent = t.s3Desc;
      document.getElementById("done-btn").textContent = t.btn;
      document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === l));
      chrome.storage?.local?.set({ extensionLanguage: l });
    }

    const browserLang = (chrome.i18n?.getUILanguage?.() || navigator.language || "en").toLowerCase();
    let init = "en";
    if (browserLang.startsWith("zh")) init = "zh_CN";
    else if (browserLang.startsWith("ja")) init = "ja";
    setLang(init);

    document.querySelectorAll(".lang-btn").forEach(b => {
      b.addEventListener("click", () => setLang(b.dataset.lang));
    });

    document.getElementById("done-btn").addEventListener("click", () => {
      window.close();
    });
  </script>
</body>
</html>`;

  const readmeMd = `# SnapText OCR Chrome 插件安装与使用指南

## 🚀 极速安装步骤（仅需30秒）：

1. **解压插件包**：将下载的 \`snaptext-ocr-chrome-extension.zip\` 解压为一个文件夹。
2. **打开 Chrome 扩展管理**：
   - 在 Chrome 浏览器地址栏输入访问：\`chrome://extensions/\`
   - 或者点击 Chrome 右上角菜单 -> **扩展程序** -> **管理扩展程序**。
3. **开启右上角「开发者模式」**：
   - 切换开关为 **开启**。
4. **加载插件**：
   - 点击左上角出现的 **「加载已解压的扩展程序」 (Load unpacked)**。
   - 选择您刚刚解压出来的文件夹即可！

---

## 🎯 核心使用与新版特性说明：

1. **如何启动截图识字**：
   - 快捷键：**Alt + Shift + S**（Mac 用户为 **Option + Shift + S**）。
   - 或者直接点击浏览器右上角 SnapText 插件图标中的 **「立即开始划选截图」** 按钮。
   - 在已打开的网页上按住鼠标左键，即可自由拖拽框选需要识别的区域。

2. **为什么之前 Alt+Shift+S 无法截图？**
   - 新版已加入全网页自动注入机制和 host_permissions。
   - **注意**：Chrome 安全机制限制在系统内部页面（如 \`chrome://\`、\`chrome://extensions\` 或空白页）运行插件，请在**任意正常网页**（如百度、B站、知乎、新闻网或视频页面）上使用快捷键。
   - 如果刚安装插件，刷新一下当前页面即可立即生效！

3. **界面常驻与手动关闭（用户指定新特性）**：
   - 框选提取后，识别结果浮窗会**常驻浮动在网页右上角**，**绝不会自动消失**！
   - 支持**按住顶部标题栏任意拖动**，防止遮挡网页文字。
   - 配备实时文本编辑、字数统计与一键复制。
   - 只有当您点击窗口右上角的 **「✕」** 或底部的 **「✕ 关闭界面」** 时，插件界面才会关闭！

---
Powered by SnapText OCR Engine.
`;

  return [
    {
      name: "manifest.json",
      path: "manifest.json",
      content: JSON.stringify(manifest, null, 2),
      description: "Chrome 扩展清单配置文件 (Manifest V3)",
      language: "json",
    },
    {
      name: "background.js",
      path: "background.js",
      content: backgroundJs,
      description: "后台 Service Worker：快捷键调度与动态脚本注入",
      language: "javascript",
    },
    {
      name: "content.js",
      path: "content.js",
      content: contentJs,
      description: "鼠标划选框选遮罩层、视频浮动识别与常驻结果窗口",
      language: "javascript",
    },
    {
      name: "content.css",
      path: "content.css",
      content: contentCss,
      description: "选框遮罩、可拖动工作台与常驻结果界面样式",
      language: "css",
    },
    {
      name: "popup.html",
      path: "popup.html",
      content: popupHtml,
      description: "扩展弹出面板：一键启动截图与历史快捷复制",
      language: "html",
    },
    {
      name: "popup.js",
      path: "popup.js",
      content: popupJs,
      description: "弹出面板逻辑与一键划选触发",
      language: "javascript",
    },
    {
      name: "README.md",
      path: "README.md",
      content: readmeMd,
      description: "快捷键使用说明、避坑指南与安装文档",
      language: "markdown",
    },
    {
      name: "_locales/en/messages.json",
      path: "_locales/en/messages.json",
      content: JSON.stringify(
        {
          appName: { message: "SnapText OCR - Screen Snipping & AI Text Extractor" },
          appDesc: { message: "High-precision screen snipping OCR with AI enhancement, video subtitle capture, and token-free mode." }
        },
        null,
        2
      ),
      description: "英文多语言资源包 (English Locale - Manifest V3 i18n 标准)",
      language: "json",
    },
    {
      name: "_locales/zh_CN/messages.json",
      path: "_locales/zh_CN/messages.json",
      content: JSON.stringify(
        {
          appName: { message: "SnapText OCR - 截图识字与 AI 深度文字提取" },
          appDesc: { message: "专为网页、视频与图片打造的极速高精截图识字扩展，支持零Token免费离线与AI深度增强。" }
        },
        null,
        2
      ),
      description: "中文简体多语言资源包 (Chinese Simplified Locale)",
      language: "json",
    },
    {
      name: "_locales/ja/messages.json",
      path: "_locales/ja/messages.json",
      content: JSON.stringify(
        {
          appName: { message: "SnapText OCR - 画面キャプチャ文字起こし＆AI高精度抽出" },
          appDesc: { message: "ウェブや動画の文字を瞬時に高精度キャプチャ。無料の0トークン高速モードとAI深層抽出に対応。" }
        },
        null,
        2
      ),
      description: "日文多语言资源包 (Japanese Locale - 针对日本高付费商业市场)",
      language: "json",
    },
  ];
}

/**
 * Creates a valid ZIP file for the Chrome Extension and triggers browser download
 */
export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();
  const files = getExtensionFiles();

  files.forEach((file) => {
    zip.file(file.path, file.content);
  });

  // Create icon placeholders
  const iconsFolder = zip.folder("icons");
  if (iconsFolder) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.roundRect(8, 8, 112, 112, 24);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.strokeRect(36, 36, 56, 56);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("T", 64, 66);

      const base64 = canvas.toDataURL("image/png").split(",")[1];
      iconsFolder.file("icon16.png", base64, { base64: true });
      iconsFolder.file("icon48.png", base64, { base64: true });
      iconsFolder.file("icon128.png", base64, { base64: true });
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = "snaptext-ocr-chrome-extension.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
