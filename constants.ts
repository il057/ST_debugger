import { RegexRule } from './types';

// Y2K / Acid Graphics style text
export const DEFAULT_TEXT = `< 2B (YoRHa No.2 Type B) >
( ...这里的机械生物反应很奇怪。必须保持警惕。9S，如果你能听到的话，请回应。 )
[ 废弃工厂 :: 熔炉区 ]
{ 紧握着白之契约的刀柄，扫描着周围的阴影。指示灯在黑暗中有节奏地闪烁。 }
好感度: 65 / 100 | 爱情值: 12 / 100 | 状态: 警戒 | 义体损毁: 0%

< 9S (YoRHa No.9 Type S) >
( 2B！我正在入侵工厂的主网络...等等，这个数据流...就像是他们在哭泣一样。 )
[ 废弃工厂 :: 服务器室 ]
{ 手指在浮空的黑客界面上飞速操作，金色的数据环在身边旋转。 }
好感度: 92 / 100 | 爱情值: 88 / 100 | 状态: 黑客入侵 | 义体损毁: 5%
`;

export const DEFAULT_RULES: RegexRule[] = [
  {
    id: 'rule-y2k-container',
    name: '1. Y2K 容器框架',
    regex: '/([\\s\\S]+)/',
    replace: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=VT323&display=swap');
  
  :root {
    --acid-green: #ccff00;
    --hot-pink: #ff00cc;
    --cyan: #00ffff;
    --dark-bg: #050505;
    --grid-color: rgba(0, 255, 255, 0.1);
  }

  body {
    background-color: var(--dark-bg);
    background-image: 
      linear-gradient(var(--grid-color) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
    background-size: 30px 30px;
    color: #e0e0e0;
    font-family: 'VT323', monospace;
    margin: 0;
    padding: 20px;
    height: 100vh;
    overflow-y: auto;
    font-size: 18px;
  }

  .card-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .char-card {
    background: rgba(0,0,0,0.7);
    border: 2px solid var(--cyan);
    padding: 2px;
    position: relative;
    box-shadow: 5px 5px 0px var(--hot-pink);
    clip-path: polygon(
      0 0, 
      100% 0, 
      100% calc(100% - 20px), 
      calc(100% - 20px) 100%, 
      0 100%
    );
    transition: transform 0.2s;
  }
  
  .char-card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 7px 7px 0px var(--hot-pink);
  }

  .card-inner {
    background: linear-gradient(180deg, rgba(0,255,255,0.05) 0%, rgba(0,0,0,0.8) 100%);
    padding: 15px;
    border: 1px dashed rgba(0,255,255,0.3);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--acid-green);
    padding-bottom: 5px;
    margin-bottom: 10px;
  }

  .name {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.4em;
    font-weight: 900;
    color: var(--acid-green);
    text-shadow: 0 0 5px var(--acid-green);
    letter-spacing: 2px;
  }

  .location-badge {
    background: var(--hot-pink);
    color: #000;
    padding: 2px 8px;
    font-weight: bold;
    font-size: 0.9em;
    text-transform: uppercase;
    transform: skewX(-15deg);
  }

  .voice-section {
    color: var(--cyan);
    font-style: italic;
    margin-bottom: 12px;
    padding-left: 10px;
    border-left: 3px solid var(--cyan);
    opacity: 0.9;
  }

  .action-section {
    color: #fff;
    margin-bottom: 15px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    font-size: 0.9em;
    border-top: 1px dotted #555;
    padding-top: 10px;
  }

  .stat-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bar-container {
    flex: 1;
    height: 12px;
    background: #222;
    border: 1px solid #555;
    position: relative;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: repeating-linear-gradient(
      45deg,
      var(--hot-pink),
      var(--hot-pink) 5px,
      #ff66dd 5px,
      #ff66dd 10px
    );
  }
  
  .love-fill {
    background: repeating-linear-gradient(
      45deg,
      var(--acid-green),
      var(--acid-green) 5px,
      #ddff66 5px,
      #ddff66 10px
    );
  }

  /* Scanline effect */
  body::after {
    content: " ";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    z-index: 2;
    background-size: 100% 2px, 3px 100%;
    pointer-events: none;
  }
</style>
</head>
<body>
  <div class="card-container">
    $1
  </div>
</body>
</html>`,
    active: true,
    order: 2
  },
  {
    id: 'rule-y2k-parsing',
    name: '2. 角色卡解析',
    regex: '/< (.+?) >\\s*\\n\\( (.+?) \\)\\s*\\n\\[ (.+?) \\]\\s*\\n\\{ (.+?) \\}\\s*\\n好感度: (\\d+) \\/ 100 \\| 爱情值: (\\d+) \\/ 100 (.+?)\\n/g',
    replace: `<div class="char-card">
  <div class="card-inner">
    <div class="header">
      <div class="name">$1</div>
      <div class="location-badge">$3</div>
    </div>
    <div class="voice-section">"$2"</div>
    <div class="action-section">$4</div>
    <div class="stats-grid">
      <div class="stat-row">
         <span>LOVE:</span>
         <div class="bar-container"><div class="bar-fill" style="width: $5%"></div></div>
         <span>$5%</span>
      </div>
      <div class="stat-row">
         <span>LUST:</span>
         <div class="bar-container"><div class="bar-fill love-fill" style="width: $6%"></div></div>
         <span>$6%</span>
      </div>
      <div style="grid-column: span 2; font-size: 0.8em; color: #888; text-align: right; margin-top:5px;">
         STATUS: $7
      </div>
    </div>
  </div>
</div>`,
    active: true,
    order: 1
  }
];