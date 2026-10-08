export const i18nData = {
  zh: {
    mode: {
      freeToggle: "🟢 默认不调用大模型（完全免费 / 0 消耗）",
      freeTooltip: "平时零消耗，遇到疑难手写体再点「AI 深度增强」",
      appendToggle: "📝 连续追加写字板模式"
    },
    snip: {
      hint: "拖拽框选文字区域 · 按 Esc 取消",
      confirm: "提取文字",
      cancel: "取消"
    },
    panel: {
      tabWorkspace: "📝 当前工作台",
      tabUsage: "📊 Token 看板与历史",
      snipAgain: "📸 再次框选",
      mergeLines: "合并段落",
      aiEnhance: "✨ AI 深度增强（预估 ~{tokens} Tokens）",
      copy: "一键复制",
      copied: "已复制！",
      close: "✕ 关闭界面",
      minimize: "─ 最小化"
    },
    capsule: {
      label: "⚡ SnapText · 任务保持中",
      expand: "展开 ↗"
    },
    toast: {
      autoCopied: "✓ 已自动复制到系统剪贴板"
    },
    popup: {
      statusChecking: "检测中...",
      statusOnline: "服务在线",
      testConnection: "验证连接"
    },
    history: {
      clear: "🗑️ 清空历史",
      empty: "暂无历史记录"
    }
  },
  en: {
    mode: {
      freeToggle: "🟢 Fast Mode (Free · No AI · 0 tokens)",
      freeTooltip: "Uses zero tokens. For tricky handwriting, click \"AI Enhance\".",
      appendToggle: "📝 Append Mode"
    },
    snip: {
      hint: "Drag to select a region · Press Esc to cancel",
      confirm: "Extract Text",
      cancel: "Cancel"
    },
    panel: {
      tabWorkspace: "📝 Workspace",
      tabUsage: "📊 Usage & History",
      snipAgain: "📸 Snip Again",
      mergeLines: "Merge Lines",
      aiEnhance: "✨ AI Enhance (~{tokens} tokens)",
      copy: "Copy",
      copied: "Copied!",
      close: "✕ Close",
      minimize: "─ Minimize"
    },
    capsule: {
      label: "⚡ SnapText · In Progress",
      expand: "Expand ↗"
    },
    toast: {
      autoCopied: "✓ Copied to clipboard"
    },
    popup: {
      statusChecking: "Checking...",
      statusOnline: "Online",
      testConnection: "Test Connection"
    },
    history: {
      clear: "🗑️ Clear History",
      empty: "No history yet"
    }
  },
  ja: {
    mode: {
      freeToggle: "🟢 高速モード（無料・AIなし・0トークン）",
      freeTooltip: "通常はトークンを消費しません。手書き文字など読み取りにくい場合は「AI強化」をクリックしてください。",
      appendToggle: "📝 連続追記モード"
    },
    snip: {
      hint: "ドラッグで範囲を選択 · Escでキャンセル",
      confirm: "テキストを抽出",
      cancel: "キャンセル"
    },
    panel: {
      tabWorkspace: "📝 作業エリア",
      tabUsage: "📊 使用量・履歴",
      snipAgain: "📸 再キャプチャ",
      mergeLines: "改行を削除",
      aiEnhance: "✨ AI強化（約{tokens}トークン）",
      copy: "コピー",
      copied: "コピーしました",
      close: "✕ 閉じる",
      minimize: "─ 最小化"
    },
    capsule: {
      label: "⚡ SnapText · 作業中",
      expand: "開く ↗"
    },
    toast: {
      autoCopied: "✓ クリップボードにコピーしました"
    },
    popup: {
      statusChecking: "確認中...",
      statusOnline: "オンライン",
      testConnection: "接続テスト"
    },
    history: {
      clear: "🗑️ 履歴をすべて削除",
      empty: "履歴はまだありません"
    }
  }
} as const;

export default i18nData;
