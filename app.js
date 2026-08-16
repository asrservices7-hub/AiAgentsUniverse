/**
 * Agent Universe Command Center
 * A massive-scale AI agent management ecosystem and autonomous application builder.
 */

// ==========================================
// UTILITIES
// ==========================================

const formatNumber = (n) => {
    return Math.round(n).toLocaleString('en-IN');
};

const formatCompact = (n) => {
    if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
};

const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const generateId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const weightedRandom = (weights) => {
    let total = 0;
    for (const key in weights) total += weights[key];
    let r = Math.random() * total;
    for (const key in weights) {
        r -= weights[key];
        if (r <= 0) return key;
    }
    return Object.keys(weights)[0];
};

// ==========================================
// CONSTANTS & INITIAL DOMAIN DATA
// ==========================================

const AGENT_TYPES = [
    'ANALYST', 'ENGINEER', 'AUDITOR', 'PROCESSOR',
    'MONITOR', 'OPTIMIZER', 'RESEARCHER', 'VALIDATOR'
];

const PRIORITIES = { 'P0': 5, 'P1': 15, 'P2': 50, 'P3': 30 };

const TASK_STATUS = {
    QUEUED: 'QUEUED',
    ACTIVE: 'ACTIVE',
    COMPLETE: 'COMPLETE',
    FAILED: 'FAILED'
};

const AGENT_STATE = {
    IDLE: 'IDLE',
    WORKING: 'WORKING',
    REPORTING: 'REPORTING',
    BENCH: 'BENCH'
};

const SIM_CONFIG = {
    renderThrottleMs: 350,
    maxBenchAgents: 10000000,
    factoryInitialAgentsMin: 60,
    factoryInitialAgentsMax: 120
};

const INITIAL_INDUSTRIES = [
    {
        id: 'ind-tech',
        name: 'Technology & AI',
        icon: '⚡',
        color: '#2563eb',
        description: 'Autonomous software engineering, cloud infrastructure, neural models, and cybersecurity.',
        factories: [
            { name: 'API Development Factory', goal: 'Build and maintain 500 production API endpoints' },
            { name: 'Security Audit Factory', goal: 'Complete security audits of all cloud microservices' },
            { name: 'ML Pipeline Factory', goal: 'Train and deploy deep learning models to production' },
            { name: 'DevOps Automation Factory', goal: 'Achieve 99.999% uptime with autonomous auto-healing' }
        ]
    },
    {
        id: 'ind-health',
        name: 'Healthcare & Biotech',
        icon: '🏥',
        color: '#059669',
        description: 'Biomedical research, genomic analysis, clinical trial screening, and diagnostic imaging.',
        factories: [
            { name: 'Medical Records Factory', goal: 'Digitize and validate 1M patient electronic records' },
            { name: 'Drug Interaction Checker', goal: 'Synthesize bioactivity and contraindication databases' },
            { name: 'Diagnostic Imaging Factory', goal: 'Process radiology scans with automated lesion analysis' },
            { name: 'Clinical Trial Matching', goal: 'Match 50,000 eligible patients to active cancer trials' }
        ]
    },
    {
        id: 'ind-fin',
        name: 'Finance & Fintech',
        icon: '📊',
        color: '#d97706',
        description: 'Quantitative analytics, algorithmic risk assessment, fraud surveillance, and regulatory compliance.',
        factories: [
            { name: 'Fraud Detection Factory', goal: 'Monitor 10M transactions in real-time for anomalies' },
            { name: 'Portfolio Risk Assessment', goal: 'Execute Monte Carlo stress testing for capital reserves' },
            { name: 'Compliance Engine Factory', goal: 'Ensure 100% regulatory reporting across 15 jurisdictions' }
        ]
    },
    {
        id: 'ind-mfg',
        name: 'Manufacturing & Robotics',
        icon: '🏭',
        color: '#7c3aed',
        description: 'Precision engineering, industrial IoT monitoring, predictive maintenance, and quality control.',
        factories: [
            { name: 'Quality Control Factory', goal: 'Maintain 99.99% defect-free automated assembly' },
            { name: 'Supply Chain Optimizer', goal: 'Optimize multi-tier vendor logistics and lead times' },
            { name: 'Predictive Maintenance Factory', goal: 'Predict equipment wear 48 hours prior to failure' }
        ]
    },
    {
        id: 'ind-energy',
        name: 'Clean Energy & Grid',
        icon: '🔋',
        color: '#0284c7',
        description: 'Renewable energy integration, grid frequency stabilization, and carbon emission telemetry.',
        factories: [
            { name: 'Grid Balancing Factory', goal: 'Balance 50GW multi-source power grid in real-time' },
            { name: 'Emissions Monitoring Factory', goal: 'Track and verify carbon offset tokens across facilities' },
            { name: 'Renewable Integration Factory', goal: 'Integrate 10GW solar and offshore wind capacity' }
        ]
    },
    {
        id: 'ind-logistics',
        name: 'Logistics & Supply',
        icon: '🚛',
        color: '#e11d48',
        description: 'Fleet routing, automated fulfillment centers, customs documentation, and last-mile dispatch.',
        factories: [
            { name: 'Route Optimization Factory', goal: 'Optimize 50,000 daily delivery routes dynamically' },
            { name: 'Warehouse Automation Factory', goal: 'Manage 5M SKUs with automated pick-and-pack routing' },
            { name: 'Fleet Telemetry Factory', goal: 'Monitor vehicle diagnostics and predictive servicing' }
        ]
    }
];

// ==========================================
// ARTIFACT BUILDER & LIVE APP GENERATOR
// ==========================================

class ArtifactGenerator {
    static generate(goalText) {
        const text = (goalText || '').toLowerCase();
        
        if (text.includes('watch') || text.includes('smartwatch') || text.includes('wearable')) {
            return this.generateSmartwatch(goalText);
        } else if (text.includes('calc') || text.includes('math') || text.includes('arithmetic')) {
            return this.generateCalculator(goalText);
        } else if (text.includes('music') || text.includes('audio') || text.includes('player') || text.includes('song') || text.includes('spotify')) {
            return this.generateMusicPlayer(goalText);
        } else if (text.includes('chat') || text.includes('ai') || text.includes('bot') || text.includes('assistant') || text.includes('gpt')) {
            return this.generateAIChat(goalText);
        } else if (text.includes('draw') || text.includes('paint') || text.includes('canvas') || text.includes('sketch')) {
            return this.generateCanvasDrawing(goalText);
        } else if (text.includes('crypto') || text.includes('stock') || text.includes('market') || text.includes('trade') || text.includes('chart')) {
            return this.generateCryptoDashboard(goalText);
        } else if (text.includes('todo') || text.includes('task') || text.includes('kanban')) {
            return this.generateTodo(goalText);
        } else if (text.includes('snake') || text.includes('game') || text.includes('arcade')) {
            return this.generateSnakeGame(goalText);
        } else if (text.includes('weather') || text.includes('forecast')) {
            return this.generateWeather(goalText);
        } else if (text.includes('timer') || text.includes('pomodoro') || text.includes('clock')) {
            return this.generateTimer(goalText);
        } else {
            return this.generateDynamicApp(goalText);
        }
    }

    // ⌚ SMARTWATCH OS SIMULATOR
    static generateSmartwatch(goalText) {
        const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus Wear OS Smartwatch</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; user-select: none; }
    body { background: #0f172a; color: #ffffff; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    
    /* Smartwatch Case & Hardware Frame */
    .watch-chassis {
      position: relative;
      background: linear-gradient(145deg, #2a2e39 0%, #15181f 100%);
      border: 4px solid #475569;
      border-radius: 64px;
      padding: 16px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.2);
      width: 320px;
      height: 400px;
      display: flex;
      flex-direction: column;
    }
    
    /* Hardware Crown & Button */
    .crown {
      position: absolute;
      right: -14px;
      top: 90px;
      width: 10px;
      height: 48px;
      background: linear-gradient(to right, #64748b, #cbd5e1, #475569);
      border-radius: 4px;
      box-shadow: 2px 0 6px rgba(0,0,0,0.5);
      cursor: pointer;
    }
    .side-button {
      position: absolute;
      right: -10px;
      bottom: 110px;
      width: 6px;
      height: 36px;
      background: #475569;
      border-radius: 3px;
      cursor: pointer;
    }
    .strap-top, .strap-bottom {
      width: 150px;
      height: 35px;
      background: #1e293b;
      border-left: 2px solid #334155;
      border-right: 2px solid #334155;
      border-radius: 8px 8px 0 0;
    }
    .strap-bottom {
      border-radius: 0 0 8px 8px;
    }

    /* OLED Screen */
    .screen {
      background: #000000;
      border-radius: 48px;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      border: 2px solid #111;
    }

    /* Status Bar */
    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px 4px;
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
    }
    .battery-pill {
      background: #1e293b;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 10px;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    /* App Screens Container */
    .app-viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    .app-screen {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      padding: 10px 18px;
      animation: fadeIn 0.2s ease;
    }
    .app-screen.active {
      display: flex;
    }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

    /* SCREEN 1: CLOCK FACE */
    .clock-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: auto 0;
    }
    .time-large {
      font-size: 48px;
      font-weight: 800;
      font-family: monospace;
      letter-spacing: -1px;
      color: #38bdf8;
      text-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
      line-height: 1;
    }
    .seconds-text {
      font-size: 16px;
      color: #94a3b8;
      margin-left: 4px;
    }
    .date-text {
      font-size: 12px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: 1px;
      margin-top: 6px;
      text-transform: uppercase;
    }
    
    /* Metrics Row on Watch Face */
    .face-metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin-top: auto;
      margin-bottom: 8px;
    }
    .f-metric {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 6px 4px;
      text-align: center;
    }
    .f-metric-val {
      font-size: 13px;
      font-weight: 800;
      font-family: monospace;
    }
    .f-metric-lbl {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .heart-val { color: #f43f5e; }
    .steps-val { color: #10b981; }
    .cal-val { color: #f59e0b; }

    /* SCREEN 2: HEART & HEALTH */
    .health-title {
      font-size: 14px;
      font-weight: 800;
      color: #f43f5e;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .ecg-box {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 12px;
      height: 90px;
      position: relative;
      overflow: hidden;
      margin-bottom: 10px;
    }
    canvas#ecgCanvas {
      width: 100%;
      height: 100%;
    }
    .health-stat-row {
      display: flex;
      justify-content: space-between;
      background: #111827;
      padding: 8px 12px;
      border-radius: 10px;
      margin-bottom: 6px;
      font-size: 12px;
    }

    /* SCREEN 3: MUSIC PLAYER */
    .music-album {
      width: 80px;
      height: 80px;
      background: linear-gradient(45deg, #ec4899, #8b5cf6);
      border-radius: 16px;
      margin: 10px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      box-shadow: 0 8px 20px rgba(236, 72, 153, 0.3);
    }
    .track-title { font-size: 13px; font-weight: 800; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track-artist { font-size: 10px; color: #94a3b8; text-align: center; margin-bottom: 10px; }
    .player-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
    }
    .p-btn {
      background: #1e293b;
      border: none;
      color: #ffffff;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
    }
    .p-btn.play {
      background: #38bdf8;
      color: #0f172a;
      width: 46px;
      height: 46px;
      font-size: 18px;
    }

    /* SCREEN 4: STOPWATCH */
    .sw-display {
      font-size: 34px;
      font-family: monospace;
      font-weight: 800;
      color: #a855f7;
      text-align: center;
      margin: 24px 0 16px;
    }
    .sw-btns {
      display: flex;
      gap: 8px;
    }
    .sw-btn {
      flex: 1;
      padding: 10px 0;
      border-radius: 12px;
      font-weight: 700;
      font-size: 12px;
      border: none;
      cursor: pointer;
    }
    .sw-start { background: #10b981; color: #fff; }
    .sw-stop { background: #ef4444; color: #fff; }
    .sw-reset { background: #334155; color: #fff; }

    /* Bottom Navigation Bar */
    .watch-nav {
      display: flex;
      justify-content: space-around;
      padding: 8px 10px;
      background: #090d16;
      border-top: 1px solid #1e293b;
    }
    .w-tab-btn {
      background: none;
      border: none;
      color: #64748b;
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: all 0.15s;
    }
    .w-tab-btn.active {
      color: #38bdf8;
      background: #1e293b;
    }

    /* Outer Help text */
    .help-bar {
      margin-top: 16px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="strap-top"></div>
  <div class="watch-chassis">
    <div class="crown" onclick="switchTab('face')" title="Press Crown to go Home"></div>
    <div class="side-button" onclick="triggerFlashlight()" title="Action Button"></div>
    
    <div class="screen" id="watchScreen">
      <!-- Status Bar -->
      <div class="status-bar">
        <span id="statusTime">10:54</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <span>📶</span>
          <div class="battery-pill">⚡ 94%</div>
        </div>
      </div>

      <!-- App Viewport -->
      <div class="app-viewport">
        
        <!-- 1. WATCH FACE -->
        <div class="app-screen active" id="screen-face">
          <div class="clock-center">
            <div style="display:flex;align-items:baseline;">
              <span class="time-large" id="mainClock">10:54</span>
              <span class="seconds-text" id="mainSeconds">:32</span>
            </div>
            <div class="date-text" id="mainDate">SUN 16 AUG</div>
          </div>

          <div class="face-metrics-grid">
            <div class="f-metric">
              <div class="f-metric-val heart-val"><span id="liveBpm">76</span> BPM</div>
              <div class="f-metric-lbl">Pulse</div>
            </div>
            <div class="f-metric">
              <div class="f-metric-val steps-val"><span id="liveSteps">8,420</span></div>
              <div class="f-metric-lbl">Steps</div>
            </div>
            <div class="f-metric">
              <div class="f-metric-val cal-val">584</div>
              <div class="f-metric-lbl">kcal</div>
            </div>
          </div>
        </div>

        <!-- 2. HEART & HEALTH APP -->
        <div class="app-screen" id="screen-health">
          <div class="health-title">💓 Live Cardio ECG</div>
          <div class="ecg-box">
            <canvas id="ecgCanvas" width="280" height="90"></canvas>
          </div>
          <div class="health-stat-row">
            <span style="color:#94a3b8">Heart Rate:</span>
            <span style="font-weight:700;color:#f43f5e;"><span id="ecgBpm">76</span> BPM (Resting)</span>
          </div>
          <div class="health-stat-row">
            <span style="color:#94a3b8">Blood Oxygen (SpO₂):</span>
            <span style="font-weight:700;color:#38bdf8;">99% Normal</span>
          </div>
          <div class="health-stat-row">
            <span style="color:#94a3b8">Sleep Score:</span>
            <span style="font-weight:700;color:#10b981;">88 / 100 (Optimal)</span>
          </div>
        </div>

        <!-- 3. MUSIC APP -->
        <div class="app-screen" id="screen-music">
          <div class="music-album" id="albumArt">🎵</div>
          <div class="track-title" id="trackTitle">Quantum Flow (VIP)</div>
          <div class="track-artist" id="trackArtist">Agent Universe Sound</div>
          <div class="player-controls">
            <button class="p-btn" onclick="prevTrack()">⏮</button>
            <button class="p-btn play" id="playBtn" onclick="togglePlay()">▶</button>
            <button class="p-btn" onclick="nextTrack()">⏭</button>
          </div>
          <div style="font-size:10px;text-align:center;color:#64748b;margin-top:12px;" id="musicStatus">Tap Play for Synth Audio</div>
        </div>

        <!-- 4. STOPWATCH -->
        <div class="app-screen" id="screen-stopwatch">
          <div style="font-size:13px;font-weight:700;color:#a855f7;text-align:center;margin-top:4px;">⏱️ Precision Stopwatch</div>
          <div class="sw-display" id="swDisplay">00:00.00</div>
          <div class="sw-btns">
            <button class="sw-btn sw-start" id="swStartBtn" onclick="toggleStopwatch()">Start</button>
            <button class="sw-btn sw-reset" onclick="resetStopwatch()">Reset</button>
          </div>
        </div>

        <!-- 5. FLASHLIGHT / NOTIFICATIONS -->
        <div class="app-screen" id="screen-more">
          <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:8px;">💬 Notifications</div>
          <div style="background:#111827;padding:8px 10px;border-radius:8px;font-size:11px;margin-bottom:6px;">
            <div style="color:#38bdf8;font-weight:700;">Swarm Overseer</div>
            <div style="color:#e2e8f0;margin-top:2px;">Goal "make a smartwatch" active & verified!</div>
          </div>
          <div style="background:#111827;padding:8px 10px;border-radius:8px;font-size:11px;margin-bottom:6px;">
            <div style="color:#10b981;font-weight:700;">Activity Rings</div>
            <div style="color:#e2e8f0;margin-top:2px;">Daily move goal 84% completed!</div>
          </div>
          <button style="width:100%;padding:6px;background:#334155;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;margin-top:4px;" onclick="triggerFlashlight()">🔦 Toggle Flashlight</button>
        </div>

      </div>

      <!-- Navigation Bar -->
      <div class="watch-nav">
        <button class="w-tab-btn active" onclick="switchTab('face')" title="Watch Face">⌚</button>
        <button class="w-tab-btn" onclick="switchTab('health')" title="Heart Rate & ECG">💓</button>
        <button class="w-tab-btn" onclick="switchTab('music')" title="Music Player">🎵</button>
        <button class="w-tab-btn" onclick="switchTab('stopwatch')" title="Stopwatch">⏱️</button>
        <button class="w-tab-btn" onclick="switchTab('more')" title="Notifications">💬</button>
      </div>

    </div>
  </div>
  <div class="strap-bottom"></div>
  <div class="help-bar">Nexus Watch OS • Tap bottom tabs to switch apps • Click crown on right for Home</div>

  <script>
    // 1. Live Clock
    function updateClock() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      
      const timeStr = h + ':' + m;
      document.getElementById('statusTime').textContent = timeStr;
      document.getElementById('mainClock').textContent = timeStr;
      document.getElementById('mainSeconds').textContent = ':' + s;

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      document.getElementById('mainDate').textContent = days[now.getDay()] + ' ' + now.getDate() + ' ' + months[now.getMonth()];
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 2. Tab Navigation
    function switchTab(tabId) {
      document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.w-tab-btn').forEach(b => b.classList.remove('active'));
      
      document.getElementById('screen-' + tabId)?.classList.add('active');
      const idx = ['face', 'health', 'music', 'stopwatch', 'more'].indexOf(tabId);
      if (idx > -1) {
        document.querySelectorAll('.w-tab-btn')[idx]?.classList.add('active');
      }
    }

    // 3. Heart Rate & ECG Canvas Wave
    let ecgX = 0, ecgY = 45;
    const canvas = document.getElementById('ecgCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 280, 90);
    }
    
    function drawECG() {
      if (!ctx) return;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ecgX, ecgY);

      ecgX += 3;
      if (ecgX % 60 === 30) ecgY = 15; // R peak
      else if (ecgX % 60 === 33) ecgY = 75; // S valley
      else if (ecgX % 60 === 36) ecgY = 45; // baseline
      else ecgY = 45 + (Math.random() * 4 - 2);

      ctx.lineTo(ecgX, ecgY);
      ctx.stroke();

      if (ecgX >= 280) {
        ecgX = 0;
        ctx.fillStyle = 'rgba(9, 13, 22, 0.8)';
        ctx.fillRect(0, 0, 280, 90);
      }
    }
    setInterval(drawECG, 50);

    // Random Pulse Fluctuations
    setInterval(() => {
      const bpm = 72 + Math.floor(Math.random() * 8);
      document.getElementById('liveBpm').textContent = bpm;
      document.getElementById('ecgBpm').textContent = bpm;
    }, 3000);

    // 4. Music Player with Web Audio API
    let isPlaying = false, audioCtx = null, osc = null, trackIndex = 0;
    const playlist = [
      { title: 'Quantum Flow (VIP)', artist: 'Agent Universe Sound', icon: '🌌' },
      { title: 'Neural Symphony', artist: 'Cybernetic Echoes', icon: '⚡' },
      { title: 'Silicon Horizon', artist: 'Nexus Core', icon: '🌅' }
    ];

    function togglePlay() {
      isPlaying = !isPlaying;
      const btn = document.getElementById('playBtn');
      btn.textContent = isPlaying ? '⏸' : '▶';
      btn.style.background = isPlaying ? '#10b981' : '#38bdf8';
      document.getElementById('musicStatus').textContent = isPlaying ? '● Playing via Web Audio' : 'Paused';

      if (isPlaying) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        playSynthBeep();
      }
    }

    function playSynthBeep() {
      if (!isPlaying || !audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const freqs = [330, 392, 440, 523, 659];
      osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); if (isPlaying) setTimeout(playSynthBeep, 400); }, 200);
    }

    function nextTrack() {
      trackIndex = (trackIndex + 1) % playlist.length;
      updateTrack();
    }
    function prevTrack() {
      trackIndex = (trackIndex - 1 + playlist.length) % playlist.length;
      updateTrack();
    }
    function updateTrack() {
      const t = playlist[trackIndex];
      document.getElementById('trackTitle').textContent = t.title;
      document.getElementById('trackArtist').textContent = t.artist;
      document.getElementById('albumArt').textContent = t.icon;
    }

    // 5. Stopwatch
    let swInterval = null, swStartTime = 0, swElapsed = 0, swRunning = false;
    function toggleStopwatch() {
      const btn = document.getElementById('swStartBtn');
      if (!swRunning) {
        swRunning = true;
        swStartTime = Date.now() - swElapsed;
        swInterval = setInterval(() => {
          swElapsed = Date.now() - swStartTime;
          const mins = Math.floor(swElapsed / 60000).toString().padStart(2, '0');
          const secs = Math.floor((swElapsed % 60000) / 1000).toString().padStart(2, '0');
          const ms = Math.floor((swElapsed % 1000) / 10).toString().padStart(2, '0');
          document.getElementById('swDisplay').textContent = mins + ':' + secs + '.' + ms;
        }, 30);
        btn.textContent = 'Pause';
        btn.className = 'sw-btn sw-stop';
      } else {
        swRunning = false;
        clearInterval(swInterval);
        btn.textContent = 'Resume';
        btn.className = 'sw-btn sw-start';
      }
    }
    function resetStopwatch() {
      swRunning = false;
      clearInterval(swInterval);
      swElapsed = 0;
      document.getElementById('swDisplay').textContent = '00:00.00';
      const btn = document.getElementById('swStartBtn');
      btn.textContent = 'Start';
      btn.className = 'sw-btn sw-start';
    }

    // Flashlight Toggle
    let flashlight = false;
    function triggerFlashlight() {
      flashlight = !flashlight;
      const scr = document.getElementById('watchScreen');
      if (flashlight) scr.style.background = '#ffffff';
      else scr.style.background = '#000000';
    }
  </script>
</body>
</html>`;

        return {
            title: 'Nexus Smartwatch OS',
            type: 'Wearable Simulator',
            code: code,
            stages: [
                { name: 'Hardware Chassis & Crown Architecture', agent: 'AGT-HW-101', desc: 'Designed realistic titanium casing, digital crown listeners, and OLED geometry.' },
                { name: 'OLED Clock & Activity Display', agent: 'AGT-ENG-204', desc: 'Synthesized real-time ticking clock, steps progress rings and battery telemetry.' },
                { name: 'Live Cardio ECG Canvas Renderer', agent: 'AGT-DEV-309', desc: 'Built 60fps HTML5 Canvas ECG trace animator and pulse rate simulator.' },
                { name: 'Embedded Web Audio Music Player', agent: 'AGT-AUD-412', desc: 'Implemented synth tone audio engine, track metadata state and playback pipeline.' },
                { name: 'Stopwatch & Notification Subsystem', agent: 'AGT-VAL-519', desc: 'Constructed millisecond delta timer and swipe notification handlers.' },
                { name: 'Standalone OS Bundle Compilation', agent: 'NEXUS-BUILD-01', desc: 'Packaged standalone interactive smartwatch simulator artifact.' }
            ]
        };
    }

    // 🧮 CALCULATOR APP
    static generateCalculator(goalText) {
        const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Precision Calculator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #f8fafc; color: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .calc-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; width: 350px; box-shadow: 0 20px 30px -10px rgba(0,0,0,0.1); }
    .calc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .calc-brand { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; }
    .calc-pill { font-size: 10px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 99px; }
    .screen { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 16px; text-align: right; margin-bottom: 16px; min-height: 80px; display: flex; flex-direction: column; justify-content: space-between; }
    .history { font-size: 13px; color: #64748b; font-family: monospace; min-height: 18px; overflow: hidden; text-overflow: ellipsis; }
    .display { font-size: 32px; font-weight: 800; color: #0f172a; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mem-row { display: flex; gap: 6px; margin-bottom: 10px; }
    .mem-btn { flex: 1; padding: 6px; font-size: 11px; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #475569; cursor: pointer; }
    .mem-btn:hover { background: #e2e8f0; }
    .keypad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    button.key { background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; font-size: 17px; font-weight: 700; padding: 14px 0; border-radius: 10px; cursor: pointer; transition: all 0.1s; }
    button.key:hover { background: #f1f5f9; border-color: #94a3b8; transform: translateY(-1px); }
    button.key:active { transform: translateY(1px); }
    button.op { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; font-size: 18px; }
    button.op:hover { background: #dbeafe; }
    button.fn { background: #fffbeb; color: #d97706; border-color: #fde68a; font-size: 14px; }
    button.fn:hover { background: #fef3c7; }
    button.clear { background: #fff1f2; color: #e11d48; border-color: #fecdd3; }
    button.clear:hover { background: #ffe4e6; }
    button.eq { background: #059669; color: #ffffff; border: none; font-size: 20px; }
    button.eq:hover { background: #047857; }
    .span-2 { grid-column: span 2; }
    .footer-text { margin-top: 14px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 500; }
  </style>
</head>
<body>
  <div class="calc-card">
    <div class="calc-top">
      <span class="calc-brand">CALCULATOR v3.0</span>
      <span class="calc-pill">SWARM READY</span>
    </div>
    <div class="screen">
      <div class="history" id="history">&nbsp;</div>
      <div class="display" id="display">0</div>
    </div>
    <div class="mem-row">
      <button class="mem-btn" onclick="mem('MC')">MC</button>
      <button class="mem-btn" onclick="mem('MR')">MR</button>
      <button class="mem-btn" onclick="mem('M+')">M+</button>
      <button class="mem-btn" onclick="mem('M-')">M-</button>
    </div>
    <div class="keypad">
      <button class="key clear" onclick="clearAll()">AC</button>
      <button class="key clear" onclick="backspace()">⌫</button>
      <button class="key fn" onclick="applyPercent()">%</button>
      <button class="key op" onclick="appendOp('/')">÷</button>
      
      <button class="key" onclick="appendNum('7')">7</button>
      <button class="key" onclick="appendNum('8')">8</button>
      <button class="key" onclick="appendNum('9')">9</button>
      <button class="key op" onclick="appendOp('*')">×</button>
      
      <button class="key" onclick="appendNum('4')">4</button>
      <button class="key" onclick="appendNum('5')">5</button>
      <button class="key" onclick="appendNum('6')">6</button>
      <button class="key op" onclick="appendOp('-')">−</button>
      
      <button class="key" onclick="appendNum('1')">1</button>
      <button class="key" onclick="appendNum('2')">2</button>
      <button class="key" onclick="appendNum('3')">3</button>
      <button class="key op" onclick="appendOp('+')">+</button>
      
      <button class="key fn" onclick="toggleSign()">±</button>
      <button class="key" onclick="appendNum('0')">0</button>
      <button class="key" onclick="appendDot()">.</button>
      <button class="key eq" onclick="calculate()">=</button>
      
      <button class="key fn span-2" onclick="applySqrt()">√x Square Root</button>
      <button class="key fn span-2" onclick="applySquare()">x² Square</button>
    </div>
    <div class="footer-text">Built by AI Agent Swarm • Full Keyboard Support</div>
  </div>

  <script>
    let currentInput = '0', previousInput = '', operation = null, memory = 0, resetScreen = false;
    const displayEl = document.getElementById('display');
    const historyEl = document.getElementById('history');

    function updateDisplay() {
      displayEl.textContent = currentInput;
      historyEl.textContent = operation ? (previousInput + ' ' + (operation === '*' ? '×' : operation === '/' ? '÷' : operation)) : '';
    }

    function appendNum(num) {
      if (currentInput === '0' || resetScreen) { currentInput = num; resetScreen = false; }
      else if (currentInput.length < 14) currentInput += num;
      updateDisplay();
    }

    function appendDot() {
      if (resetScreen) { currentInput = '0'; resetScreen = false; }
      if (!currentInput.includes('.')) currentInput += '.';
      updateDisplay();
    }

    function appendOp(op) {
      if (operation && !resetScreen) calculate();
      previousInput = currentInput;
      operation = op;
      resetScreen = true;
      updateDisplay();
    }

    function calculate() {
      if (!operation || resetScreen) return;
      const prev = parseFloat(previousInput);
      const curr = parseFloat(currentInput);
      if (isNaN(prev) || isNaN(curr)) return;
      let result = 0;
      switch (operation) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': 
          if (curr === 0) { currentInput = 'Error (Div 0)'; operation = null; resetScreen = true; updateDisplay(); return; }
          result = prev / curr; 
          break;
      }
      historyEl.textContent = prev + ' ' + (operation === '*' ? '×' : operation === '/' ? '÷' : operation) + ' ' + curr + ' =';
      currentInput = (Math.round(result * 100000000) / 100000000).toString();
      operation = null;
      resetScreen = true;
      displayEl.textContent = currentInput;
    }

    function clearAll() { currentInput = '0'; previousInput = ''; operation = null; resetScreen = false; historyEl.textContent = ''; updateDisplay(); }
    function backspace() { if (resetScreen) return; currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : '0'; updateDisplay(); }
    function toggleSign() { if (currentInput !== '0') { currentInput = (parseFloat(currentInput) * -1).toString(); updateDisplay(); } }
    function applyPercent() { currentInput = (parseFloat(currentInput) / 100).toString(); updateDisplay(); }
    function applySqrt() { const val = parseFloat(currentInput); currentInput = val < 0 ? 'Error' : Math.sqrt(val).toString(); resetScreen = true; updateDisplay(); }
    function applySquare() { const val = parseFloat(currentInput); currentInput = (val * val).toString(); resetScreen = true; updateDisplay(); }
    function mem(type) {
      const cur = parseFloat(currentInput) || 0;
      if (type === 'MC') memory = 0;
      if (type === 'MR') { currentInput = memory.toString(); resetScreen = true; updateDisplay(); }
      if (type === 'M+') { memory += cur; resetScreen = true; }
      if (type === 'M-') { memory -= cur; resetScreen = true; }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') appendNum(e.key);
      else if (e.key === '.') appendDot();
      else if (e.key === '+') appendOp('+');
      else if (e.key === '-') appendOp('-');
      else if (e.key === '*') appendOp('*');
      else if (e.key === '/') { e.preventDefault(); appendOp('/'); }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculate(); }
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') clearAll();
    });
  </script>
</body>
</html>`;

        return {
            title: 'Precision Calculator App',
            type: 'Calculator Widget',
            code: code,
            stages: [
                { name: 'Architecture & State Spec', agent: 'AGT-ARCH-104', desc: 'Designed register state machine, operand queue & memory buffer specifications.' },
                { name: 'LCD Display & Keypad Component', agent: 'AGT-ENG-291', desc: 'Implemented CSS Grid 4x4 layout, crisp high-contrast cards & LCD display.' },
                { name: 'Core Arithmetic Engine', agent: 'AGT-DEV-582', desc: 'Built IEEE 754 precision math parser with +, -, ×, ÷, %, √x, and x² handlers.' },
                { name: 'Validation & Precision Test Suite', agent: 'AGT-VAL-882', desc: 'Executed 120 automated test assertions covering division by zero, float precision, and chain operations.' },
                { name: 'Live Artifact Compilation', agent: 'NEXUS-BUILD-01', desc: 'Compiled, bundled and deployed standalone interactive calculator artifact.' }
            ]
        };
    }

    // 🎵 MUSIC PLAYER APP
    static generateMusicPlayer(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .player-card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 28px; width: 380px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
    .cover-art { width: 100%; height: 200px; background: linear-gradient(135deg, #6366f1, #ec4899, #f59e0b); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 64px; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3); }
    .track-info h3 { font-size: 18px; font-weight: 800; color: #ffffff; }
    .track-info p { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .progress-bar-wrap { margin: 20px 0 12px; }
    .scrubber { width: 100%; accent-color: #6366f1; cursor: pointer; }
    .time-row { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-family: monospace; }
    .controls { display: flex; justify-content: space-between; align-items: center; margin: 20px 0 10px; }
    .ctrl-btn { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; }
    .ctrl-btn:hover { color: #fff; }
    .play-circle { width: 56px; height: 56px; background: #6366f1; color: #fff; border-radius: 50%; font-size: 24px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4); }
    .playlist { margin-top: 16px; border-top: 1px solid #334155; padding-top: 14px; }
    .song-item { display: flex; justify-content: space-between; padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
    .song-item:hover { background: #334155; }
    .song-item.active { background: #334155; color: #38bdf8; font-weight: 700; }
  </style>
</head>
<body>
  <div class="player-card">
    <div class="cover-art" id="art">🎧</div>
    <div class="track-info">
      <h3 id="name">Cosmic Waves</h3>
      <p id="artist">Nexus Swarm Beats • 2026</p>
    </div>
    <div class="progress-bar-wrap">
      <input type="range" class="scrubber" id="prog" min="0" max="100" value="30" oninput="seek(this.value)">
      <div class="time-row"><span id="cur">1:12</span><span id="dur">3:45</span></div>
    </div>
    <div class="controls">
      <button class="ctrl-btn" onclick="prev()">⏮</button>
      <button class="play-circle" id="playBtn" onclick="toggle()">▶</button>
      <button class="ctrl-btn" onclick="next()">⏭</button>
    </div>
    <div class="playlist">
      <div class="song-item active" onclick="load(0)"><span>1. Cosmic Waves</span><span>3:45</span></div>
      <div class="song-item" onclick="load(1)"><span>2. Cyber Synth Symphony</span><span>4:12</span></div>
      <div class="song-item" onclick="load(2)"><span>3. Autonomous Dreams</span><span>2:58</span></div>
    </div>
  </div>
  <script>
    let playing = false, track = 0, sec = 72, ctx = null;
    const songs = [
      { name: 'Cosmic Waves', artist: 'Nexus Swarm Beats', icon: '🎧', dur: 225 },
      { name: 'Cyber Synth Symphony', artist: 'Neural Rhythm Lab', icon: '⚡', dur: 252 },
      { name: 'Autonomous Dreams', artist: 'Deep Wave Studio', icon: '🌌', dur: 178 }
    ];
    function toggle() {
      playing = !playing;
      document.getElementById('playBtn').textContent = playing ? '⏸' : '▶';
      if (playing && !ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (playing) playSynth();
    }
    function playSynth() {
      if (!playing || !ctx) return;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.frequency.value = [261, 329, 392, 523][Math.floor(Math.random()*4)];
      g.gain.value = 0.04; osc.connect(g); g.connect(ctx.destination);
      osc.start(); setTimeout(() => { osc.stop(); if (playing) setTimeout(playSynth, 350); }, 180);
    }
    function load(i) {
      track = i;
      const s = songs[track];
      document.getElementById('name').textContent = s.name;
      document.getElementById('artist').textContent = s.artist;
      document.getElementById('art').textContent = s.icon;
      document.querySelectorAll('.song-item').forEach((el, idx) => el.classList.toggle('active', idx === i));
    }
    function next() { load((track + 1) % songs.length); }
    function prev() { load((track - 1 + songs.length) % songs.length); }
    function seek(v) { sec = Math.floor((v/100) * songs[track].dur); }
  </script>
</body>
</html>`;
        return {
            title: 'Modern Music Player',
            type: 'Audio App',
            code: code,
            stages: [
                { name: 'Audio Pipeline Architecture', agent: 'AGT-AUD-101', desc: 'Designed Web Audio buffer graph and track queue.' },
                { name: 'Player UI & Equalizer', agent: 'AGT-UI-202', desc: 'Constructed responsive jukebox interface with scrubber.' }
            ]
        };
    }

    // 💬 AI CHAT ASSISTANT
    static generateAIChat(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #f8fafc; color: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .chat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; width: 440px; height: 550px; display: flex; flex-direction: column; box-shadow: 0 15px 35px rgba(0,0,0,0.08); overflow: hidden; }
    .chat-header { background: #2563eb; color: #ffffff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }
    .msg { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.4; }
    .msg.bot { background: #ffffff; border: 1px solid #e2e8f0; align-self: flex-start; border-bottom-left-radius: 2px; }
    .msg.user { background: #2563eb; color: #ffffff; align-self: flex-end; border-bottom-right-radius: 2px; }
    .chat-input-row { padding: 12px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; }
    input { flex: 1; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 13px; outline: none; }
    button { background: #2563eb; color: #ffffff; border: none; border-radius: 10px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <div class="chat-card">
    <div class="chat-header">
      <div>
        <div style="font-weight:800;font-size:15px;">🤖 Nexus AI Assistant</div>
        <div style="font-size:11px;opacity:0.9;">● Online • Swarm Intelligence</div>
      </div>
      <span style="font-size:12px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:99px;">v4.0</span>
    </div>
    <div class="chat-messages" id="msgs">
      <div class="msg bot">Hello! I am your AI agent assistant. How can I help you today?</div>
    </div>
    <div class="chat-input-row">
      <input id="inp" placeholder="Type a message..." onkeydown="if(event.key==='Enter')send()">
      <button onclick="send()">Send</button>
    </div>
  </div>
  <script>
    function send() {
      const inp = document.getElementById('inp'), text = inp.value.trim();
      if (!text) return;
      append(text, 'user');
      inp.value = '';
      setTimeout(() => {
        const replies = [
          "I have analyzed your request across the 1 Crore agent swarm. Everything is executing with 99.99% accuracy!",
          "Great question! I'm actively orchestrating the neural microservices to synthesize that solution.",
          "Confirmed. Optimization algorithms have deployed the necessary worker agents to handle this task.",
          "Done! The autonomous pipeline has processed your input and verified all test assertions."
        ];
        append(replies[Math.floor(Math.random() * replies.length)], 'bot');
      }, 500);
    }
    function append(t, type) {
      const m = document.getElementById('msgs');
      const div = document.createElement('div');
      div.className = 'msg ' + type;
      div.textContent = t;
      m.appendChild(div);
      m.scrollTop = m.scrollHeight;
    }
  </script>
</body>
</html>`;
        return {
            title: 'AI Chat Assistant',
            type: 'Conversational Agent',
            code: code,
            stages: [
                { name: 'Dialog Engine & State Manager', agent: 'AGT-NLP-101', desc: 'Designed conversational context and message dispatchers.' }
            ]
        };
    }

    // 🎨 CANVAS DRAWING STUDIO
    static generateCanvasDrawing(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #f8fafc; color: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .studio-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 15px 30px rgba(0,0,0,0.06); }
    .toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    canvas { background: #ffffff; border: 2px solid #cbd5e1; border-radius: 10px; cursor: crosshair; }
    button { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }
    button:hover { background: #e2e8f0; }
  </style>
</head>
<body>
  <div class="studio-card">
    <div class="toolbar">
      <label style="font-size:12px;font-weight:700;">Color:</label>
      <input type="color" id="col" value="#2563eb" style="border:none;width:32px;height:32px;cursor:pointer;">
      <label style="font-size:12px;font-weight:700;">Size:</label>
      <input type="range" id="size" min="1" max="30" value="4" style="width:80px;">
      <button onclick="clearCanvas()">Clear</button>
      <button onclick="save()" style="background:#059669;color:#fff;border:none;">💾 Save Image</button>
    </div>
    <canvas id="c" width="450" height="320"></canvas>
  </div>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    let drawing = false;
    c.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    c.addEventListener('mousemove', e => {
      if (!drawing) return;
      ctx.lineWidth = document.getElementById('size').value;
      ctx.lineCap = 'round';
      ctx.strokeStyle = document.getElementById('col').value;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });
    window.addEventListener('mouseup', () => drawing = false);
    function clearCanvas() { ctx.clearRect(0, 0, c.width, c.height); }
    function save() {
      const a = document.createElement('a');
      a.download = 'drawing.png';
      a.href = c.toDataURL();
      a.click();
    }
  </script>
</body>
</html>`;
        return {
            title: 'Canvas Drawing Studio',
            type: 'Creative Tool',
            code: code,
            stages: [
                { name: 'Canvas Renderer Engine', agent: 'AGT-GFX-101', desc: 'Synthesized 2D rasterizer and export pipeline.' }
            ]
        };
    }

    // 📈 CRYPTO DASHBOARD
    static generateCryptoDashboard(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #0f172a; color: #f8fafc; padding: 24px; display: flex; justify-content: center; }
    .dash-card { background: #1e293b; border: 1px solid #334155; border-radius: 18px; width: 480px; padding: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .price-large { font-size: 32px; font-weight: 800; color: #10b981; font-family: monospace; }
    .chart-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; height: 140px; margin: 16px 0; padding: 8px; position: relative; }
    canvas { width: 100%; height: 100%; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
    .stat-b { background: #0f172a; padding: 10px; border-radius: 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="dash-card">
    <div class="header-row">
      <div>
        <h3 style="font-size:16px;font-weight:800;">BTC/USD • Real-Time Feed</h3>
        <p style="font-size:11px;color:#94a3b8">Autonomous Algorithmic Telemetry</p>
      </div>
      <span style="background:#064e3b;color:#34d399;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;">+4.28%</span>
    </div>
    <div class="price-large" id="p">$64,820.50</div>
    <div class="chart-box">
      <canvas id="chart" width="430" height="120"></canvas>
    </div>
    <div class="stats-grid">
      <div class="stat-b"><div style="color:#94a3b8">24h High</div><div style="font-weight:700;font-size:14px;margin-top:2px;">$65,490.00</div></div>
      <div class="stat-b"><div style="color:#94a3b8">24h Low</div><div style="font-weight:700;font-size:14px;margin-top:2px;">$63,120.00</div></div>
    </div>
  </div>
  <script>
    let pts = [64200, 64350, 64100, 64450, 64600, 64520, 64820];
    const c = document.getElementById('chart'), ctx = c.getContext('2d');
    function draw() {
      ctx.clearRect(0,0,430,120);
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3;
      ctx.beginPath();
      pts.forEach((pt, i) => {
        let x = (i / (pts.length - 1)) * 420 + 5;
        let y = 110 - ((pt - 63500) / 2000) * 100;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    draw();
    setInterval(() => {
      let delta = (Math.random() * 80 - 38);
      let cur = pts[pts.length - 1] + delta;
      pts.push(cur); if (pts.length > 20) pts.shift();
      document.getElementById('p').textContent = '$' + cur.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      draw();
    }, 1200);
  </script>
</body>
</html>`;
        return {
            title: 'Crypto Market Terminal',
            type: 'Financial Widget',
            code: code,
            stages: [
                { name: 'Market Feed Engine', agent: 'AGT-FIN-101', desc: 'Synthesized high-frequency stochastic tick parser.' }
            ]
        };
    }

    static generateTodo(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #f8fafc; color: #0f172a; display: flex; justify-content: center; padding: 30px 15px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; width: 440px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    h2 { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
    .input-row { display: flex; gap: 8px; margin-bottom: 16px; }
    input { flex: 1; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #0f172a; outline: none; }
    button { background: #059669; color: #ffffff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
    .item.done span { text-decoration: line-through; opacity: 0.5; }
    .del { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 11px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>📋 Swarm Task & Goal Manager</h2>
    <div class="input-row">
      <input id="inp" placeholder="Add a new task..." onkeydown="if(event.key==='Enter')addTask()">
      <button onclick="addTask()">Add</button>
    </div>
    <div id="list"></div>
  </div>
  <script>
    let tasks = [{ text: 'Architect autonomous agent swarm', done: true }, { text: 'Test precision arithmetic solver', done: false }];
    function render() {
      const el = document.getElementById('list');
      el.innerHTML = tasks.map((t, i) => \`
        <div class="item \${t.done ? 'done' : ''}">
          <span onclick="toggle(\${i})" style="cursor:pointer;font-weight:600">\${t.done ? '✓' : '○'} \${t.text}</span>
          <button class="del" onclick="del(\${i})">✕</button>
        </div>\`).join('');
    }
    function addTask() {
      const inp = document.getElementById('inp');
      if (inp.value.trim()) { tasks.unshift({ text: inp.value.trim(), done: false }); inp.value = ''; render(); }
    }
    function toggle(i) { tasks[i].done = !tasks[i].done; render(); }
    function del(i) { tasks.splice(i, 1); render(); }
    render();
  </script>
</body>
</html>`;
        return {
            title: 'Task & Kanban Engine',
            type: 'Productivity App',
            code: code,
            stages: [
                { name: 'Model & Schema Design', agent: 'AGT-ARCH-201', desc: 'Defined local persistence models and task status transitions.' },
                { name: 'UI Components', agent: 'AGT-ENG-409', desc: 'Built responsive list view with inline edit & delete actions.' },
                { name: 'State Management', agent: 'AGT-DEV-112', desc: 'Implemented state reactive rendering and filter bindings.' }
            ]
        };
    }

    static generateSnakeGame(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #0f172a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    h2 { margin-bottom: 8px; color: #10b981; }
    canvas { background: #020617; border: 2px solid #334155; border-radius: 12px; }
    .score { font-size: 16px; font-weight: 700; margin-bottom: 10px; font-family: monospace; }
  </style>
</head>
<body>
  <h2>🐍 Retro Arcade Snake</h2>
  <div class="score">SCORE: <span id="s">0</span></div>
  <canvas id="c" width="300" height="300"></canvas>
  <p style="margin-top:10px;font-size:12px;color:#94a3b8">Use Arrow Keys on Keyboard to Play</p>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    let snake = [{x:10,y:10}], food = {x:5,y:5}, dx=1, dy=0, score=0;
    function loop() {
      let head = {x: snake[0].x + dx, y: snake[0].y + dy};
      if (head.x < 0) head.x = 14; if (head.x > 14) head.x = 0;
      if (head.y < 0) head.y = 14; if (head.y > 14) head.y = 0;
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10; document.getElementById('s').innerText = score;
        food = {x: Math.floor(Math.random()*15), y: Math.floor(Math.random()*15)};
      } else snake.pop();
      ctx.fillStyle = '#020617'; ctx.fillRect(0,0,300,300);
      ctx.fillStyle = '#10b981';
      snake.forEach(s => ctx.fillRect(s.x*20, s.y*20, 18, 18));
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(food.x*20, food.y*20, 18, 18);
    }
    setInterval(loop, 120);
    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && dy === 0) { dx=0; dy=-1; }
      if (e.key === 'ArrowDown' && dy === 0) { dx=0; dy=1; }
      if (e.key === 'ArrowLeft' && dx === 0) { dx=-1; dy=0; }
      if (e.key === 'ArrowRight' && dx === 0) { dx=1; dy=0; }
    });
  </script>
</body>
</html>`;
        return {
            title: 'Arcade Snake Game',
            type: 'Canvas Game',
            code: code,
            stages: [
                { name: 'Game Loop Architecture', agent: 'AGT-GAME-101', desc: 'Constructed 60fps tick dispatcher and coordinate matrix.' },
                { name: 'Collision & Physics Engine', agent: 'AGT-DEV-204', desc: 'Wired toroidal boundary wrapping and food generation.' }
            ]
        };
    }

    static generateWeather(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #f0fdf4; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 18px; padding: 24px; width: 340px; box-shadow: 0 15px 30px rgba(0,0,0,0.05); }
    .city { font-size: 20px; font-weight: 800; color: #0f172a; }
    .temp { font-size: 48px; font-weight: 800; color: #059669; margin: 10px 0; }
    .cond { font-size: 14px; font-weight: 600; color: #64748b; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .box { background: #f8fafc; padding: 10px; border-radius: 8px; }
    .val { font-weight: 700; color: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="city">San Francisco, CA</div>
    <div class="cond">☀️ Sunny • Clear Sky</div>
    <div class="temp">72°F</div>
    <div class="details">
      <div class="box"><div>Wind</div><div class="val">8 mph W</div></div>
      <div class="box"><div>Humidity</div><div class="val">48%</div></div>
      <div class="box"><div>Air Quality</div><div class="val">24 AQI (Good)</div></div>
      <div class="box"><div>UV Index</div><div class="val">3 (Moderate)</div></div>
    </div>
  </div>
</body>
</html>`;
        return {
            title: 'Live Weather Dashboard',
            type: 'Telemetry Widget',
            code: code,
            stages: [
                { name: 'Weather Data Fetcher', agent: 'AGT-API-101', desc: 'Simulated real-time atmospheric telemetry feeds.' }
            ]
        };
    }

    static generateTimer(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 30px; width: 320px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    h2 { font-size: 16px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
    .clock { font-size: 54px; font-weight: 800; font-family: monospace; color: #2563eb; margin: 16px 0; }
    .btns { display: flex; gap: 8px; justify-content: center; }
    button { background: #2563eb; color: #fff; font-weight: 700; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; }
    button.reset { background: #f1f5f9; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Pomodoro Focus Timer</h2>
    <div class="clock" id="t">25:00</div>
    <div class="btns">
      <button onclick="toggle()" id="b">Start</button>
      <button class="reset" onclick="reset()">Reset</button>
    </div>
  </div>
  <script>
    let s = 1500, active = false, iv = null;
    function toggle() {
      active = !active;
      document.getElementById('b').innerText = active ? 'Pause' : 'Start';
      if (active) {
        iv = setInterval(() => {
          if (s > 0) s--;
          let m = Math.floor(s/60).toString().padStart(2,'0'), sec = (s%60).toString().padStart(2,'0');
          document.getElementById('t').innerText = m + ':' + sec;
        }, 1000);
      } else clearInterval(iv);
    }
    function reset() { active = false; clearInterval(iv); s = 1500; document.getElementById('t').innerText = '25:00'; document.getElementById('b').innerText = 'Start'; }
  </script>
</body>
</html>`;
        return {
            title: 'Pomodoro Productivity Clock',
            type: 'Productivity Widget',
            code: code,
            stages: [
                { name: 'Timer Clock Dispatcher', agent: 'AGT-CLK-101', desc: 'Constructed accurate tick clock interval engine.' }
            ]
        };
    }

    // DYNAMIC DEDICATED APP
    static generateDynamicApp(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #f8fafc; color: #0f172a; padding: 30px; display: flex; justify-content: center; }
    .box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; max-width: 600px; width: 100%; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; margin-bottom: 12px; }
    h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    p { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 20px; }
    .metric-row { display: flex; gap: 10px; margin-bottom: 20px; }
    .m-card { flex: 1; background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; }
    .m-val { font-size: 18px; font-weight: 800; color: #2563eb; }
    .m-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }
    .input-grp { margin-bottom: 16px; }
    label { font-size: 12px; font-weight: 700; margin-bottom: 6px; display: block; }
    input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; }
    button { width: 100%; background: #059669; color: #fff; font-weight: 700; padding: 12px; border: none; border-radius: 8px; cursor: pointer; }
    .terminal { background: #0f172a; color: #38bdf8; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="box">
    <span class="badge">● SWARM EXECUTABLE ARTIFACT</span>
    <h1>${goalText || 'Agent Goal Artifact'}</h1>
    <p>This custom interactive solution was designed, coded, and verified by the Agent Universe autonomous swarm to accomplish the target specifications.</p>
    
    <div class="metric-row">
      <div class="m-card"><div class="m-val">100%</div><div class="m-lbl">Spec Accuracy</div></div>
      <div class="m-card"><div class="m-val">Active</div><div class="m-lbl">Swarm Status</div></div>
      <div class="m-card"><div class="m-val">0.9ms</div><div class="m-lbl">Latency</div></div>
    </div>

    <div class="input-grp">
      <label>Dynamic Parameter Input</label>
      <input id="param" value="Production Parameter Alpha" placeholder="Enter input value...">
    </div>

    <button onclick="runAppAction()">▶ Execute Swarm Operation</button>
    <div class="terminal" id="term">&gt; System initialized for "${goalText.replace(/'/g, "\\'")}". Ready for execution.</div>
  </div>
  <script>
    function runAppAction() {
      const p = document.getElementById('param').value;
      document.getElementById('term').innerHTML = '&gt; Executing pipeline with parameter: "' + p + '"...<br>&gt; Memory buffer check: OK<br>&gt; Core handlers validated: 100%<br>&gt; Operation completed successfully!';
    }
  </script>
</body>
</html>`;
        return {
            title: goalText || 'Custom Swarm Tool',
            type: 'Swarm Application',
            code: code,
            stages: [
                { name: 'Requirements Analysis', agent: 'AGT-ARCH-101', desc: `Synthesized specifications for "${goalText}".` },
                { name: 'Logic Synthesis', agent: 'AGT-DEV-202', desc: 'Generated functional logic, handlers and state model.' },
                { name: 'Integration & Testing', agent: 'AGT-VAL-303', desc: 'Verified boundary conditions and performance compliance.' },
                { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Compiled working executable package.' }
            ]
        };
    }
}

// ==========================================
// CORE CLASSES: TASK, AGENT, FACTORY, INDUSTRY
// ==========================================

class Task {
    constructor(template, factoryId) {
        this.id = 'TSK-' + generateId();
        this.name = template.name;
        this.description = template.description || this.name;
        this.priority = weightedRandom(template.priorityWeights || PRIORITIES);
        this.estimatedDuration = randomInt(2000, 6000);
        this.remainingDuration = this.estimatedDuration;
        this.progress = 0;
        this.status = TASK_STATUS.QUEUED;
        this.assignedAgentId = null;
        this.factoryId = factoryId;
        this.outputFn = template.output;
        this.output = null;
    }

    tick(deltaMs, simSpeed) {
        if (this.status !== TASK_STATUS.ACTIVE) return;
        const effectiveDelta = deltaMs * simSpeed;
        this.remainingDuration -= effectiveDelta;
        this.progress = Math.max(0, Math.min(100, 100 - (this.remainingDuration / this.estimatedDuration) * 100));
        if (this.remainingDuration <= 0) {
            this.progress = 100;
        }
    }

    complete() {
        this.status = TASK_STATUS.COMPLETE;
        this.output = this.outputFn ? this.outputFn() : `Completed ${this.name} successfully.`;
    }
}

class Agent {
    constructor(id) {
        this.id = id || 'AGT-' + generateId();
        this.type = randomChoice(AGENT_TYPES);
        this.state = AGENT_STATE.IDLE;
        this.currentTask = null;
        this.factoryId = null;
        this.tasksCompleted = 0;
    }

    tick(deltaMs, simSpeed) {
        if (this.state === AGENT_STATE.WORKING && this.currentTask) {
            this.currentTask.tick(deltaMs, simSpeed);
            if (this.currentTask.progress >= 100) {
                this.state = AGENT_STATE.REPORTING;
            }
        } else if (this.state === AGENT_STATE.REPORTING) {
            this.completeTask();
        }
    }

    assignTask(task) {
        this.currentTask = task;
        this.state = AGENT_STATE.WORKING;
        task.status = TASK_STATUS.ACTIVE;
        task.assignedAgentId = this.id;
    }

    completeTask() {
        if (this.currentTask) {
            this.currentTask.complete();
            this.tasksCompleted++;
            if (this.factoryId) {
                const factory = AgentUniverse.instance.getFactory(this.factoryId);
                if (factory) factory.onTaskCompleted(this.currentTask);
            }
            this.currentTask = null;
        }
        this.state = AGENT_STATE.IDLE;
    }
}

class Factory {
    constructor(industryId, data) {
        this.id = 'FAC-' + generateId();
        this.industryId = industryId;
        this.name = data.name;
        this.goal = data.goal || 'Production optimization';
        this.agents = [];
        this.taskQueue = [];
        this.activeTasks = [];
        this.completedTasks = [];
        this.outputLog = [];
        this.metrics = { tasksCompleted: 0, throughput: 0 };
        this.lastThroughputCalc = Date.now();
        this.completedSinceLastCalc = 0;
    }

    tick(deltaMs, simSpeed) {
        // Generate new tasks if queue is low
        if (this.taskQueue.length < this.agents.length * 2 && Math.random() < (0.15 * simSpeed)) {
            this.generateTask();
        }

        // Tick agents & assign
        for (const agent of this.agents) {
            agent.tick(deltaMs, simSpeed);
            if (agent.state === AGENT_STATE.IDLE && this.taskQueue.length > 0) {
                const task = this.taskQueue.shift();
                this.activeTasks.push(task);
                agent.assignTask(task);
            }
        }

        // Throughput calculation
        const now = Date.now();
        if (now - this.lastThroughputCalc > 1000) {
            this.metrics.throughput = this.completedSinceLastCalc * 60;
            this.completedSinceLastCalc = 0;
            this.lastThroughputCalc = now;
        }
    }

    generateTask() {
        const templates = [
            { name: `Process data batch #${randomInt(1000, 9999)}`, output: () => `Processed ${randomInt(500, 5000)} records in pipeline.` },
            { name: `Execute unit test suite`, output: () => `120 assertions passed with 0 regression.` },
            { name: `Optimize query execution plan`, output: () => `Latency reduced by ${randomInt(10, 40)}%.` },
            { name: `Telemetry & anomaly inspection`, output: () => `All nodes operational. Error rate: 0.00%.` }
        ];
        const tpl = randomChoice(templates);
        this.taskQueue.push(new Task(tpl, this.id));
    }

    addAgent(agent) {
        agent.factoryId = this.id;
        agent.state = AGENT_STATE.IDLE;
        agent.currentTask = null;
        this.agents.push(agent);
    }

    removeAgent(agentId) {
        const idx = this.agents.findIndex(a => a.id === agentId);
        if (idx > -1) {
            const agent = this.agents[idx];
            if (agent.currentTask) {
                this.activeTasks = this.activeTasks.filter(t => t.id !== agent.currentTask.id);
                agent.currentTask.status = TASK_STATUS.QUEUED;
                agent.currentTask.assignedAgentId = null;
                this.taskQueue.unshift(agent.currentTask);
            }
            this.agents.splice(idx, 1);
            return agent;
        }
        return null;
    }

    onTaskCompleted(task) {
        this.activeTasks = this.activeTasks.filter(t => t.id !== task.id);
        this.completedTasks.unshift(task);
        if (this.completedTasks.length > 30) this.completedTasks.pop();
        
        this.metrics.tasksCompleted++;
        this.completedSinceLastCalc++;
        
        this.outputLog.unshift({
            timestamp: Date.now(),
            agentId: task.assignedAgentId,
            text: task.output
        });
        if (this.outputLog.length > 30) this.outputLog.pop();

        if (Math.random() < 0.06) {
            AgentUniverse.instance.eventLog.log('task', `[${this.name}] ${task.name} completed.`);
        }
    }

    getStats() {
        return {
            id: this.id,
            name: this.name,
            goal: this.goal,
            agentCount: this.agents.length,
            queueLength: this.taskQueue.length,
            activeCount: this.activeTasks.length,
            completedCount: this.metrics.tasksCompleted,
            throughput: this.metrics.throughput
        };
    }
}

class Industry {
    constructor(data) {
        this.id = data.id || 'ind-' + generateId().toLowerCase();
        this.name = data.name;
        this.icon = data.icon || '🏗️';
        this.color = data.color || '#2563eb';
        this.description = data.description || 'Specialized domain ecosystem';
        this.factories = [];
        if (data.factories) {
            data.factories.forEach(f => this.factories.push(new Factory(this.id, f)));
        }
    }

    tick(deltaMs, simSpeed) {
        for (const fac of this.factories) {
            fac.tick(deltaMs, simSpeed);
        }
    }

    getStats() {
        let totalAgents = 0, totalTasks = 0, totalThroughput = 0;
        this.factories.forEach(fac => {
            totalAgents += fac.agents.length;
            totalTasks += fac.metrics.tasksCompleted;
            totalThroughput += fac.metrics.throughput;
        });
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
            color: this.color,
            description: this.description,
            factoriesCount: this.factories.length,
            agents: totalAgents,
            tasks: totalTasks,
            throughput: totalThroughput
        };
    }
}

// ==========================================
// GOAL SYSTEM
// ==========================================

class Goal {
    constructor(config) {
        this.id = 'GOAL-' + generateId();
        this.text = config.text;
        this.priority = config.priority || 'P1';
        this.scope = config.scope || 'universe';
        this.mode = config.mode || 'auto'; // 'auto' or 'manual'
        this.manualAgentCount = config.manualAgentCount || 0;
        this.targetFactoryId = config.targetFactoryId || null;

        this.subtaskCount = config.subtaskCount || 1000;
        this.completedSubtasks = 0;
        this.progress = 0;
        this.active = true;
        this.createdAt = Date.now();
        this.completedAt = null;
        this.convergence = this.scope === 'universe' && config.convergence;

        // Generate full interactive application code and stages
        this.artifactData = ArtifactGenerator.generate(this.text);
        this.stages = this.artifactData.stages || [
            { name: 'Requirements & State Spec', agent: 'AGT-ARCH-101', desc: 'Analyzing goal requirements and state model.' },
            { name: 'UI & Layout Synthesis', agent: 'AGT-ENG-204', desc: 'Building responsive components and clean styling.' },
            { name: 'Core Logic Implementation', agent: 'AGT-DEV-309', desc: 'Developing state machine and calculation parsers.' },
            { name: 'Input & Event Binding', agent: 'AGT-UI-412', desc: 'Wiring keyboard and interactive click handlers.' },
            { name: 'Precision Validation & Tests', agent: 'AGT-VAL-519', desc: 'Running test suites and verifying edge cases.' },
            { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Packaging standalone executable artifact.' }
        ];
        this.lastStageIndex = -1;
    }

    getCurrentStage() {
        const stageIdx = Math.min(this.stages.length - 1, Math.floor((this.progress / 100) * this.stages.length));
        return { index: stageIdx, stage: this.stages[stageIdx] };
    }

    tick(activeAgentCount, simSpeed) {
        if (!this.active) return;
        
        // Progress rate based on mode
        let effectiveAgents = activeAgentCount || 100;
        if (this.mode === 'manual' && this.manualAgentCount > 0) {
            effectiveAgents = this.manualAgentCount;
        }

        const contributing = Math.max(10, Math.min(effectiveAgents, 50000));
        const stepRate = (contributing * simSpeed * 0.05);
        this.completedSubtasks = Math.min(this.subtaskCount, this.completedSubtasks + stepRate);
        this.progress = Math.min(100, (this.completedSubtasks / this.subtaskCount) * 100);

        // Check if stage transitioned
        const currentStageInfo = this.getCurrentStage();
        if (currentStageInfo.index > this.lastStageIndex) {
            this.lastStageIndex = currentStageInfo.index;
            const stage = currentStageInfo.stage;
            AgentUniverse.instance?.eventLog?.log('task', `[${stage.agent}] Stage ${currentStageInfo.index + 1}/${this.stages.length}: ${stage.name} for "${this.text}"`);
        }
        
        if (this.progress >= 100) {
            this.progress = 100;
            this.active = false;
            this.completedAt = Date.now();
            AgentUniverse.instance?.eventLog?.log('task', `🎉 GOAL COMPLETE: "${this.text}" — Interactive App ready to play!`);
        }
    }
}

// ==========================================
// BENCH POOL & EVENT LOG
// ==========================================

class BenchPool {
    constructor(initialCount) {
        this.count = initialCount;
        this.deployQueue = [];
        this.recallQueue = [];
    }

    deploy(count, factoryId) {
        const actualCount = Math.min(count, this.count);
        if (actualCount > 0) {
            this.deployQueue.push({ count: actualCount, factoryId });
        }
    }

    recall(agentIds) {
        this.recallQueue.push(...agentIds);
    }

    tick() {
        // Process deployments
        if (this.deployQueue.length > 0) {
            const req = this.deployQueue[0];
            const batch = Math.min(req.count, 500, this.count);
            if (batch > 0) {
                const fac = AgentUniverse.instance.getFactory(req.factoryId);
                if (fac) {
                    for (let i = 0; i < batch; i++) fac.addAgent(new Agent());
                    this.count -= batch;
                    req.count -= batch;
                } else {
                    req.count = 0;
                }
            }
            if (req.count <= 0) this.deployQueue.shift();
        }

        // Process recalls
        if (this.recallQueue.length > 0) {
            const batchCount = Math.min(this.recallQueue.length, 500);
            const batch = this.recallQueue.splice(0, batchCount);
            batch.forEach(id => {
                const fac = AgentUniverse.instance.findFactoryForAgent(id);
                if (fac) {
                    fac.removeAgent(id);
                    this.count++;
                }
            });
        }
    }
}

class EventLog {
    constructor(maxEvents = 150) {
        this.events = [];
        this.maxEvents = maxEvents;
    }

    log(type, message, detail = '') {
        this.events.unshift({
            id: generateId(),
            type,
            message,
            detail,
            timestamp: Date.now()
        });
        if (this.events.length > this.maxEvents) this.events.pop();
    }

    clear() {
        this.events = [];
    }
}

// ==========================================
// MAIN UNIVERSE SINGLETON
// ==========================================

class AgentUniverse {
    static instance = null;

    constructor() {
        if (AgentUniverse.instance) return AgentUniverse.instance;
        AgentUniverse.instance = this;

        this.industries = [];
        this.bench = new BenchPool(SIM_CONFIG.maxBenchAgents);
        this.eventLog = new EventLog(150);
        this.goals = [];
        this.convergenceMode = false;
        this.convergenceGoal = null;

        this.startTime = Date.now();
        this.lastTickTime = Date.now();
        this.simSpeed = 5;
        this.paused = false;

        this.metrics = {
            totalTasksCompleted: 0,
            globalThroughput: 0
        };

        this.renderer = new Renderer(this);
    }

    init() {
        // Load initial industries
        INITIAL_INDUSTRIES.forEach(d => this.industries.push(new Industry(d)));

        // Initial agent distribution across factories
        let initialDeployed = 0;
        this.industries.forEach(ind => {
            ind.factories.forEach(fac => {
                const count = randomInt(SIM_CONFIG.factoryInitialAgentsMin, SIM_CONFIG.factoryInitialAgentsMax);
                this.bench.deploy(count, fac.id);
                initialDeployed += count;
            });
        });

        // Add Smartwatch & Calculator starting goals
        this.addGoal({
            text: 'make a smartwatch',
            priority: 'P1',
            mode: 'auto',
            subtaskCount: 600
        });

        this.addGoal({
            text: 'make a small calculator',
            priority: 'P2',
            mode: 'auto',
            subtaskCount: 400
        });

        this.eventLog.log('system', `Agent Universe online. 6 Industries, ${this.getAllFactories().length} Factories, 1 Crore AI Agent bench.`);

        this.loop();
        this.renderer.init();
    }

    getFactory(factoryId) {
        for (const ind of this.industries) {
            for (const fac of ind.factories) {
                if (fac.id === factoryId) return fac;
            }
        }
        return null;
    }

    getIndustry(industryId) {
        return this.industries.find(i => i.id === industryId) || null;
    }

    getAllFactories() {
        let factories = [];
        for (const ind of this.industries) {
            factories = factories.concat(ind.factories);
        }
        return factories;
    }

    findFactoryForAgent(agentId) {
        for (const ind of this.industries) {
            for (const fac of ind.factories) {
                if (fac.agents.some(a => a.id === agentId)) return fac;
            }
        }
        return null;
    }

    addGoal(config) {
        // Auto unpause
        if (this.paused) {
            this.paused = false;
            const stopBtn = document.getElementById('btn-emergency-stop');
            if (stopBtn) stopBtn.textContent = '⏸ Emergency Pause';
            this.eventLog.log('alert', 'Simulation auto-resumed to execute goal.');
        }

        const goal = new Goal(config);
        this.goals.unshift(goal);

        // Auto or manual allocation
        if (goal.mode === 'manual' && goal.manualAgentCount > 0) {
            const targetFac = goal.targetFactoryId ? this.getFactory(goal.targetFactoryId) : randomChoice(this.getAllFactories());
            if (targetFac) {
                this.bench.deploy(goal.manualAgentCount, targetFac.id);
                this.eventLog.log('deploy', `Manually deployed ${formatNumber(goal.manualAgentCount)} agents to [${targetFac.name}] for goal "${goal.text}".`);
            }
        } else {
            // Auto deployment based on complexity
            const factories = this.getAllFactories();
            if (factories.length > 0) {
                const autoCount = goal.text.includes('smartwatch') ? 8000 : 3000;
                const perFac = Math.ceil(autoCount / factories.length);
                factories.forEach(f => this.bench.deploy(perFac, f.id));
                this.eventLog.log('deploy', `Auto-scaled swarm: allocated ${formatNumber(autoCount)} agents from bench for "${goal.text}".`);
            }
        }

        if (config.convergence) {
            this.enterConvergenceMode(goal);
        }

        this.eventLog.log('system', `Goal launched: "${goal.text}" — Interactive artifact being built.`);
        return goal;
    }

    removeGoal(goalId) {
        const idx = this.goals.findIndex(g => g.id === goalId);
        if (idx > -1) {
            const goal = this.goals[idx];
            if (goal.convergence) this.exitConvergenceMode();
            this.goals.splice(idx, 1);
            this.eventLog.log('system', `Goal removed: "${goal.text}"`);
        }
    }

    enterConvergenceMode(goal) {
        this.convergenceMode = true;
        this.convergenceGoal = goal;
        const factories = this.getAllFactories();
        if (factories.length > 0) {
            const countPer = Math.floor(Math.min(this.bench.count, 20000) / factories.length);
            factories.forEach(f => this.bench.deploy(countPer, f.id));
        }
        this.eventLog.log('alert', `🎯 CONVERGENCE ACTIVE: All agents focused on "${goal.text}"`);
    }

    exitConvergenceMode() {
        this.convergenceMode = false;
        this.convergenceGoal = null;
        this.eventLog.log('alert', 'Convergence Mode concluded.');
    }

    freeAllAgents() {
        let totalFreed = 0;
        this.industries.forEach(ind => {
            ind.factories.forEach(fac => {
                totalFreed += fac.agents.length;
                this.bench.count += fac.agents.length;
                fac.agents = [];
                fac.activeTasks.forEach(t => {
                    t.status = TASK_STATUS.QUEUED;
                    fac.taskQueue.unshift(t);
                });
                fac.activeTasks = [];
            });
        });
        if (this.convergenceMode) this.exitConvergenceMode();
        this.eventLog.log('alert', `All ${formatNumber(totalFreed)} agents freed and returned to reserve bench.`);
    }

    customizeIndustry(id, config) {
        const ind = this.getIndustry(id);
        if (!ind) return;
        if (config.name) ind.name = config.name;
        if (config.icon) ind.icon = config.icon;
        if (config.color) ind.color = config.color;
        if (config.description) ind.description = config.description;
        this.eventLog.log('system', `Industry "${ind.name}" updated.`);
    }

    customizeFactory(id, config) {
        const fac = this.getFactory(id);
        if (!fac) return;
        if (config.name) fac.name = config.name;
        if (config.goal) fac.goal = config.goal;
        this.eventLog.log('system', `Factory "${fac.name}" updated.`);
    }

    addNewIndustry(config) {
        const ind = new Industry({
            name: config.name || 'New Industry',
            icon: config.icon || '🏗️',
            color: config.color || '#2563eb',
            description: config.description || 'Custom industry ecosystem.'
        });
        this.industries.push(ind);
        this.eventLog.log('deploy', `New industry created: "${ind.name}"`);
        return ind;
    }

    addNewFactory(industryId, config) {
        const ind = this.getIndustry(industryId);
        if (!ind) return null;
        const fac = new Factory(industryId, {
            name: config.name || 'New Factory',
            goal: config.goal || 'Production pipeline'
        });
        ind.factories.push(fac);
        this.bench.deploy(50, fac.id);
        this.eventLog.log('deploy', `New factory "${fac.name}" added to ${ind.name}.`);
        return fac;
    }

    tick() {
        if (this.paused) {
            this.lastTickTime = Date.now();
            return;
        }

        const now = Date.now();
        const deltaMs = now - this.lastTickTime;
        this.lastTickTime = now;

        this.bench.tick();

        let totalTasks = 0, totalThroughput = 0;
        for (const ind of this.industries) {
            ind.tick(deltaMs, this.simSpeed);
            for (const fac of ind.factories) {
                totalTasks += fac.metrics.tasksCompleted;
                totalThroughput += fac.metrics.throughput;
            }
        }

        this.metrics.totalTasksCompleted = totalTasks;
        this.metrics.globalThroughput = totalThroughput;

        // Tick goals
        const globalStats = this.getGlobalStats();
        this.goals.forEach(goal => {
            goal.tick(globalStats.activeAgents, this.simSpeed);
        });

        if (this.convergenceMode && this.convergenceGoal && !this.convergenceGoal.active) {
            this.exitConvergenceMode();
        }
    }

    loop = () => {
        this.tick();
        requestAnimationFrame(this.loop);
    }

    getGlobalStats() {
        let activeAgents = 0;
        this.industries.forEach(ind => {
            ind.factories.forEach(fac => {
                activeAgents += fac.agents.length;
            });
        });

        return {
            totalAgents: activeAgents + this.bench.count,
            activeAgents: activeAgents,
            benchAgents: this.bench.count,
            tasksCompleted: this.metrics.totalTasksCompleted,
            throughput: this.metrics.globalThroughput,
            uptimeMs: Date.now() - this.startTime
        };
    }
}

// ==========================================
// DOM RENDERER
// ==========================================

class Renderer {
    constructor(universe) {
        this.universe = universe;
        this.currentView = 'universe';
        this.currentIndustryId = null;
        this.currentFactoryId = null;
        this.lastRenderTime = 0;
        this.eventFilter = 'all';
        this._currentModalArtifact = null;
        this.deploymentMode = 'auto'; // 'auto' or 'manual'
    }

    init() {
        this.bindEvents();
        this.populateFactoryDropdowns();
        this.renderLoop();
    }

    populateFactoryDropdowns() {
        const selects = ['manual-target-factory', 'manual-goal-target-select'];
        selects.forEach(selId => {
            const el = document.getElementById(selId);
            if (!el) return;
            let html = selId === 'manual-goal-target-select' ? '<option value="auto">🌐 Auto-Selected Optimal Industry</option>' : '';
            this.universe.industries.forEach(ind => {
                html += `<optgroup label="${ind.icon} ${ind.name}">`;
                ind.factories.forEach(fac => {
                    html += `<option value="${fac.id}">${fac.name}</option>`;
                });
                html += `</optgroup>`;
            });
            el.innerHTML = html;
        });
    }

    bindEvents() {
        document.body.addEventListener('click', (e) => {
            // Top Nav Tabs
            const tabBtn = e.target.closest('.top-tab');
            if (tabBtn) {
                const view = tabBtn.dataset.view;
                this.switchView(view);
                return;
            }

            // Deployment Mode Selector
            const modePill = e.target.closest('.mode-pill');
            if (modePill) {
                document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
                modePill.classList.add('active');
                this.deploymentMode = modePill.dataset.mode;
                const opts = document.getElementById('manual-goal-options');
                if (opts) opts.style.display = this.deploymentMode === 'manual' ? 'block' : 'none';
                return;
            }

            // Manual Size Chips
            const sizeChip = e.target.closest('.manual-size-chip');
            if (sizeChip) {
                const count = sizeChip.dataset.size;
                const inp = document.getElementById('manual-goal-agent-count');
                if (inp) inp.value = count;
                return;
            }

            // Quick Dispatch Chips in Sidebar
            const qdChip = e.target.closest('.quick-dispatch-chip');
            if (qdChip) {
                const val = qdChip.dataset.val;
                const inp = document.getElementById('manual-agent-count');
                if (inp) inp.value = val;
                return;
            }

            // Manual Deploy from Sidebar
            if (e.target.id === 'btn-manual-deploy') {
                const facId = document.getElementById('manual-target-factory')?.value;
                const count = parseInt(document.getElementById('manual-agent-count')?.value) || 1000;
                if (facId && count > 0) {
                    this.universe.bench.deploy(count, facId);
                    const fac = this.universe.getFactory(facId);
                    this.universe.eventLog.log('deploy', `Manually dispatched ${formatNumber(count)} agents to [${fac ? fac.name : facId}].`);
                }
                return;
            }

            // Quick Suggestions
            const suggBtn = e.target.closest('.sugg-chip');
            if (suggBtn && !suggBtn.classList.contains('manual-size-chip')) {
                const goal = suggBtn.dataset.goal;
                const input = document.getElementById('quick-goal-input');
                if (input) input.value = goal;
                return;
            }

            // Quick Deploy Goal
            if (e.target.id === 'btn-quick-deploy-goal') {
                const input = document.getElementById('quick-goal-input');
                const text = input ? input.value.trim() : '';
                if (!text) {
                    alert('Please enter what you want the AI Swarm to create.');
                    return;
                }
                
                const isManual = this.deploymentMode === 'manual';
                const manualCount = parseInt(document.getElementById('manual-goal-agent-count')?.value) || 5000;
                const targetFac = document.getElementById('manual-goal-target-select')?.value;

                this.universe.addGoal({
                    text: text,
                    scope: 'universe',
                    priority: 'P1',
                    mode: isManual ? 'manual' : 'auto',
                    manualAgentCount: isManual ? manualCount : 0,
                    targetFactoryId: targetFac !== 'auto' ? targetFac : null
                });

                input.value = '';
                return;
            }

            // Quick Convergence Mode
            if (e.target.id === 'btn-quick-convergence') {
                const input = document.getElementById('quick-goal-input');
                const text = input && input.value.trim() ? input.value.trim() : 'make a smartwatch';
                this.universe.addGoal({ text: text, scope: 'universe', priority: 'P0', convergence: true });
                if (input) input.value = '';
                return;
            }

            // Sidebar Controls
            if (e.target.id === 'btn-deploy-batch') {
                const factories = this.universe.getAllFactories();
                if (factories.length > 0) {
                    const perFac = Math.ceil(10000 / factories.length);
                    factories.forEach(f => this.universe.bench.deploy(perFac, f.id));
                    this.universe.eventLog.log('deploy', 'Mobilized 10,000 agents across all factories.');
                }
            }
            if (e.target.id === 'btn-recall-batch') {
                const factories = this.universe.getAllFactories();
                let count = 0;
                factories.forEach(f => {
                    const idle = f.agents.filter(a => a.state === AGENT_STATE.IDLE).map(a => a.id);
                    this.universe.bench.recall(idle);
                    count += idle.length;
                });
                this.universe.eventLog.log('system', `Recalled ${formatNumber(count)} idle agents to bench.`);
            }
            if (e.target.id === 'btn-free-all') {
                this.universe.freeAllAgents();
            }
            if (e.target.id === 'btn-emergency-stop') {
                this.universe.paused = !this.universe.paused;
                e.target.textContent = this.universe.paused ? '▶ Resume Swarm' : '⏸ Emergency Pause';
                this.universe.eventLog.log('alert', `Swarm ${this.universe.paused ? 'PAUSED' : 'RESUMED'}.`);
            }

            // Navigation & Industry Cards
            const indCard = e.target.closest('.industry-card-white');
            if (indCard && !e.target.closest('button')) {
                this.switchView('industry', indCard.dataset.industryId);
                return;
            }
            const indNavItem = e.target.closest('.industry-nav-item');
            if (indNavItem) {
                this.switchView('industry', indNavItem.dataset.industryId);
                return;
            }
            const facBox = e.target.closest('.factory-box-white');
            if (facBox && !e.target.closest('button')) {
                this.switchView('factory', null, facBox.dataset.factoryId);
                return;
            }

            // Back Buttons
            if (e.target.id === 'btn-back-to-universe') this.switchView('universe');
            if (e.target.id === 'btn-back-to-industry') this.switchView('industry', this.currentIndustryId);

            // Open Apps & Test Artifact Buttons
            const openAppBtn = e.target.closest('.btn-open-app-modal');
            if (openAppBtn) {
                const goalId = openAppBtn.dataset.goalId;
                this.showArtifactModal(goalId);
                return;
            }
            const testInGalleryBtn = e.target.closest('.btn-test-in-gallery');
            if (testInGalleryBtn) {
                const goalId = testInGalleryBtn.dataset.goalId;
                this.loadAppIntoPlayer(goalId);
                this.switchView('apps-gallery');
                return;
            }

            // Edit / Customize Buttons
            const editIndBtn = e.target.closest('.btn-edit-industry');
            if (editIndBtn) {
                this.showCustomizeModal('industry', editIndBtn.dataset.industryId);
                return;
            }
            const editFacBtn = e.target.closest('.btn-edit-factory');
            if (editFacBtn) {
                this.showCustomizeModal('factory', editFacBtn.dataset.factoryId);
                return;
            }

            // Add Industry / Factory Buttons
            if (e.target.id === 'btn-add-industry-main' || e.target.id === 'btn-add-industry-hub' || e.target.id === 'btn-sidebar-add-industry') {
                this.showCustomizeModal('new-industry');
                return;
            }
            const addFacBtn = e.target.closest('.btn-add-factory-to-ind');
            if (addFacBtn) {
                this.showCustomizeModal('new-factory', addFacBtn.dataset.industryId);
                return;
            }

            // Goal Removal
            const rmGoalBtn = e.target.closest('.btn-remove-goal');
            if (rmGoalBtn) {
                this.universe.removeGoal(rmGoalBtn.dataset.goalId);
                return;
            }

            // Exit Convergence
            if (e.target.id === 'btn-exit-convergence') {
                this.universe.exitConvergenceMode();
            }

            // Modals Close
            if (e.target.classList.contains('modal-close') || e.target.id === 'btn-cancel-customize' || e.target.id === 'btn-cancel-goal' || e.target.id === 'btn-close-artifact' || e.target.id === 'modal-overlay') {
                this.hideModal();
            }

            // Submit Modals
            if (e.target.id === 'btn-save-customize') this.submitCustomize();
            if (e.target.id === 'btn-submit-goal') this.submitAdvancedGoal();

            // Artifact Modal Tabs
            const mTab = e.target.closest('.modal-tab');
            if (mTab) {
                const tab = mTab.dataset.tab;
                document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.artifact-tab-panel').forEach(p => p.classList.remove('active'));
                mTab.classList.add('active');
                document.getElementById(`artifact-tab-${tab}`)?.classList.add('active');
            }

            // Mobile Sidebar Toggle
            if (e.target.id === 'btn-toggle-mobile-sidebar') {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle('mobile-open');
                return;
            }

            // Create Another App Button in Gallery
            if (e.target.id === 'btn-create-another-app') {
                this.switchView('universe');
                setTimeout(() => {
                    const inp = document.getElementById('quick-goal-input');
                    if (inp) { inp.focus(); inp.scrollIntoView({ behavior: 'smooth' }); }
                }, 100);
                return;
            }

            // Fullscreen Sandbox Player
            if (e.target.id === 'btn-player-fullscreen') {
                const wrap = document.getElementById('player-iframe-wrap');
                if (wrap) {
                    if (wrap.requestFullscreen) wrap.requestFullscreen();
                    else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
                }
                return;
            }

            // Open Standalone in New Tab
            const openTabBtn = e.target.closest('.btn-open-standalone-tab');
            if (e.target.id === 'btn-player-open-tab' || e.target.id === 'btn-open-artifact-tab' || openTabBtn) {
                const goalId = openTabBtn ? openTabBtn.dataset.goalId : (this._currentModalArtifact ? this._currentModalArtifact.id : null);
                const goal = (goalId ? this.universe.goals.find(g => g.id === goalId) : null) || this._currentModalArtifact || this.universe.goals[0];
                if (goal && goal.artifactData?.code) {
                    const blob = new Blob([goal.artifactData.code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                }
                return;
            }

            // Download App from Gallery Card
            const dlCardBtn = e.target.closest('.btn-download-app-card');
            if (dlCardBtn) {
                const goal = this.universe.goals.find(g => g.id === dlCardBtn.dataset.goalId);
                if (goal && goal.artifactData?.code) {
                    const blob = new Blob([goal.artifactData.code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(goal.text || 'app').replace(/[^a-z0-9]/gi, '_')}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
                return;
            }

            // Copy / Download Code
            if (e.target.id === 'btn-copy-artifact-code' || e.target.id === 'btn-player-view-code') {
                const code = this._currentModalArtifact?.artifactData?.code;
                if (code) {
                    navigator.clipboard.writeText(code);
                    e.target.textContent = '✓ Copied!';
                    setTimeout(() => { e.target.textContent = '📋 Copy All Code'; }, 2000);
                }
            }
            if (e.target.id === 'btn-download-artifact' || e.target.id === 'btn-player-download') {
                const code = this._currentModalArtifact?.artifactData?.code;
                if (code) {
                    const blob = new Blob([code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(this._currentModalArtifact?.text || 'app').replace(/[^a-z0-9]/gi, '_')}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }

            // Clear Feed
            if (e.target.id === 'btn-clear-feed') {
                this.universe.eventLog.clear();
            }

            // Feed Filters
            const filterPill = e.target.closest('.filter-pill');
            if (filterPill) {
                document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
                filterPill.classList.add('active');
                this.eventFilter = filterPill.dataset.filter;
            }

            // Factory Agent Controls
            if (e.target.id === 'btn-factory-add-agents' && this.currentFactoryId) {
                this.universe.bench.deploy(50, this.currentFactoryId);
            }
            if (e.target.id === 'btn-factory-remove-agents' && this.currentFactoryId) {
                const fac = this.universe.getFactory(this.currentFactoryId);
                if (fac) {
                    const idle = fac.agents.filter(a => a.state === AGENT_STATE.IDLE).slice(0, 50).map(a => a.id);
                    this.universe.bench.recall(idle);
                }
            }
        });

        // Quick goal Enter key
        document.getElementById('quick-goal-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-quick-deploy-goal')?.click();
            }
        });

        // Speed Slider
        document.getElementById('sim-speed')?.addEventListener('input', (e) => {
            this.universe.simSpeed = parseFloat(e.target.value);
            const lbl = document.getElementById('sim-speed-label');
            if (lbl) lbl.textContent = this.universe.simSpeed + 'x';
        });

        // Goal modal scope change
        document.getElementById('goal-scope')?.addEventListener('change', (e) => {
            const grp = document.getElementById('goal-target-group');
            if (grp) grp.style.display = e.target.value === 'universe' ? 'none' : 'block';
        });
    }

    switchView(view, industryId = null, factoryId = null) {
        this.currentView = view;
        this.currentIndustryId = industryId;
        this.currentFactoryId = factoryId;

        // Update Top Tabs
        document.querySelectorAll('.top-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.view === view);
        });

        // Hide all view panels
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active-view'));

        if (view === 'universe') {
            document.getElementById('universe-view')?.classList.add('active-view');
        } else if (view === 'industries-hub') {
            document.getElementById('industries-hub-view')?.classList.add('active-view');
            this.renderIndustriesHub();
        } else if (view === 'apps-gallery') {
            document.getElementById('apps-gallery-view')?.classList.add('active-view');
            if (this.universe.goals.length > 0 && !this._currentModalArtifact) {
                this.loadAppIntoPlayer(this.universe.goals[0].id);
            }
            this.renderAppsGallery();
        } else if (view === 'telemetry') {
            document.getElementById('telemetry-view')?.classList.add('active-view');
            this.renderTelemetry();
        } else if (view === 'industry') {
            document.getElementById('industry-view')?.classList.add('active-view');
            this.renderIndustryView();
        } else if (view === 'factory') {
            document.getElementById('factory-view')?.classList.add('active-view');
            this.renderFactoryView();
        }

        this.render();
    }

    renderLoop = () => {
        const now = Date.now();
        if (now - this.lastRenderTime >= SIM_CONFIG.renderThrottleMs) {
            this.render();
            this.lastRenderTime = now;
        }
        requestAnimationFrame(this.renderLoop);
    }

    render() {
        this.renderOverseerBar();
        this.renderSidebar();
        this.renderConvergenceBanner();

        if (this.currentView === 'universe') {
            this.renderUniverseView();
        } else if (this.currentView === 'industries-hub') {
            this.renderIndustriesHub();
        } else if (this.currentView === 'apps-gallery') {
            this.renderAppsGallery();
        } else if (this.currentView === 'telemetry') {
            this.renderTelemetry();
        } else if (this.currentView === 'industry' && this.currentIndustryId) {
            this.renderIndustryView();
        } else if (this.currentView === 'factory' && this.currentFactoryId) {
            this.renderFactoryView();
        }

        this.renderEventFeed();
    }

    safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    renderOverseerBar() {
        const stats = this.universe.getGlobalStats();
        this.safeSetText('metric-total-agents', formatNumber(stats.totalAgents));
        this.safeSetText('metric-active-agents', formatNumber(stats.activeAgents));
        this.safeSetText('metric-bench-agents', formatNumber(stats.benchAgents));
        this.safeSetText('metric-tasks-completed', formatNumber(stats.tasksCompleted));
        this.safeSetText('metric-throughput', Math.floor(stats.throughput));
        this.safeSetText('metric-uptime', formatTime(stats.uptimeMs));
        this.safeSetText('overseer-status', this.universe.paused ? '⏸ SYSTEM PAUSED' : '● SYSTEM OPTIMAL');
        this.safeSetText('apps-count-badge', this.universe.goals.length);
    }

    renderSidebar() {
        const stats = this.universe.getGlobalStats();
        this.safeSetText('bench-available', formatNumber(stats.benchAgents));

        let deploying = 0;
        this.universe.bench.deployQueue.forEach(q => deploying += q.count);
        this.safeSetText('bench-deploying', formatNumber(deploying));

        const pct = (stats.activeAgents / stats.totalAgents) * 100;
        const fill = document.getElementById('bench-bar');
        if (fill) fill.style.width = Math.min(100, Math.max(1, pct)) + '%';
        this.safeSetText('bench-pct', pct.toFixed(3) + '% active');

        // Sidebar industry list
        const container = document.getElementById('industry-nav');
        if (container) {
            let html = '';
            this.universe.industries.forEach(ind => {
                const s = ind.getStats();
                const isActive = this.currentView === 'industry' && this.currentIndustryId === ind.id;
                html += `
                <button class="industry-nav-item ${isActive ? 'active' : ''}" data-industry-id="${ind.id}">
                  <div class="ind-nav-left">
                    <span>${ind.icon}</span>
                    <span>${ind.name}</span>
                  </div>
                  <span class="ind-nav-count">${formatCompact(s.agents)}</span>
                </button>`;
            });
            container.innerHTML = html;
        }
    }

    renderConvergenceBanner() {
        const banner = document.getElementById('convergence-banner');
        if (!banner) return;
        if (this.universe.convergenceMode && this.universe.convergenceGoal) {
            banner.classList.add('active');
            this.safeSetText('convergence-goal-text', this.universe.convergenceGoal.text);
            const fill = document.getElementById('convergence-bar');
            if (fill) fill.style.width = this.universe.convergenceGoal.progress + '%';
            this.safeSetText('convergence-pct', this.universe.convergenceGoal.progress.toFixed(1) + '%');
            const stats = this.universe.getGlobalStats();
            this.safeSetText('convergence-agents-working', formatCompact(stats.activeAgents) + ' agents');
        } else {
            banner.classList.remove('active');
        }
    }

    renderUniverseView() {
        // Render Active Goals
        const goalsContainer = document.getElementById('active-goals-container');
        if (goalsContainer) {
            if (this.universe.goals.length === 0) {
                goalsContainer.innerHTML = `
                <div class="goal-card-white" style="justify-content:center;color:var(--text-muted);font-weight:500;padding:24px;">
                  No goals currently deployed. Type what you want to build above to deploy the AI Swarm!
                </div>`;
            } else {
                let html = '';
                this.universe.goals.forEach(goal => {
                    const isDone = goal.progress >= 100;
                    const stage = goal.getCurrentStage();
                    html += `
                    <div class="goal-card-white ${isDone ? 'completed-card' : ''}">
                      <span class="goal-priority-badge prio-${goal.priority.toLowerCase()}">${isDone ? 'READY' : goal.priority}</span>
                      <div class="goal-main-info">
                        <div class="goal-title-text">${goal.text}</div>
                        <div class="goal-meta-row">
                          <span style="font-weight:700;color:var(--accent-blue)">[${goal.mode.toUpperCase()}${goal.manualAgentCount ? ': ' + formatNumber(goal.manualAgentCount) + ' AGTS' : ''}]</span>
                          <span>•</span>
                          <span>${formatNumber(Math.round(goal.completedSubtasks))}/${formatNumber(goal.subtaskCount)} subtasks</span>
                        </div>
                        <div>
                          <span class="goal-stage-pill ${isDone ? 'done' : ''}">
                            ${isDone ? '✨ Live Artifact Compiled & Ready' : `⚡ Stage ${stage.index + 1}/${goal.stages.length}: ${stage.stage.name}`}
                          </span>
                        </div>
                      </div>
                      <div class="goal-progress-box">
                        <div class="goal-bar-track">
                          <div class="goal-bar-fill" style="width:${goal.progress}%"></div>
                        </div>
                        <span class="goal-pct-text">${goal.progress.toFixed(1)}%</span>
                      </div>
                      <div class="goal-actions-wrap">
                        <button class="btn btn-sm btn-success btn-open-app-modal" data-goal-id="${goal.id}">
                          🎮 Open App
                        </button>
                        <button class="btn btn-sm btn-outline-secondary btn-test-in-gallery" data-goal-id="${goal.id}" title="Open in Gallery">
                          ⛶ Gallery
                        </button>
                        <button class="btn-text-link btn-remove-goal" data-goal-id="${goal.id}" style="color:var(--text-muted);font-size:14px;padding:4px;" title="Remove">✕</button>
                      </div>
                    </div>`;
                });
                goalsContainer.innerHTML = html;
            }
        }

        // Render Industry Ecosystems
        const indGrid = document.getElementById('industries-grid');
        if (indGrid) {
            let html = '';
            this.universe.industries.forEach(ind => {
                const s = ind.getStats();
                html += `
                <div class="industry-card-white" data-industry-id="${ind.id}">
                  <div class="ind-card-header">
                    <div class="ind-card-title-group">
                      <span class="ind-card-icon">${ind.icon}</span>
                      <h4 class="ind-card-name">${ind.name}</h4>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary btn-edit-industry" data-industry-id="${ind.id}">✎ Edit</button>
                  </div>
                  <p class="ind-card-desc">${ind.description}</p>
                  <div class="ind-card-metrics-grid">
                    <div class="ind-metric-item">
                      <div class="ind-metric-val mono">${formatNumber(s.agents)}</div>
                      <div class="ind-metric-lbl">Active Agents</div>
                    </div>
                    <div class="ind-metric-item">
                      <div class="ind-metric-val mono">${formatNumber(s.tasks)}</div>
                      <div class="ind-metric-lbl">Completed</div>
                    </div>
                    <div class="ind-metric-item">
                      <div class="ind-metric-val mono">${Math.floor(s.throughput)}/m</div>
                      <div class="ind-metric-lbl">Throughput</div>
                    </div>
                    <div class="ind-metric-item">
                      <div class="ind-metric-val mono">${s.factoriesCount}</div>
                      <div class="ind-metric-lbl">Factories</div>
                    </div>
                  </div>
                  <div class="ind-card-footer-flex">
                    <span class="view-factories-link">Explore ${s.factoriesCount} Factories →</span>
                  </div>
                </div>`;
            });
            indGrid.innerHTML = html;
        }
    }

    renderIndustriesHub() {
        const container = document.getElementById('all-industries-factories-container');
        if (!container) return;
        let html = '';
        this.universe.industries.forEach(ind => {
            const s = ind.getStats();
            html += `
            <div class="hub-industry-block">
              <div class="hub-ind-header">
                <div class="ind-card-title-group">
                  <span class="ind-card-icon">${ind.icon}</span>
                  <div>
                    <h3 style="font-size:18px;font-weight:800;color:var(--text-heading)">${ind.name}</h3>
                    <p style="font-size:12px;color:var(--text-muted)">${ind.description}</p>
                  </div>
                </div>
                <div class="ind-action-buttons">
                  <button class="btn btn-sm btn-outline-secondary btn-edit-industry" data-industry-id="${ind.id}">✎ Rename Industry</button>
                  <button class="btn btn-sm btn-primary btn-add-factory-to-ind" data-industry-id="${ind.id}">+ Add Factory</button>
                </div>
              </div>
              <div class="hub-factories-grid">`;
            
            ind.factories.forEach(fac => {
                const fs = fac.getStats();
                html += `
                <div class="factory-box-white" data-factory-id="${fac.id}">
                  <div class="factory-box-header">
                    <span class="factory-box-name">${fac.name}</span>
                    <button class="btn btn-sm btn-outline-secondary btn-edit-factory" data-factory-id="${fac.id}">✎ Customize</button>
                  </div>
                  <p class="factory-box-goal">🎯 ${fac.goal}</p>
                  <div class="factory-box-stats">
                    <span>👥 ${fs.agentCount} Agents</span>
                    <span>⚡ ${Math.floor(fs.throughput)}/min</span>
                    <span>✓ ${formatNumber(fs.completedCount)} Done</span>
                  </div>
                </div>`;
            });

            html += `
              </div>
            </div>`;
        });
        container.innerHTML = html;
    }

    loadAppIntoPlayer(goalId) {
        const goal = this.universe.goals.find(g => g.id === goalId) || this.universe.goals[0];
        if (!goal) return;
        this._currentModalArtifact = goal;
        this.safeSetText('player-app-title', goal.artifactData.title || goal.text);
        this.safeSetText('player-app-meta', `Created for goal: "${goal.text}" • 100% Verified`);
        const wrap = document.getElementById('player-iframe-wrap');
        if (wrap) {
            wrap.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.className = 'player-iframe';
            iframe.srcdoc = goal.artifactData.code;
            wrap.appendChild(iframe);
        }
    }

    renderAppsGallery() {
        const grid = document.getElementById('apps-gallery-grid');
        if (!grid) return;
        let html = '';
        this.universe.goals.forEach(goal => {
            html += `
            <div class="app-gallery-card">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="app-card-type">${goal.artifactData.type}</span>
                <span style="font-size:10px;font-weight:700;color:var(--accent-emerald)">✓ READY</span>
              </div>
              <h4 class="app-card-title">${goal.artifactData.title}</h4>
              <p style="font-size:12px;color:var(--text-muted);line-height:1.4;">Goal: "${goal.text}"</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto;padding-top:10px;">
                <button class="btn btn-sm btn-success btn-open-app-modal" data-goal-id="${goal.id}">🎮 Play App</button>
                <button class="btn btn-sm btn-outline-primary btn-open-standalone-tab" data-goal-id="${goal.id}">↗ Open Tab</button>
                <button class="btn btn-sm btn-outline-secondary btn-test-in-gallery" data-goal-id="${goal.id}">⛶ In Sandbox</button>
                <button class="btn btn-sm btn-outline-secondary btn-download-app-card" data-goal-id="${goal.id}">⬇ Download</button>
              </div>
            </div>`;
        });
        grid.innerHTML = html;
    }

    renderTelemetry() {
        const stats = this.universe.getGlobalStats();
        const pct = (stats.activeAgents / stats.totalAgents) * 100;
        this.safeSetText('tel-utilization', pct.toFixed(3) + '%');
        this.safeSetText('tel-tasks', formatNumber(stats.tasksCompleted));
        this.safeSetText('tel-throughput', Math.floor(stats.throughput) + ' tasks/min');

        const feed = document.getElementById('telemetry-full-events');
        if (feed) {
            let html = '';
            this.universe.eventLog.events.forEach(e => {
                const time = new Date(e.timestamp).toLocaleTimeString();
                html += `
                <div class="feed-event-card event-${e.type}">
                  <span class="feed-event-time">${time}</span>
                  <span class="feed-event-msg">${e.message}</span>
                </div>`;
            });
            feed.innerHTML = html;
        }
    }

    renderIndustryView() {
        const ind = this.universe.getIndustry(this.currentIndustryId);
        if (!ind) return;
        this.safeSetText('industry-title', `${ind.icon} ${ind.name}`);
        this.safeSetText('industry-subtitle', ind.description);

        const stats = ind.getStats();
        const metricsHtml = `
          <div class="metric-card"><span class="metric-label">Agents Deployed</span><span class="metric-value mono">${formatNumber(stats.agents)}</span></div>
          <div class="metric-card"><span class="metric-label">Tasks Completed</span><span class="metric-value mono">${formatNumber(stats.tasks)}</span></div>
          <div class="metric-card"><span class="metric-label">Throughput</span><span class="metric-value mono">${Math.floor(stats.throughput)}/min</span></div>
          <div class="metric-card"><span class="metric-label">Factories</span><span class="metric-value mono">${stats.factoriesCount}</span></div>
        `;
        const metricsEl = document.getElementById('industry-metrics');
        if (metricsEl) metricsEl.innerHTML = metricsHtml;

        const grid = document.getElementById('factories-grid');
        if (grid) {
            let html = '';
            ind.factories.forEach(fac => {
                const fs = fac.getStats();
                html += `
                <div class="factory-box-white" data-factory-id="${fac.id}" style="background:#fff;">
                  <div class="factory-box-header">
                    <span class="factory-box-name" style="font-size:15px;">${fac.name}</span>
                    <button class="btn btn-sm btn-outline-secondary btn-edit-factory" data-factory-id="${fac.id}">✎ Customize</button>
                  </div>
                  <p class="factory-box-goal">🎯 ${fac.goal}</p>
                  <div class="factory-box-stats" style="margin-top:12px;">
                    <span>👥 ${fs.agentCount} Agents</span>
                    <span>⚡ ${Math.floor(fs.throughput)}/min</span>
                    <span>✓ ${formatNumber(fs.completedCount)} Done</span>
                  </div>
                  <button class="btn btn-sm btn-primary" style="margin-top:10px;" onclick="agentUniverse.renderer.switchView('factory', null, '${fac.id}')">View Factory Console →</button>
                </div>`;
            });
            grid.innerHTML = html;
        }
    }

    renderFactoryView() {
        const fac = this.universe.getFactory(this.currentFactoryId);
        if (!fac) return;
        const ind = this.universe.getIndustry(fac.industryId);

        this.safeSetText('factory-title', `${fac.name}`);
        this.safeSetText('factory-subtitle', `Industry: ${ind ? ind.name : 'Unknown'} • ID: ${fac.id}`);

        const fs = fac.getStats();
        const statsEl = document.getElementById('factory-stats');
        if (statsEl) {
            statsEl.innerHTML = `
              <h4 class="card-heading">FACTORY TELEMETRY</h4>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div><div style="font-size:18px;font-weight:800;" class="mono">${fs.agentCount}</div><div style="font-size:10px;color:var(--text-muted)">ACTIVE AGENTS</div></div>
                <div><div style="font-size:18px;font-weight:800;" class="mono">${fs.queueLength}</div><div style="font-size:10px;color:var(--text-muted)">TASK QUEUE</div></div>
                <div><div style="font-size:18px;font-weight:800;" class="mono">${Math.floor(fs.throughput)}/m</div><div style="font-size:10px;color:var(--text-muted)">THROUGHPUT</div></div>
                <div><div style="font-size:18px;font-weight:800;" class="mono">${formatNumber(fs.completedCount)}</div><div style="font-size:10px;color:var(--text-muted)">COMPLETED</div></div>
              </div>`;
        }

        const goalContent = document.getElementById('factory-goal-content');
        if (goalContent) {
            goalContent.innerHTML = `<p style="font-size:13px;font-weight:600;color:var(--text-heading)">🎯 ${fac.goal}</p>`;
        }

        // Active Tasks
        this.safeSetText('factory-task-count', fac.activeTasks.length + fac.taskQueue.length);
        const taskList = document.getElementById('factory-tasks-list');
        if (taskList) {
            let html = '';
            [...fac.activeTasks, ...fac.taskQueue].slice(0, 20).forEach(t => {
                html += `
                <div class="task-item-white">
                  <span style="font-weight:600;">${t.name}</span>
                  <span class="pill-badge">${t.status}</span>
                </div>`;
            });
            taskList.innerHTML = html || '<div style="color:var(--text-muted);font-size:12px;">Queue idle.</div>';
        }

        // Output Log
        const outLog = document.getElementById('factory-output-log');
        if (outLog) {
            let html = '';
            fac.outputLog.slice(0, 15).forEach(l => {
                const time = new Date(l.timestamp).toLocaleTimeString();
                html += `<div><span style="color:#94a3b8">[${time}]</span> <span style="color:#a7f3d0">[${l.agentId || 'SYS'}]</span> ${l.text}</div>`;
            });
            outLog.innerHTML = html || 'Console idle.';
        }

        // Agents
        this.safeSetText('factory-agent-count', fac.agents.length);
        const agtList = document.getElementById('factory-agents-list');
        if (agtList) {
            let html = '';
            fac.agents.slice(0, 25).forEach(a => {
                html += `
                <div class="agent-item-white">
                  <span class="mono" style="font-weight:700;">${a.id}</span>
                  <span style="font-size:10px;font-weight:600;color:var(--accent-blue);">${a.type}</span>
                  <span class="pill-badge" style="color:${a.state === 'WORKING' ? 'var(--accent-emerald)' : 'var(--text-muted)'}">${a.state}</span>
                </div>`;
            });
            agtList.innerHTML = html;
        }
    }

    renderEventFeed() {
        const feed = document.getElementById('events-list');
        if (!feed) return;
        let events = this.universe.eventLog.events;
        if (this.eventFilter !== 'all') {
            events = events.filter(e => e.type === this.eventFilter);
        }
        let html = '';
        events.slice(0, 30).forEach(e => {
            const time = new Date(e.timestamp).toLocaleTimeString();
            html += `
            <div class="feed-event-card event-${e.type}">
              <span class="feed-event-time">${time}</span>
              <span class="feed-event-msg">${e.message}</span>
            </div>`;
        });
        feed.innerHTML = html;
    }

    // Modals
    showModal() {
        document.getElementById('modal-overlay')?.classList.add('visible');
    }

    hideModal() {
        document.getElementById('modal-overlay')?.classList.remove('visible');
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        this._customizeContext = null;
    }

    showArtifactModal(goalId) {
        const goal = this.universe.goals.find(g => g.id === goalId) || this.universe.goals[0];
        if (!goal) return;

        this.hideModal();
        const modal = document.getElementById('modal-artifact');
        if (!modal) return;

        this._currentModalArtifact = goal;
        this.safeSetText('artifact-title', goal.artifactData.title || `Created: ${goal.text}`);
        this.safeSetText('artifact-meta', `Goal: "${goal.text}" • 100% Verified Application`);

        // Sandbox Iframe
        const frame = document.getElementById('sandbox-container');
        if (frame) {
            frame.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.className = 'sandbox-iframe';
            iframe.srcdoc = goal.artifactData.code;
            frame.appendChild(iframe);
        }

        // Code view
        const codeView = document.querySelector('#artifact-code-view code');
        if (codeView) codeView.textContent = goal.artifactData.code;

        // Logs
        const logsView = document.getElementById('artifact-logs-view');
        if (logsView) {
            let html = '';
            goal.stages.forEach((stg, i) => {
                html += `
                <div class="log-step-card">
                  <div style="display:flex;justify-content:space-between;font-weight:700;color:var(--text-heading)">
                    <span>✓ Stage ${i+1}: ${stg.name}</span>
                    <span class="mono" style="font-size:11px;color:var(--accent-blue)">${stg.agent}</span>
                  </div>
                  <p style="font-size:12px;color:var(--text-muted);margin-top:2px;">${stg.desc}</p>
                </div>`;
            });
            logsView.innerHTML = html;
        }

        // Reset tabs
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.artifact-tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector('.modal-tab[data-tab="preview"]')?.classList.add('active');
        document.getElementById('artifact-tab-preview')?.classList.add('active');

        modal.style.display = 'flex';
        this.showModal();
    }

    showCustomizeModal(type, id) {
        this.hideModal();
        const modal = document.getElementById('modal-customize');
        if (!modal) return;
        this._customizeContext = { type, id };
        const title = document.getElementById('customize-title');
        const body = document.getElementById('customize-body');
        if (!body) return;

        if (type === 'industry') {
            const ind = this.universe.getIndustry(id);
            if (!ind) return;
            title.textContent = `Rename Industry: ${ind.name}`;
            body.innerHTML = `
              <div class="form-group"><label class="form-label">Industry Name</label><input class="form-input" id="cust-name" value="${ind.name}"></div>
              <div class="form-group"><label class="form-label">Icon (Emoji)</label><input class="form-input" id="cust-icon" value="${ind.icon}"></div>
              <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="cust-desc">${ind.description}</textarea></div>`;
        } else if (type === 'factory') {
            const fac = this.universe.getFactory(id);
            if (!fac) return;
            title.textContent = `Customize Factory: ${fac.name}`;
            body.innerHTML = `
              <div class="form-group"><label class="form-label">Factory Name</label><input class="form-input" id="cust-name" value="${fac.name}"></div>
              <div class="form-group"><label class="form-label">Factory Goal</label><textarea class="form-textarea" id="cust-goal">${fac.goal}</textarea></div>`;
        } else if (type === 'new-industry') {
            title.textContent = 'Add New Industry';
            body.innerHTML = `
              <div class="form-group"><label class="form-label">Industry Name</label><input class="form-input" id="cust-name" placeholder="e.g. Aerospace & SpaceTech"></div>
              <div class="form-group"><label class="form-label">Icon</label><input class="form-input" id="cust-icon" value="🚀"></div>
              <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="cust-desc" placeholder="Industry description..."></textarea></div>`;
        } else if (type === 'new-factory') {
            const ind = this.universe.getIndustry(id);
            title.textContent = `Add Factory to ${ind ? ind.name : 'Industry'}`;
            body.innerHTML = `
              <div class="form-group"><label class="form-label">Factory Name</label><input class="form-input" id="cust-name" placeholder="e.g. Orbital Data Synthesis Factory"></div>
              <div class="form-group"><label class="form-label">Primary Goal</label><textarea class="form-textarea" id="cust-goal" placeholder="Factory mission..."></textarea></div>`;
        }

        modal.style.display = 'flex';
        this.showModal();
    }

    submitCustomize() {
        if (!this._customizeContext) return;
        const { type, id } = this._customizeContext;
        const name = document.getElementById('cust-name')?.value;
        const icon = document.getElementById('cust-icon')?.value;
        const desc = document.getElementById('cust-desc')?.value;
        const goal = document.getElementById('cust-goal')?.value;

        if (type === 'industry') {
            this.universe.customizeIndustry(id, { name, icon, description: desc });
        } else if (type === 'factory') {
            this.universe.customizeFactory(id, { name, goal });
        } else if (type === 'new-industry') {
            this.universe.addNewIndustry({ name, icon, description: desc });
        } else if (type === 'new-factory') {
            this.universe.addNewFactory(id, { name, goal });
        }

        this.populateFactoryDropdowns();
        this.hideModal();
    }

    submitAdvancedGoal() {
        const text = document.getElementById('goal-text')?.value?.trim();
        if (!text) {
            alert('Please enter a goal description.');
            return;
        }
        const priority = document.getElementById('goal-priority')?.value || 'P2';
        const subtasks = parseInt(document.getElementById('goal-subtasks')?.value) || 1000;
        const scope = document.getElementById('goal-scope')?.value || 'universe';

        this.universe.addGoal({ text, priority, subtaskCount: subtasks, scope });
        this.hideModal();
    }
}

// ==========================================
// BOOTSTRAP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const universe = new AgentUniverse();
    universe.init();
    window.agentUniverse = universe;
});
