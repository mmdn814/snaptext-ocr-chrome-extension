import { PresetSample } from "../types";

// Generates high-fidelity visual data URLs matching user's reference images
function createStockRulesSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a3275"/>
        <stop offset="50%" stop-color="#14529f"/>
        <stop offset="100%" stop-color="#072352"/>
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="2" dy="2" stdDeviation="1" flood-color="#800" flood-opacity="0.9"/>
      </filter>
    </defs>
    <rect width="600" height="600" fill="url(#bg)"/>
    <g fill="#fffde6" stroke="#991b1b" stroke-width="2.5" paint-order="stroke fill" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-weight="900" font-size="25" filter="url(#shadow)">
      <text x="25" y="55">1. 股价低于1.8元，坚决不买</text>
      <text x="25" y="110">2. 总市值不足10亿，直接避开</text>
      <text x="25" y="165">3. 年营业收入低于2亿，不参与</text>
      <text x="25" y="220">4. 每股净资产低于1元，不入手</text>
      <text x="25" y="275">5. 单日换手率超过35%，不追高</text>
      <text x="25" y="330">6. 资产负债率高于85%，不碰雷</text>
      <text x="25" y="385">7. 长期没成交量的僵尸股，远离</text>
      <text x="25" y="440">8. 尾盘突然急拉的票，不跟风</text>
      <text x="25" y="495">9. 基金扎堆重仓股，不凑热闹</text>
      <text x="25" y="550">10. 媒体股评狂推的票，不相信</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createHandwrittenNotesSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="520" viewBox="0 0 600 520">
    <defs>
      <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
        <rect width="28" height="28" fill="#fdfbf7"/>
        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e8e2d5" stroke-width="0.75"/>
      </pattern>
    </defs>
    <rect width="600" height="520" fill="url(#grid)"/>
    <g fill="#181829" font-family="'Kaiti', 'STKaiti', 'FangSong', cursive, sans-serif" font-size="22" font-weight="bold" letter-spacing="1">
      <text x="20" y="50">先说句扎心的：如果你听到"连阴线买必涨"就兴奋，</text>
      <text x="20" y="115">觉得找到了财富密码，那这篇文章可能会让你</text>
      <text x="20" y="180">失望。市场里没有圣杯，我所说的"几乎不败"，</text>
      <text x="20" y="245">背后是无数次剁手割肉换来的。</text>
      <text x="20" y="325">它不是一个让你无脑赚钱的魔法咒语，而是一套让</text>
      <text x="20" y="390">我能在刀口舔血时，尽量少挨刀的生存法则。</text>
      <text x="20" y="455">真正让我赚钱的，从来不是阴线本身，而是四个字：</text>
      <text x="20" y="505" font-size="24" fill="#0d1117">趋势的停顿。</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createArticleHighlightSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700">
    <rect width="600" height="700" fill="#ffffff"/>
    <g font-family="Georgia, Cambria, 'Times New Roman', serif" font-size="18" fill="#1e293b" line-height="1.6">
      <text x="30" y="40"><tspan fill="#0284c7" text-decoration="underline">Blue Origin</tspan> CEO Dave Limp said the company’s</text>
      <text x="30" y="70">first-ever outside capital raise is not closed yet</text>
      <text x="30" y="100">and is drawing heavy investor interest,</text>
      <text x="30" y="130">describing the funding round as</text>
      <text x="30" y="160">“oversubscribed.”</text>

      <text x="30" y="210">“I’m so amazed the investor community</text>
      <text x="30" y="240">embraces space this much. ... They know that</text>
      <text x="30" y="270">space is kind of infinite and the possibilities of</text>
      <text x="30" y="300">putting commercial things in space, and it is a</text>
      <text x="30" y="330">testament to the tailwind of raising this round,”</text>
      <text x="30" y="360">Limp said at the Trump administration’s “Hello,</text>
      <text x="30" y="390">America” tech summit in Washington, D.C., on</text>
      <text x="30" y="420">Tuesday.</text>

      <!-- Red Highlighted Box markup -->
      <path d="M 25 450 Q 280 445 575 450 Q 585 480 575 510 Q 300 515 25 510 Z" fill="#ef4444" fill-opacity="0.82" rx="6"/>
      <path d="M 25 515 Q 280 512 575 515 Q 585 545 575 575 Q 300 580 25 575 Z" fill="#ef4444" fill-opacity="0.82" rx="6"/>
      <path d="M 25 580 Q 180 578 320 580 Q 330 610 320 640 Q 180 645 25 640 Z" fill="#ef4444" fill-opacity="0.82" rx="6"/>

      <text x="30" y="480" fill="#0f172a" font-weight="500">Last week, the <tspan text-decoration="underline">Wall Street Journal</tspan> reported that</text>
      <text x="30" y="510" fill="#0f172a" font-weight="500">the company had already raised $10 billion at a</text>
      <text x="30" y="540" fill="#0f172a" font-weight="500">valuation of $140 billion. Jeff Bezos chipped in</text>
      <text x="30" y="570" fill="#0f172a" font-weight="500">$2 billion in the current raise, according to the</text>
      <text x="30" y="605" fill="#0f172a">WSJ, and has invested $30 billion since the</text>
      <text x="30" y="635" fill="#0f172a">company’s founding in 2000.</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PRESET_SAMPLES: PresetSample[] = [
  {
    id: "stock-rules",
    title: "示例一：股市十条铁律（高对比度视频/字牌）",
    description: "黄字红边描边文字，模拟金融财经短视频中的核心铁律与规则提炼。",
    category: "print",
    imageUrl: createStockRulesSvg(),
    sampleExpectedText: `1. 股价低于1.8元，坚决不买
2. 总市值不足10亿，直接避开
3. 年营业收入低于2亿，不参与
4. 每股净资产低于1元，不入手
5. 单日换手率超过35%，不追高
6. 资产负债率高于85%，不碰雷
7. 长期没成交量的僵尸股，远离
8. 尾盘突然急拉的票，不跟风
9. 基金扎堆重仓股，不凑热闹
10. 媒体股评狂推的票，不相信`,
  },
  {
    id: "handwritten-trend",
    title: "示例二：手写笔记（网格纸行草连笔）",
    description: "连笔手写体、书信与笔记本扫描，准确识别行文断句与核心交易思维。",
    category: "handwritten",
    imageUrl: createHandwrittenNotesSvg(),
    sampleExpectedText: `先说句扎心的：如果你听到"连阴线买必涨"就兴奋，
觉得找到了财富密码，那这篇文章可能会让你
失望。市场里没有圣杯，我所说的"几乎不败"，
背后是无数次剁手割肉换来的。
它不是一个让你无脑赚钱的魔法咒语，而是一套让
我能在刀口舔血时，尽量少挨刀的生存法则。
真正让我赚钱的，从来不是阴线本身，而是四个字：
趋势的停顿。`,
  },
  {
    id: "article-highlight",
    title: "示例三：外媒新闻与红笔高亮划线区域",
    description: "英文商业新闻文章与红色记号笔高亮重点，支持全文提取或只提取高亮文字。",
    category: "highlight",
    imageUrl: createArticleHighlightSvg(),
    sampleExpectedText: `Blue Origin CEO Dave Limp said the company’s first-ever outside capital raise is not closed yet and is drawing heavy investor interest, describing the funding round as “oversubscribed.”

“I’m so amazed the investor community embraces space this much. ... They know that space is kind of infinite and the possibilities of putting commercial things in space, and it is a testament to the tailwind of raising this round,” Limp said at the Trump administration’s “Hello, America” tech summit in Washington, D.C., on Tuesday.

Last week, the Wall Street Journal reported that the company had already raised $10 billion at a valuation of $140 billion. Jeff Bezos chipped in $2 billion in the current raise, according to the WSJ, and has invested $30 billion since the company’s founding in 2000.`,
  },
];
