import fs from "fs";
import path from "path";

const targetPath = path.resolve("./src/utils/extensionGenerator.ts");
let code = fs.readFileSync(targetPath, "utf-8");

// Load the user JSON
const userJsonPath = path.resolve("./src/locales/i18nData.json");
const userI18n = JSON.parse(fs.readFileSync(userJsonPath, "utf-8"));

// 1. Rebuild CONTENT_I18N in contentJs using the exact strings from userI18n
const startMarker = "  const CONTENT_I18N = {";
const endMarker = "  let currentLang = \"zh_CN\";";

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find CONTENT_I18N markers");
  process.exit(1);
}

const zh = userI18n.zh;
const en = userI18n.en;
const ja = userI18n.ja;

const updatedContentI18n = `  const CONTENT_I18N = {
    zh_CN: {
      overlayTip: ${JSON.stringify(zh.snip.hint)},
      cancel: ${JSON.stringify(zh.snip.cancel)},
      confirmOcr: ${JSON.stringify(zh.snip.confirm)},
      videoBtn: "视频识字",
      videoStatus: "⚡ 正在提取视频字幕/画面文字...",
      tabTask: ${JSON.stringify(zh.panel.tabWorkspace)},
      tabDash: ${JSON.stringify(zh.panel.tabUsage)},
      minBtnTitle: ${JSON.stringify(zh.panel.minimize)},
      closeBtnTitle: ${JSON.stringify(zh.panel.close)},
      pillText: ${JSON.stringify(zh.capsule.label)},
      pillExpand: ${JSON.stringify(zh.capsule.expand)},
      subHint: "界面已固定常驻，最小化或在看板间切换绝不丢任务",
      placeholder: "正在识别文字...",
      stats: function(chars, lines) { return "共 " + chars + " 字 / " + lines + " 行"; },
      zeroBadge: ${JSON.stringify(zh.mode.freeToggle)},
      zeroTooltip: ${JSON.stringify(zh.mode.freeTooltip)},
      paidBadge: function(tok, p, c) { return "⚡ 消耗 " + tok + " Tokens (" + p + " in / " + c + " out)"; },
      appendMode: ${JSON.stringify(zh.mode.appendToggle)},
      appendTitle: ${JSON.stringify(zh.mode.freeTooltip)},
      copyToast: ${JSON.stringify(zh.toast.autoCopied)},
      resnipBtn: ${JSON.stringify(zh.panel.snipAgain)},
      mergeBtn: ${JSON.stringify(zh.panel.mergeLines)},
      aiEnhanceBtn: function(tokens) { return "✨ AI 深度增强（预估 ~" + tokens + " Tokens)"; },
      aiEnhanceTitle: "调用大模型深度增强排版、纠错与识别手写体/公式",
      copyBtn: ${JSON.stringify(zh.panel.copy)},
      copiedBtn: ${JSON.stringify(zh.panel.copied)},
      autoCopiedBtn: ${JSON.stringify(zh.panel.copied)},
      closeManual: ${JSON.stringify(zh.panel.close)},
      dashToday: "📊 今日模型消耗",
      dashTotal: "⚡ 历史总计消耗",
      dashStorageNote: "💡 <strong>存储说明：</strong>Token 统计与提取历史保存在 Chrome 本地存储中（chrome.storage.local），<strong>永久保留且永不过期</strong>，直到您点击下方按钮清空。",
      dashHistoryTitle: "最近截图提取历史",
      dashClearBtn: ${JSON.stringify(zh.history.clear)},
      dashEmpty: ${JSON.stringify(zh.history.empty)},
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
      overlayTip: ${JSON.stringify(en.snip.hint)},
      cancel: ${JSON.stringify(en.snip.cancel)},
      confirmOcr: ${JSON.stringify(en.snip.confirm)},
      videoBtn: "Video Snip",
      videoStatus: "⚡ Extracting video frame text...",
      tabTask: ${JSON.stringify(en.panel.tabWorkspace)},
      tabDash: ${JSON.stringify(en.panel.tabUsage)},
      minBtnTitle: ${JSON.stringify(en.panel.minimize)},
      closeBtnTitle: ${JSON.stringify(en.panel.close)},
      pillText: ${JSON.stringify(en.capsule.label)},
      pillExpand: ${JSON.stringify(en.capsule.expand)},
      subHint: "Persistent workspace: task will never be lost across tabs",
      placeholder: "Extracting text...",
      stats: function(chars, lines) { return chars + " chars / " + lines + " lines"; },
      zeroBadge: ${JSON.stringify(en.mode.freeToggle)},
      zeroTooltip: ${JSON.stringify(en.mode.freeTooltip)},
      paidBadge: function(tok, p, c) { return "⚡ Used " + tok + " Tokens (" + p + " in / " + c + " out)"; },
      appendMode: ${JSON.stringify(en.mode.appendToggle)},
      appendTitle: ${JSON.stringify(en.mode.freeTooltip)},
      copyToast: ${JSON.stringify(en.toast.autoCopied)},
      resnipBtn: ${JSON.stringify(en.panel.snipAgain)},
      mergeBtn: ${JSON.stringify(en.panel.mergeLines)},
      aiEnhanceBtn: function(tokens) { return "✨ AI Enhance (~" + tokens + " tokens)"; },
      aiEnhanceTitle: "Invoke vision model for deep formatting, handwriting & math",
      copyBtn: ${JSON.stringify(en.panel.copy)},
      copiedBtn: ${JSON.stringify(en.panel.copied)},
      autoCopiedBtn: ${JSON.stringify(en.panel.copied)},
      closeManual: ${JSON.stringify(en.panel.close)},
      dashToday: "📊 Today's Model Tokens",
      dashTotal: "⚡ Lifetime Total Tokens",
      dashStorageNote: "💡 <strong>Storage Note:</strong> Token metrics and history are securely saved in Chrome local storage (chrome.storage.local) and <strong>never expire</strong> until cleared.",
      dashHistoryTitle: "Recent Snipping History",
      dashClearBtn: ${JSON.stringify(en.history.clear)},
      dashEmpty: ${JSON.stringify(en.history.empty)},
      dashBack: "← Back to Active Workspace",
      confirmClear: "Clear all screenshot extraction history?",
      clickToCopy: "Click to copy",
      statusRunningFast: "⚡ Fast extracting (avg < 1s)...",
      statusRunningAi: "✨ AI model analyzing and structuring...",
      statusSuccessFast: "✓ ⚡ Extracted successfully!",
      statusSuccessAi: "✓ ✨ AI Enhance Complete!",
      statusNoText: "No visible text detected in selected area",
      statusError: "Extraction error: "
    },
    ja: {
      overlayTip: ${JSON.stringify(ja.snip.hint)},
      cancel: ${JSON.stringify(ja.snip.cancel)},
      confirmOcr: ${JSON.stringify(ja.snip.confirm)},
      videoBtn: "動画識字",
      videoStatus: "⚡ 動画フレームから文字を抽出中...",
      tabTask: ${JSON.stringify(ja.panel.tabWorkspace)},
      tabDash: ${JSON.stringify(ja.panel.tabUsage)},
      minBtnTitle: ${JSON.stringify(ja.panel.minimize)},
      closeBtnTitle: ${JSON.stringify(ja.panel.close)},
      pillText: ${JSON.stringify(ja.capsule.label)},
      pillExpand: ${JSON.stringify(ja.capsule.expand)},
      subHint: "常駐パネル：タブ切替や最小化でも作業内容が消えません",
      placeholder: "テキストを認識中...",
      stats: function(chars, lines) { return "合計 " + chars + " 文字 / " + lines + " 行"; },
      zeroBadge: ${JSON.stringify(ja.mode.freeToggle)},
      zeroTooltip: ${JSON.stringify(ja.mode.freeTooltip)},
      paidBadge: function(tok, p, c) { return "⚡ 消費 " + tok + " トークン (" + p + " in / " + c + " out)"; },
      appendMode: ${JSON.stringify(ja.mode.appendToggle)},
      appendTitle: ${JSON.stringify(ja.mode.freeTooltip)},
      copyToast: ${JSON.stringify(ja.toast.autoCopied)},
      resnipBtn: ${JSON.stringify(ja.panel.snipAgain)},
      mergeBtn: ${JSON.stringify(ja.panel.mergeLines)},
      aiEnhanceBtn: function(tokens) { return "✨ AI強化（約" + tokens + "トークン）"; },
      aiEnhanceTitle: "大モデルで数式・手書き文字・レイアウトを最適化",
      copyBtn: ${JSON.stringify(ja.panel.copy)},
      copiedBtn: ${JSON.stringify(ja.panel.copied)},
      autoCopiedBtn: ${JSON.stringify(ja.panel.copied)},
      closeManual: ${JSON.stringify(ja.panel.close)},
      dashToday: "📊 本日のモデル消費",
      dashTotal: "⚡ 累計消費トークン",
      dashStorageNote: "💡 <strong>保存仕様：</strong>トークン消費と抽出履歴はChromeローカルストレージ（chrome.storage.local）に<strong>永久保存</strong>され、手動削除するまで消えません。",
      dashHistoryTitle: "最近の抽出履歴",
      dashClearBtn: ${JSON.stringify(ja.history.clear)},
      dashEmpty: ${JSON.stringify(ja.history.empty)},
      dashBack: "← ワークスペースに戻る",
      confirmClear: "すべての抽出履歴を削除しますか？",
      clickToCopy: "クリックでコピー",
      statusRunningFast: "⚡ 高速認識中 (平均1秒未満)...",
      statusRunningAi: "✨ AI大モデルで深層解析・構造化中...",
      statusSuccessFast: "✓ ⚡ 抽出完了！",
      statusSuccessAi: "✓ ✨ AI強化が完了しました！",
      statusNoText: "選択領域に文字が検出されませんでした",
      statusError: "OCRエラー: "
    }
  };

`;

code = code.slice(0, startIndex) + updatedContentI18n + code.slice(endIndex);

// 2. Also update i18nDict in popup.js with user's exact wording
const popupDictStart = "  const i18nDict = {";
const popupDictEnd = "  function applyLanguage(lang) {";

const pStart = code.indexOf(popupDictStart);
const pEnd = code.indexOf(popupDictEnd);

if (pStart !== -1 && pEnd !== -1) {
  const updatedPopupDict = `  const i18nDict = {
    zh_CN: {
      pinTip: "📌 提示：点击浏览器右上角拼图 🧩 把 SnapText 固定在工具栏，使用更顺手！",
      desc: "划选屏幕区域秒级提取文字，默认自动复制到剪贴板，支持连续追加写字板与多模型 Key。",
      snipBtn: "立即开始划选截图",
      settingsToggle: "⚙️ 模型与服务配置（支持多平台 Key）",
      zeroToken: ${JSON.stringify(zh.mode.freeToggle)},
      zeroTooltip: ${JSON.stringify(zh.mode.freeTooltip)},
      historyTitle: "最近提取历史",
      clearHistory: ${JSON.stringify(zh.history.clear)},
      emptyHistory: ${JSON.stringify(zh.history.empty)},
      saveBtn: "保存模型配置",
      statusOnline: ${JSON.stringify(zh.popup.statusOnline)},
      statusOffline: "离线模式",
      statusChecking: ${JSON.stringify(zh.popup.statusChecking)},
      testBtn: ${JSON.stringify(zh.popup.testConnection)}
    },
    en: {
      pinTip: "📌 Tip: Click the puzzle icon 🧩 above to Pin SnapText to your toolbar for 1-click access!",
      desc: "Snip any screen area to extract text in milliseconds. Auto-copied to clipboard with multi-model support.",
      snipBtn: "Start Screen Snipping",
      settingsToggle: "⚙️ AI Model & Service Settings",
      zeroToken: ${JSON.stringify(en.mode.freeToggle)},
      zeroTooltip: ${JSON.stringify(en.mode.freeTooltip)},
      historyTitle: "Recent Snipping History",
      clearHistory: ${JSON.stringify(en.history.clear)},
      emptyHistory: ${JSON.stringify(en.history.empty)},
      saveBtn: "Save Settings",
      statusOnline: ${JSON.stringify(en.popup.statusOnline)},
      statusOffline: "Offline",
      statusChecking: ${JSON.stringify(en.popup.statusChecking)},
      testBtn: ${JSON.stringify(en.popup.testConnection)}
    },
    ja: {
      pinTip: "📌 ヒント：右上のパズル 🧩 をクリックし、SnapText をツールバーにピン留めすると便利です！",
      desc: "画面をキャプチャして瞬時に文字起こし。クリップボード自動保存＆マルチモデルKey対応。",
      snipBtn: "キャプチャを開始する",
      settingsToggle: "⚙️ AIモデル・接続設定",
      zeroToken: ${JSON.stringify(ja.mode.freeToggle)},
      zeroTooltip: ${JSON.stringify(ja.mode.freeTooltip)},
      historyTitle: "最近の抽出履歴",
      clearHistory: ${JSON.stringify(ja.history.clear)},
      emptyHistory: ${JSON.stringify(ja.history.empty)},
      saveBtn: "設定を保存",
      statusOnline: ${JSON.stringify(ja.popup.statusOnline)},
      statusOffline: "オフライン",
      statusChecking: ${JSON.stringify(ja.popup.statusChecking)},
      testBtn: ${JSON.stringify(ja.popup.testConnection)}
    }
  };

`;

  code = code.slice(0, pStart) + updatedPopupDict + code.slice(pEnd);
}

// 3. In applyLanguage in popup.js, also wire up testBtn and zeroTooltip
const oldApplyFn = `    if (clearHistoryBtn) clearHistoryBtn.textContent = dict.clearHistory;
    if (saveServerBtn && saveServerBtn.textContent !== "已保存！") saveServerBtn.textContent = dict.saveBtn;
    const pinTipText = document.getElementById("pin-tip-text");
    if (pinTipText && dict.pinTip) pinTipText.textContent = dict.pinTip;
  }`;

const newApplyFn = `    if (clearHistoryBtn) clearHistoryBtn.textContent = dict.clearHistory;
    if (saveServerBtn && saveServerBtn.textContent !== "已保存！") saveServerBtn.textContent = dict.saveBtn;
    const pinTipText = document.getElementById("pin-tip-text");
    if (pinTipText && dict.pinTip) pinTipText.textContent = dict.pinTip;
    if (testApiKeyBtn && dict.testBtn) testApiKeyBtn.textContent = dict.testBtn;
    const labelZero = document.getElementById("label-zero-token");
    if (labelZero && dict.zeroToken) {
      labelZero.textContent = dict.zeroToken;
      if (dict.zeroTooltip) labelZero.parentElement.title = dict.zeroTooltip;
    }
    const statText = document.getElementById("status-text");
    if (statText && statText.textContent === "检测中...") statText.textContent = dict.statusChecking;
  }`;

code = code.replace(oldApplyFn, newApplyFn);

fs.writeFileSync(targetPath, code, "utf-8");
console.log("Successfully applied user's exact i18n JSON into extensionGenerator.ts!");
