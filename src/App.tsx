import React, { useState, useMemo, useEffect } from 'react';
import {
  Smartphone,
  Globe,
  Sparkles,
  Zap,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  TrendingDown,
  Layers,
  Code2,
  MousePointer,
  Keyboard,
  KeyRound,
  Play,
  RotateCcw,
  Sliders,
  ExternalLink,
  Compass,
  Activity,
  Lock,
  Database,
  Send,
  Boxes,
} from 'lucide-react';
import { distillHtmlString } from './distillers/domDistiller.ts';
import { distillAndroidXml } from './distillers/androidDistiller.ts';
import { DistilledState, GhostAction, SessionVaultRecord } from './types/protocol.ts';
import { generateHumanTrajectory, TrajectoryPoint, Point } from './utils/bezier.ts';

// Preset samples
const PRESET_WEB_GITHUB = `<!DOCTYPE html>
<html>
<head><title>GitHub - ghostbridge/core</title></head>
<body>
  <header>
    <h1>GitHub</h1>
    <nav>
      <a href="/pulls">Pull requests (3)</a>
      <a href="/issues">Issues (12)</a>
      <a href="/explore">Explore</a>
    </nav>
  </header>
  <main>
    <div class="repo-header">
      <h2>ghostbridge/core</h2>
      <button class="btn" aria-label="Star repository">Star 1.4k</button>
      <button class="btn">Fork (210)</button>
    </div>
    <div class="search-box">
      <input type="text" id="code-search" placeholder="Search this repository..." value="" />
      <button id="search-btn">Search</button>
    </div>
    <div class="action-bar">
      <button class="btn primary">Code</button>
      <button class="btn">Add file</button>
      <input type="checkbox" id="watch-releases" checked />
      <label for="watch-releases">Notify releases only</label>
    </div>
  </main>
</body>
</html>`;

const PRESET_WEB_LOGIN = `<!DOCTYPE html>
<html>
<head><title>Secure Sign In - Acme Corp</title></head>
<body>
  <div class="auth-card">
    <h2>Sign in to Acme Cloud</h2>
    <div class="form-group">
      <label>Email Address</label>
      <input type="email" id="user-email" placeholder="agent@startup.ai" value="" />
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="user-pwd" placeholder="••••••••" value="" />
    </div>
    <div class="row">
      <input type="checkbox" id="remember-me" checked />
      <label for="remember-me">Trust this device for 30 days</label>
    </div>
    <button id="btn-login" class="btn-primary">Authenticate</button>
    <a href="/forgot">Forgot security key?</a>
    <div class="security-banner">
      <span class="badge">Hardware 2FA Supported</span>
    </div>
  </div>
</body>
</html>`;

const PRESET_WEB_HN = `<!DOCTYPE html>
<html>
<head><title>Hacker News</title></head>
<body>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f6f6ef">
    <tr>
      <td bgcolor="#ff6600">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding:2px">
          <tr>
            <td><a href="https://news.ycombinator.com"><img src="y18.svg" width="18" height="18" alt="Y Combinator"></a></td>
            <td><b><a href="news">Hacker News</a></b> <a href="newest">new</a> | <a href="threads">threads</a> | <a href="past">past</a> | <a href="comments">comments</a> | <a href="ask">ask</a> | <a href="show">show</a> | <a href="jobs">jobs</a> | <a href="submit">submit</a></td>
            <td align="right"><a href="login?goto=news">login</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        <table border="0" cellpadding="0" cellspacing="0" class="itemlist">
          <tr class="athing">
            <td align="right" valign="top" class="title"><span class="rank">1.</span></td>
            <td valign="top" class="votelinks"><center><a id="up_38100" href="vote?id=38100&how=up"><div class="votearrow" title="upvote"></div></a></center></td>
            <td class="title"><span class="titleline"><a href="https://talosintelligence.com/vulnerability">Linux Kernel eBPF Privilege Escalation</a><span class="sitebit comhead"> (<a href="from?site=talosintelligence.com"><span class="sitestr">talosintelligence.com</span></a>)</span></span></td>
          </tr>
          <tr><td colspan="2"></td><td class="subtext"><span class="score">421 points</span> by <a href="user?id=alex">alex</a> <span class="age">3 hours ago</span> | <a href="hide?id=38100">hide</a> | <a href="item?id=38100">89 comments</a></td></tr>
          
          <tr class="athing">
            <td align="right" valign="top" class="title"><span class="rank">2.</span></td>
            <td valign="top" class="votelinks"><center><a id="up_38101" href="vote?id=38101&how=up"><div class="votearrow" title="upvote"></div></a></center></td>
            <td class="title"><span class="titleline"><a href="https://github.com/ghostbridge">GhostBridge: Zero-Cost Semantic Runtime for AI Agents</a><span class="sitebit comhead"> (<a href="from?site=github.com"><span class="sitestr">github.com</span></a>)</span></span></td>
          </tr>
          <tr><td colspan="2"></td><td class="subtext"><span class="score">892 points</span> by <a href="user?id=dang">dang</a> <span class="age">5 hours ago</span> | <a href="hide?id=38101">hide</a> | <a href="item?id=38101">142 comments</a></td></tr>
          
          <tr class="morespace" style="height:10px"></tr>
          <tr><td colspan="2"></td><td class="title"><a href="?p=2" class="morelink" rel="next">More</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        <center>
          <a id="top"></a>
          <form method="get" action="//hn.algolia.com/">Search: <input type="text" name="q" size="17" autocorrect="off" spellcheck="false" autocapitalize="off" autocomplete="false"></form>
        </center>
      </td>
    </tr>
  </table>
</body>
</html>`;

const PRESET_ANDROID_PLAYSTORE = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.android.vending" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,0][1080,2400]">
    <node index="0" text="" resource-id="com.android.vending:id/toolbar" class="android.view.ViewGroup" package="com.android.vending" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,72][1080,240]">
      <node index="0" text="Search apps &amp; games" resource-id="com.android.vending:id/search_box" class="android.widget.EditText" package="com.android.vending" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="true" password="false" selected="false" bounds="[48,96][876,216]" />
      <node index="1" text="" resource-id="com.android.vending:id/voice_btn" class="android.widget.ImageView" package="com.android.vending" content-desc="Voice search" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[876,96][972,216]" />
      <node index="2" text="" resource-id="com.android.vending:id/profile_avatar" class="android.widget.ImageView" package="com.android.vending" content-desc="Google Account: Active" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[972,96][1056,216]" />
    </node>
    <node index="1" text="" resource-id="com.android.vending:id/bottom_nav" class="android.view.ViewGroup" package="com.android.vending" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,2232][1080,2400]">
      <node index="0" text="Games" resource-id="com.android.vending:id/tab_games" class="android.widget.Button" package="com.android.vending" content-desc="Games tab" checkable="true" checked="true" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="true" bounds="[0,2232][360,2400]" />
      <node index="1" text="Apps" resource-id="com.android.vending:id/tab_apps" class="android.widget.Button" package="com.android.vending" content-desc="Apps tab" checkable="true" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[360,2232][720,2400]" />
      <node index="2" text="Offers" resource-id="com.android.vending:id/tab_offers" class="android.widget.Button" package="com.android.vending" content-desc="Offers tab" checkable="true" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[720,2232][1080,2400]" />
    </node>
  </node>
</hierarchy>`;

// Sample mock vault entries
const INITIAL_VAULT_PROFILES: SessionVaultRecord[] = [
  {
    id: 'github.com',
    domain: 'github.com',
    platform: 'web',
    createdAt: '2026-10-31T09:12:00.000Z',
    updatedAt: '2026-10-31T09:45:00.000Z',
    cookies: [
      { name: 'user_session', value: 'ghs_98bfa7***', domain: '.github.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
      { name: '__Host-user_session_same_site', value: 'ghs_98bfa7***', domain: 'github.com', path: '/', httpOnly: true, secure: true, sameSite: 'Strict' },
      { name: 'tz', value: 'America/New_York', domain: '.github.com', path: '/' },
    ],
    notes: 'Primary developer account (2FA verified)',
  },
  {
    id: 'acme.cloud',
    domain: 'acme.cloud',
    platform: 'web',
    createdAt: '2026-10-31T08:30:00.000Z',
    updatedAt: '2026-10-31T10:14:00.000Z',
    cookies: [
      { name: 'session_jwt', value: 'eyJhbGciOi***', domain: 'acme.cloud', path: '/', httpOnly: true, secure: true, sameSite: 'Strict' },
      { name: 'device_fingerprint', value: 'fp_cloaked_mac_01', domain: 'acme.cloud', path: '/' },
    ],
    notes: 'Corporate SSO with Hardware Token',
  },
];

// 7 MCP Tools metadata
const MCP_TOOLS_LIST = [
  {
    name: 'ghost_inspect',
    description: 'Distills active screen into compact numbered Markdown map with token reduction stats.',
    defaultArgs: { platform: 'web' },
  },
  {
    name: 'ghost_click',
    description: 'Clicks an element [targetId] with human Bezier curves (Web) or precision center tap (Android).',
    defaultArgs: { targetId: 2, platform: 'web' },
  },
  {
    name: 'ghost_type',
    description: 'Types text into input [targetId] with realistic human typing cadence.',
    defaultArgs: { targetId: 6, text: 'Search repositories', submit: true },
  },
  {
    name: 'ghost_open',
    description: 'Navigates to URL on web or launches package on Android.',
    defaultArgs: { target: 'https://news.ycombinator.com', platform: 'web' },
  },
  {
    name: 'ghost_scroll',
    description: 'Scrolls viewport with gesture micro-jitter.',
    defaultArgs: { direction: 'down' },
  },
  {
    name: 'ghost_handoff',
    description: 'Pauses agent and sounds terminal chime for manual 2FA/CAPTCHA resolution.',
    defaultArgs: { reason: 'Cloudflare Turnstile challenge encountered' },
  },
  {
    name: 'ghost_switch_target',
    description: 'Toggles active runtime between "web" and "android".',
    defaultArgs: { platform: 'android' },
  },
];

export default function App() {
  const [activePlatform, setActivePlatform] = useState<'web' | 'android'>('web');
  const [selectedPreset, setSelectedPreset] = useState<string>('github');
  const [rawInput, setRawInput] = useState<string>(PRESET_WEB_GITHUB);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'distiller' | 'bezier' | 'actions' | 'vault' | 'calculator' | 'mcp'>('distiller');
  const [dailyActions, setDailyActions] = useState<number>(1000);

  // Runtime action logs
  const [actionLog, setActionLog] = useState<Array<{ timestamp: string; action: string; status: string }>>([
    { timestamp: '10:04:12', action: 'System Init: GhostBridge semantic runtime loaded', status: 'ready' },
  ]);
  const [handoffActive, setHandoffActive] = useState<boolean>(false);
  const [typeInputValue, setTypeInputValue] = useState<string>('Build agent runtime');

  // Bezier trajectory visualizer state
  const [mouseStart, setMouseStart] = useState<Point>({ x: 40, y: 50 });
  const [mouseTarget, setMouseTarget] = useState<Point>({ x: 380, y: 220 });
  const [animatingCursor, setAnimatingCursor] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<Point>({ x: 40, y: 50 });
  const [trajectoryPoints, setTrajectoryPoints] = useState<TrajectoryPoint[]>([]);

  // Session Vault profiles
  const [vaultProfiles] = useState<SessionVaultRecord[]>(INITIAL_VAULT_PROFILES);
  const [selectedVaultDomain, setSelectedVaultDomain] = useState<string>('github.com');

  // MCP Simulator state
  const [selectedMcpTool, setSelectedMcpTool] = useState<string>('ghost_inspect');
  const [mcpArgsInput, setMcpArgsInput] = useState<string>(JSON.stringify({ platform: 'web' }, null, 2));
  const [mcpResponsePayload, setMcpResponsePayload] = useState<string>('');
  const [mcpRequestId, setMcpRequestId] = useState<number>(1);

  // Compute distilled state
  const distilledState: DistilledState = useMemo(() => {
    if (activePlatform === 'web') {
      return distillHtmlString(rawInput, 'https://github.com/ghostbridge/core', 'GitHub - ghostbridge/core');
    } else {
      return distillAndroidXml(rawInput, 'com.android.vending', 'MainActivity', 1080, 2400);
    }
  }, [activePlatform, rawInput]);

  // Generate Bezier trajectory points whenever start/target changes
  useEffect(() => {
    const pts = generateHumanTrajectory(mouseStart, mouseTarget, {
      deviationFactor: 0.28,
      jitterFactor: 1.4,
    });
    setTrajectoryPoints(pts);
    setCursorPos(mouseStart);
  }, [mouseStart, mouseTarget]);

  // Animate cursor along Bezier trajectory
  const runCursorAnimation = () => {
    if (animatingCursor || trajectoryPoints.length === 0) return;
    setAnimatingCursor(true);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < trajectoryPoints.length) {
        setCursorPos({ x: trajectoryPoints[idx].x, y: trajectoryPoints[idx].y });
        idx++;
      } else {
        clearInterval(interval);
        setAnimatingCursor(false);
      }
    }, 20);
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setSelectedElementId(null);
    if (preset === 'github') {
      setActivePlatform('web');
      setRawInput(PRESET_WEB_GITHUB);
    } else if (preset === 'login') {
      setActivePlatform('web');
      setRawInput(PRESET_WEB_LOGIN);
    } else if (preset === 'hn') {
      setActivePlatform('web');
      setRawInput(PRESET_WEB_HN);
    } else if (preset === 'playstore') {
      setActivePlatform('android');
      setRawInput(PRESET_ANDROID_PLAYSTORE);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(distilledState.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeAction = (action: GhostAction) => {
    const time = new Date().toLocaleTimeString();
    if (action.type === 'handoff') {
      setHandoffActive(true);
      setActionLog((prev) => [
        {
          timestamp: time,
          action: `⚠️ Human Handoff triggered: ${action.reason || 'Security checkpoint'}`,
          status: 'paused',
        },
        ...prev.slice(0, 8),
      ]);
      return;
    }

    let msg = `Executed [${action.type}]`;
    if (action.targetId) {
      const el = distilledState.elements.find((e) => e.id === action.targetId);
      msg += ` on element [${action.targetId}] <${el?.tag || 'unknown'}> "${el?.label || ''}"`;
      if (el?.bounds) {
        setMouseTarget({ x: Math.min(480, el.bounds.centerX), y: Math.min(280, el.bounds.centerY) });
      }
    }
    if (action.text) {
      msg += ` with text "${action.text}"`;
    }

    setActionLog((prev) => [
      { timestamp: time, action: msg, status: 'success' },
      ...prev.slice(0, 8),
    ]);
  };

  // MCP Simulator execution handler
  const handleRunMcpTool = () => {
    let parsedArgs: any = {};
    try {
      parsedArgs = JSON.parse(mcpArgsInput);
    } catch {
      setMcpResponsePayload(JSON.stringify({ error: 'Invalid JSON arguments' }, null, 2));
      return;
    }

    const nextId = mcpRequestId + 1;
    setMcpRequestId(nextId);

    let resultText = '';
    if (selectedMcpTool === 'ghost_inspect') {
      resultText = `${distilledState.markdown}\nToken reduction: ${distilledState.stats.tokenReductionPercentage}% savings (~${distilledState.stats.distilledEstimatedTokens} tokens vs ~${distilledState.stats.rawEstimatedTokens} raw)`;
    } else if (selectedMcpTool === 'ghost_click') {
      const targetId = parsedArgs.targetId || 1;
      const el = distilledState.elements.find((e) => e.id === targetId);
      resultText = `Clicked element [${targetId}] <${el?.tag || 'node'}> "${el?.label || ''}" at (${el?.bounds.centerX || 120}, ${el?.bounds.centerY || 80})\n\nUpdated State:\n${distilledState.markdown}`;
    } else if (selectedMcpTool === 'ghost_type') {
      resultText = `Typed "${parsedArgs.text || 'text'}" into element [${parsedArgs.targetId || 1}]\n\nUpdated State:\n${distilledState.markdown}`;
    } else if (selectedMcpTool === 'ghost_open') {
      resultText = `Navigated to ${parsedArgs.target || 'https://news.ycombinator.com'}\n\n${distilledState.markdown}`;
    } else if (selectedMcpTool === 'ghost_scroll') {
      resultText = `Scrolled ${parsedArgs.direction || 'down'}\n\nUpdated State:\n${distilledState.markdown}`;
    } else if (selectedMcpTool === 'ghost_handoff') {
      resultText = `Human handoff resolved. Session state captured into ~/.ghostbridge/vault/${selectedVaultDomain}.json\n\nResuming agent execution.`;
    } else if (selectedMcpTool === 'ghost_switch_target') {
      resultText = `Switched active GhostBridge target to: ${(parsedArgs.platform || 'web').toUpperCase()}`;
    }

    const response = {
      jsonrpc: '2.0',
      id: nextId,
      result: {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      },
    };

    setMcpResponsePayload(JSON.stringify(response, null, 2));
  };

  // Cost estimates
  const rawCostPerMonth = ((dailyActions * 30 * 25000) / 1000000) * 3.0;
  const ghostCostPerMonth = ((dailyActions * 30 * 350) / 1000000) * 3.0;
  const monthlySavings = Math.max(0, rawCostPerMonth - ghostCostPerMonth);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header - Responsive with flex-wrap and generous spacing */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Status Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl shrink-0">
              👻
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-white">GhostBridge</span>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                  v1.0.0 Production
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CLI & MCP Server Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Stealth Web & Real Physical Android Semantic Runtime for AI Agents
              </p>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="flex items-center gap-3 text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-mono hidden md:inline">Zero Cloud Cost</span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-emerald-400 font-mono font-semibold">
              {distilledState.stats.tokenReductionPercentage}% Token Savings
            </span>
          </div>
        </div>

        {/* Second Row: Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('distiller')}
            className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'distiller'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Semantic Distiller
          </button>
          <button
            onClick={() => setActiveTab('bezier')}
            className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'bezier'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Bezier Mouse
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MousePointer className="h-3.5 w-3.5" />
            Unified Actions
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'vault'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Session Vault
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'mcp'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            MCP Protocol & Simulator
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'calculator'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            Token Tax ROI
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* 1. Distiller Tab */}
        {activeTab === 'distiller' && (
          <div className="flex flex-col gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Target Platform:
                </span>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
                  <button
                    onClick={() => {
                      setActivePlatform('web');
                      setRawInput(PRESET_WEB_GITHUB);
                      setSelectedPreset('github');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                      activePlatform === 'web'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Web Browser (Playwright / Cloak)
                  </button>
                  <button
                    onClick={() => {
                      setActivePlatform('android');
                      setRawInput(PRESET_ANDROID_PLAYSTORE);
                      setSelectedPreset('playstore');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                      activePlatform === 'android'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Android ADB (Real Physical Phone)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Presets:</span>
                {activePlatform === 'web' ? (
                  <>
                    <button
                      onClick={() => handlePresetChange('github')}
                      className={`px-2.5 py-1 rounded border transition ${
                        selectedPreset === 'github'
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      GitHub Repo
                    </button>
                    <button
                      onClick={() => handlePresetChange('login')}
                      className={`px-2.5 py-1 rounded border transition ${
                        selectedPreset === 'login'
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Login & 2FA Form
                    </button>
                    <button
                      onClick={() => handlePresetChange('hn')}
                      className={`px-2.5 py-1 rounded border transition ${
                        selectedPreset === 'hn'
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Hacker News (88% Saved)
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handlePresetChange('playstore')}
                    className={`px-2.5 py-1 rounded border transition ${
                      selectedPreset === 'playstore'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Google Play Store Dump
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[560px]">
                <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-300">
                    <Code2 className="h-4 w-4 text-slate-400" />
                    <span>Raw Input {activePlatform === 'web' ? '(HTML)' : '(uiautomator XML)'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono">
                    <span>{distilledState.stats.rawByteCount} B</span>
                    <span>•</span>
                    <span className="text-amber-400">~{distilledState.stats.rawEstimatedTokens} tokens</span>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    className="w-full h-full bg-slate-950/60 p-4 font-mono text-xs text-slate-300 resize-none outline-none leading-relaxed overflow-auto focus:ring-1 focus:ring-indigo-500/40"
                    placeholder="Paste raw HTML or Android uiautomator XML dump here..."
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[560px]">
                <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span className="font-semibold text-white">Semantic Markdown Map</span>
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      {distilledState.elements.length} elements
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded text-xs font-mono font-bold">
                      <TrendingDown className="h-3 w-3" />
                      <span>{distilledState.stats.tokenReductionPercentage}% Saved</span>
                    </div>
                    <button
                      onClick={handleCopyMarkdown}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1.5 transition text-xs"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 font-mono text-xs overflow-auto bg-slate-950/80 leading-relaxed text-slate-200">
                  <div className="text-slate-500 mb-2 pb-2 border-b border-slate-800/80">
                    // Ready for agent context prompt • TargetId deterministic indexing
                  </div>
                  {distilledState.elements.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedElementId(item.id)}
                      className={`py-1 px-2 rounded cursor-pointer transition flex items-center justify-between group ${
                        selectedElementId === item.id
                          ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/40'
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-400">[{item.id}]</span>
                        <span className="text-slate-400">&lt;{item.tag}&gt;</span>
                        <span className="text-slate-100 font-semibold">"{item.label}"</span>
                        {item.placeholder && (
                          <span className="text-slate-500 text-[11px]">[placeholder: "{item.placeholder}"]</span>
                        )}
                        {item.value !== undefined && item.value !== '' && (
                          <span className="text-emerald-400 text-[11px]">[value: "{item.value}"]</span>
                        )}
                        {item.checked !== undefined && (
                          <span className="text-amber-400 text-[11px]">
                            {item.checked ? '[checked]' : '[unchecked]'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition text-[11px] text-slate-400">
                        {item.bounds && (
                          <span className="font-mono text-slate-500">
                            @({item.bounds.centerX},{item.bounds.centerY})
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 border-t border-slate-800 p-3 px-4 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span>
                      Raw: <strong className="text-slate-200">~{distilledState.stats.rawEstimatedTokens}</strong> tok
                    </span>
                    <span>→</span>
                    <span>
                      Distilled: <strong className="text-cyan-400">~{distilledState.stats.distilledEstimatedTokens}</strong> tok
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Calculated via 3.8 char/token LLM heuristic • {distilledState.stats.distillationDurationMs}ms
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Bezier Mouse Curve Tab */}
        {activeTab === 'bezier' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Compass className="h-5 w-5 text-cyan-400" />
                    Human-Like Cubic Bezier Mouse Trajectory
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bypasses Cloudflare & PerimeterX mouse-movement anomaly detectors with organic curvature and Gaussian jitter.
                  </p>
                </div>
                <button
                  onClick={runCursorAnimation}
                  disabled={animatingCursor}
                  className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  {animatingCursor ? 'Traveling...' : 'Play Trajectory Animation'}
                </button>
              </div>

              <div className="relative bg-slate-950 rounded-xl border border-slate-800 h-[340px] overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full absolute inset-0 pointer-events-none">
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {trajectoryPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      points={trajectoryPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  )}

                  {trajectoryPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={i === 0 || i === trajectoryPoints.length - 1 ? 5 : 2}
                      fill={i === 0 ? '#10b981' : i === trajectoryPoints.length - 1 ? '#f43f5e' : '#38bdf8'}
                    />
                  ))}
                </svg>

                <div
                  className="absolute pointer-events-none transition-transform duration-75 ease-linear"
                  style={{
                    left: `${cursorPos.x}px`,
                    top: `${cursorPos.y}px`,
                    transform: 'translate(-2px, -2px)',
                  }}
                >
                  <div className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                    <MousePointer className="h-5 w-5 fill-cyan-400" />
                  </div>
                  <div className="bg-slate-900/90 border border-cyan-500/40 text-[10px] text-cyan-300 font-mono px-1.5 py-0.5 rounded shadow mt-1">
                    ({cursorPos.x}, {cursorPos.y})
                  </div>
                </div>

                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const targetX = Math.round(e.clientX - rect.left);
                    const targetY = Math.round(e.clientY - rect.top);
                    setMouseStart({ x: cursorPos.x, y: cursorPos.y });
                    setMouseTarget({ x: targetX, y: targetY });
                  }}
                  className="absolute inset-0 cursor-crosshair"
                  title="Click anywhere to change target coordinate"
                />

                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center gap-3">
                  <span>Click anywhere in canvas to set new target coordinate</span>
                  <span>•</span>
                  <span>
                    Start: <strong className="text-emerald-400">({mouseStart.x}, {mouseStart.y})</strong>
                  </span>
                  <span>→</span>
                  <span>
                    Target: <strong className="text-rose-400">({mouseTarget.x}, {mouseTarget.y})</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Trajectory Telemetry
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Calculated Waypoints</span>
                  <span className="font-mono font-bold text-white">{trajectoryPoints.length} steps</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Total Flight Duration</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {trajectoryPoints[trajectoryPoints.length - 1]?.timeMs || 320} ms
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Velocity Curve</span>
                  <span className="font-mono font-semibold text-emerald-400">Ease-in-out Smoothstep</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Anti-Fingerprint Jitter</span>
                  <span className="font-mono font-semibold text-indigo-400">Gaussian ±1.4px</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
                <strong>Playwright Integration:</strong> GhostWebDriver executes these exact smooth coordinates before triggering mouse down/up events.
              </div>
            </div>
          </div>
        )}

        {/* 3. Unified Actions Tab */}
        {activeTab === 'actions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 flex flex-col gap-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-bold text-base text-white mb-2 flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-cyan-400" />
                  Deterministic Action Dispatcher
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  The exact same JSON commands drive both stealth Playwright instances and real physical Android phones via ADB.
                </p>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-300 w-24">Target ID:</span>
                    <input
                      type="number"
                      value={selectedElementId || 1}
                      onChange={(e) => setSelectedElementId(parseInt(e.target.value) || 1)}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono w-24"
                    />
                    <span className="text-xs text-slate-500">
                      (Element #{selectedElementId || 1})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-300 w-24">Type Text:</span>
                    <input
                      type="text"
                      value={typeInputValue}
                      onChange={(e) => setTypeInputValue(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white flex-1"
                      placeholder="Input value..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <button
                      onClick={() => executeAction({ type: 'click', targetId: selectedElementId || 1 })}
                      className="p-2 bg-slate-800 hover:bg-cyan-700 hover:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-700"
                    >
                      <MousePointer className="h-3.5 w-3.5 text-cyan-400" />
                      click(id)
                    </button>
                    <button
                      onClick={() =>
                        executeAction({
                          type: 'type',
                          targetId: selectedElementId || 1,
                          text: typeInputValue,
                        })
                      }
                      className="p-2 bg-slate-800 hover:bg-indigo-700 hover:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-700"
                    >
                      <Keyboard className="h-3.5 w-3.5 text-indigo-400" />
                      type(id, text)
                    </button>
                    <button
                      onClick={() => executeAction({ type: 'scroll', direction: 'down' })}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-700"
                    >
                      <Layers className="h-3.5 w-3.5 text-slate-300" />
                      scroll('down')
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        Human-Handoff Session Vault
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      When the agent encounters Cloudflare Turnstile, SMS OTP, or Fingerprint lock, it pauses and signals the developer:
                    </p>
                    <button
                      onClick={() =>
                        executeAction({
                          type: 'handoff',
                          reason: '2FA Verification / Cloudflare Checkpoint detected',
                        })
                      }
                      className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Trigger Handoff Prompt
                    </button>
                  </div>
                </div>
              </div>

              {handoffActive && (
                <div className="bg-amber-950/80 border border-amber-500/60 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-200">
                        HUMAN HANDOFF REQUIRED
                      </h4>
                      <p className="text-xs text-amber-300/80 mt-1">
                        Agent paused execution at <strong>acme.cloud/verify-2fa</strong>.
                        Please complete the security challenge in the attached browser/phone window.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setHandoffActive(false);
                            setActionLog((prev) => [
                              {
                                timestamp: new Date().toLocaleTimeString(),
                                action: 'Session Vault: Cookies & tokens captured. Agent resuming.',
                                status: 'success',
                              },
                              ...prev,
                            ]);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-xs transition"
                        >
                          I Have Completed Verification (Resume & Save Vault)
                        </button>
                        <button
                          onClick={() => setHandoffActive(false)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">GhostBridge Runtime Log</h3>
                </div>
                <button
                  onClick={() => setActionLog([])}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear log
                </button>
              </div>

              <div className="flex-1 overflow-auto font-mono text-xs p-3 space-y-2">
                {actionLog.map((log, index) => (
                  <div
                    key={index}
                    className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-start gap-2"
                  >
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 font-bold ${
                        log.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.status === 'paused'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                    <span className="text-slate-300 flex-1">{log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. Session Vault Tab */}
        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-bold text-sm text-white">Encrypted Local Vault</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-500">~/.ghostbridge/vault</span>
              </div>

              <div className="space-y-2">
                {vaultProfiles.map((p) => (
                  <div
                    key={p.domain}
                    onClick={() => setSelectedVaultDomain(p.domain)}
                    className={`p-3 rounded-lg cursor-pointer border transition ${
                      selectedVaultDomain === p.domain
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-100'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-xs mb-1">
                      <span>{p.domain}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                        {p.cookies.length} cookies
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{p.notes}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Updated: {new Date(p.updatedAt).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                <strong>Never Log In Twice:</strong> Once a human solves 2FA or CAPTCHA during handoff, GhostBridge captures all session tokens into the vault and auto-injects them on subsequent agent runs.
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <h3 className="font-bold text-sm text-white">
                  Profile Details: <span className="text-cyan-400">{selectedVaultDomain}</span>
                </h3>
                <span className="text-xs text-emerald-400 font-mono">StorageState JSON</span>
              </div>

              <div className="flex-1 overflow-auto bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-xs">
                {vaultProfiles.find((p) => p.domain === selectedVaultDomain)?.cookies.map((c, i) => (
                  <div key={i} className="py-2 border-b border-slate-800/80 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-400">{c.name}</span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {c.httpOnly && <span className="px-1 rounded bg-slate-800 text-slate-300">HttpOnly</span>}
                        {c.secure && <span className="px-1 rounded bg-emerald-950 text-emerald-300">Secure</span>}
                        {c.sameSite && <span className="px-1 rounded bg-slate-800 text-slate-300">{c.sameSite}</span>}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 break-all mt-0.5">{c.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Domain: {c.domain} • Path: {c.path}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. Live MCP Simulator & Protocol Tab */}
        {activeTab === 'mcp' && (
          <div className="flex flex-col gap-6">
            {/* Live Interactive MCP Tool Call Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-cyan-400" />
                    Live MCP Tool Call Simulator (JSON-RPC 2.0)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Test how frontier models (Claude Code, Cursor, OpenClaw) invoke GhostBridge tools via stdio.
                  </p>
                </div>
                <button
                  onClick={handleRunMcpTool}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  Execute MCP Call
                </button>
              </div>

              {/* Tool selector buttons */}
              <div className="flex flex-wrap gap-2">
                {MCP_TOOLS_LIST.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => {
                      setSelectedMcpTool(tool.name);
                      setMcpArgsInput(JSON.stringify(tool.defaultArgs, null, 2));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                      selectedMcpTool === tool.name
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {tool.name}
                  </button>
                ))}
              </div>

              {/* JSON-RPC Request & Response Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Request Box */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 flex flex-col h-[280px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="font-mono text-cyan-400 font-semibold">JSON-RPC Request Frame</span>
                    <span className="text-slate-500 text-[11px]">method: tools/call</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 mb-1 font-sans">
                    {MCP_TOOLS_LIST.find((t) => t.name === selectedMcpTool)?.description}
                  </div>
                  <div className="flex-1 mt-1 font-mono text-xs text-slate-300 overflow-auto">
                    <textarea
                      value={mcpArgsInput}
                      onChange={(e) => setMcpArgsInput(e.target.value)}
                      className="w-full h-full bg-transparent resize-none outline-none font-mono text-xs text-indigo-300"
                      spellCheck={false}
                    />
                  </div>
                </div>

                {/* Response Box */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 flex flex-col h-[280px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="font-mono text-emerald-400 font-semibold">JSON-RPC Response Frame</span>
                    <button
                      onClick={() => {
                        if (mcpResponsePayload) {
                          navigator.clipboard.writeText(mcpResponsePayload);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      Copy Response
                    </button>
                  </div>
                  <div className="flex-1 mt-2 font-mono text-xs text-slate-300 overflow-auto whitespace-pre-wrap leading-relaxed">
                    {mcpResponsePayload ? (
                      mcpResponsePayload
                    ) : (
                      <span className="text-slate-600">
                        // Click "Execute MCP Call" above to simulate JSON-RPC stdio response
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Config Snippets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  Claude Code / Claude Desktop Configuration
                </h3>
                <p className="text-xs text-slate-400">
                  Add GhostBridge to your <code>claude_desktop_config.json</code>:
                </p>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`{
  "mcpServers": {
    "ghostbridge": {
      "command": "npx",
      "args": ["-y", "ghostbridge", "serve-mcp"]
    }
  }
}`}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  Physical Android Phone Connection Guide
                </h3>
                <p className="text-xs text-slate-400">
                  Connect your real phone in 3 steps (Zero emulators, zero root):
                </p>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                    <span className="font-bold text-cyan-400">1.</span>
                    <span>Enable <strong>Developer Options</strong> and toggle on <strong>USB Debugging</strong>.</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                    <span className="font-bold text-cyan-400">2.</span>
                    <span>Connect phone via USB and tap <strong>"Always allow from this computer"</strong>.</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                    <span className="font-bold text-cyan-400">3.</span>
                    <span>Run <code>npx ghostbridge device inspect</code> to get the live numbered Markdown map.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. Token Tax ROI Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-6">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-emerald-400" />
                The Token Tax Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Comparing raw multi-megapixel screenshots & bloated DOMs vs. GhostBridge numbered semantic maps.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Agent Actions per Day: <strong className="text-cyan-400 font-mono text-sm">{dailyActions.toLocaleString()}</strong>
                </span>
                <span className="text-xs text-slate-500">
                  (~{Math.round(dailyActions * 30).toLocaleString()} actions/mo)
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={dailyActions}
                onChange={(e) => setDailyActions(parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-5 flex flex-col gap-2">
                <span className="text-xs uppercase font-bold text-red-400 tracking-wider">
                  Traditional Agent (Raw Screenshots / DOM)
                </span>
                <div className="text-3xl font-black text-white font-mono mt-1">
                  ${rawCostPerMonth.toFixed(2)}
                  <span className="text-xs text-slate-400 font-normal"> / month</span>
                </div>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div>• ~25,000 tokens per action</div>
                  <div>• High latency & frequent context window truncation</div>
                  <div>• Cloud browser cluster costs extra ($50-$200/mo)</div>
                </div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-5 flex flex-col gap-2">
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                  GhostBridge Semantic Runtime
                </span>
                <div className="text-3xl font-black text-emerald-300 font-mono mt-1">
                  ${ghostCostPerMonth.toFixed(2)}
                  <span className="text-xs text-slate-400 font-normal"> / month</span>
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-1">
                  <div>• ~350 tokens per action (98.6% reduction)</div>
                  <div>• Sub-10ms deterministic distillation</div>
                  <div>• $0 infrastructure: your local phone & browser</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-950/60 to-cyan-950/60 border border-cyan-500/40 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-cyan-300 tracking-wider">
                    Total Net Savings
                  </span>
                  <div className="text-3xl font-black text-white font-mono mt-1">
                    ${monthlySavings.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    Saved directly every month by eliminating token bloat and cloud emulator fees.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-cyan-400 font-semibold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  95%+ savings at any LLM scale
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3.5 px-6 text-xs text-slate-500 flex items-center justify-between">
        <div>
          GhostBridge Core • Phase 4 Production Ready • Open Source Apache-2.0
        </div>
        <div className="flex items-center gap-4">
          <span>Local-First</span>
          <span>Zero Cloud Cost</span>
          <span>MCP Compliant</span>
        </div>
      </footer>
    </div>
  );
}
