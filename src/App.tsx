import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { distillHtmlString } from './distillers/domDistiller.ts';
import { distillAndroidXml } from './distillers/androidDistiller.ts';
import { DistilledState, GhostAction } from './types/protocol.ts';

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

export default function App() {
  const [activePlatform, setActivePlatform] = useState<'web' | 'android'>('web');
  const [selectedPreset, setSelectedPreset] = useState<string>('github');
  const [rawInput, setRawInput] = useState<string>(PRESET_WEB_GITHUB);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [actionLog, setActionLog] = useState<Array<{ timestamp: string; action: string; status: string }>>([
    { timestamp: '10:04:12', action: 'System Init: GhostBridge semantic runtime loaded', status: 'ready' },
  ]);
  const [handoffActive, setHandoffActive] = useState<boolean>(false);
  const [typeInputValue, setTypeInputValue] = useState<string>('Build agent runtime');
  const [activeTab, setActiveTab] = useState<'distiller' | 'actions' | 'mcp' | 'calculator'>('distiller');
  const [dailyActions, setDailyActions] = useState<number>(1000);

  // Compute distilled state
  const distilledState: DistilledState = useMemo(() => {
    if (activePlatform === 'web') {
      return distillHtmlString(rawInput, 'https://github.com/ghostbridge/core', 'GitHub - ghostbridge/core');
    } else {
      return distillAndroidXml(rawInput, 'com.android.vending', 'MainActivity', 1080, 2400);
    }
  }, [activePlatform, rawInput]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setSelectedElementId(null);
    if (preset === 'github') {
      setActivePlatform('web');
      setRawInput(PRESET_WEB_GITHUB);
    } else if (preset === 'login') {
      setActivePlatform('web');
      setRawInput(PRESET_WEB_LOGIN);
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
    }
    if (action.text) {
      msg += ` with text "${action.text}"`;
    }

    setActionLog((prev) => [
      { timestamp: time, action: msg, status: 'success' },
      ...prev.slice(0, 8),
    ]);
  };

  // Cost estimates
  const rawCostPerMonth = ((dailyActions * 30 * 25000) / 1000000) * 3.0; // ~$3/1M tokens
  const ghostCostPerMonth = ((dailyActions * 30 * 350) / 1000000) * 3.0;
  const monthlySavings = Math.max(0, rawCostPerMonth - ghostCostPerMonth);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
            👻
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-white">GhostBridge</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                v1.0.0 Phase 1
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Local Runtime Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Stealth Web + Physical Android Semantic Distillation & MCP Protocol
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab('distiller')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'distiller'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Semantic Distiller
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MousePointer className="h-3.5 w-3.5" />
            Unified Actions
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'calculator'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            Token Tax ROI
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'mcp'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            MCP & CLI Setup
          </button>
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono">Zero Cloud Cost</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-mono font-semibold">
            {distilledState.stats.tokenReductionPercentage}% Token Savings
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Distiller Tab */}
        {activeTab === 'distiller' && (
          <div className="flex flex-col gap-5">
            {/* Control Bar */}
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
                    Web Browser (Playwright)
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
                    Android ADB (Physical Phone)
                  </button>
                </div>
              </div>

              {/* Presets */}
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

            {/* Split Screen Columns: Raw Source vs Distilled Numbered Markdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Raw Source (HTML or XML) */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[580px]">
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
                <div className="bg-slate-950/90 px-4 py-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Editable: paste any real website or ADB dump</span>
                  <button
                    onClick={() => setRawInput('')}
                    className="hover:text-slate-300 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Right Column: GhostBridge Distilled Markdown & Token Savings */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[580px]">
                {/* Header Stats */}
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

                {/* Numbered Markdown View */}
                <div className="flex-1 p-4 font-mono text-xs overflow-auto bg-slate-950/80 leading-relaxed text-slate-200">
                  <div className="text-slate-500 mb-2 pb-2 border-b border-slate-800/80">
                    // Ready for agent context prompt • Deterministic targetId indexing
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

                {/* Metric Summary Footbar */}
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

            {/* Selected Element Quick Action Panel */}
            {selectedElementId !== null && (
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-cyan-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-400 text-sm">
                    #{selectedElementId}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Selected Element: {distilledState.elements.find((e) => e.id === selectedElementId)?.label}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Selector: {distilledState.elements.find((e) => e.id === selectedElementId)?.selector || 'center-tap'}
                      {' • '}
                      Tap Coords:{' '}
                      ({distilledState.elements.find((e) => e.id === selectedElementId)?.bounds.centerX},
                      {distilledState.elements.find((e) => e.id === selectedElementId)?.bounds.centerY})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => executeAction({ type: 'click', targetId: selectedElementId })}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
                  >
                    <MousePointer className="h-3.5 w-3.5" />
                    Simulate click({selectedElementId})
                  </button>
                  <button
                    onClick={() =>
                      executeAction({
                        type: 'type',
                        targetId: selectedElementId,
                        text: typeInputValue,
                      })
                    }
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
                  >
                    <Keyboard className="h-3.5 w-3.5" />
                    Simulate type({selectedElementId})
                  </button>
                  <button
                    onClick={() => setSelectedElementId(null)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unified Actions & Handoff Simulator Tab */}
        {activeTab === 'actions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Action Commander */}
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

                  {/* Human Handoff trigger */}
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

              {/* Handoff Modal Alert if Active */}
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

            {/* Action Log & Protocol Telemetry */}
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

        {/* Token Tax ROI Calculator Tab */}
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

        {/* MCP & CLI Setup Tab */}
        {activeTab === 'mcp' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                Claude Code / Claude Desktop Setup
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
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify({
                    mcpServers: {
                      ghostbridge: {
                        command: "npx",
                        args: ["-y", "ghostbridge", "serve-mcp"]
                      }
                    }
                  }, null, 2));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="self-start px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                Copy Config
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                Physical Android Phone Connection Guide
              </h3>
              <p className="text-xs text-slate-400">
                Connect your real phone in 3 easy steps (Zero emulators, zero root):
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className="font-bold text-cyan-400">1.</span>
                  <span>Enable <strong>Developer Options</strong> (tap Build Number 7 times) and toggle on <strong>USB Debugging</strong>.</span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className="font-bold text-cyan-400">2.</span>
                  <span>Connect phone via USB cable and tap <strong>"Always allow from this computer"</strong>.</span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className="font-bold text-cyan-400">3.</span>
                  <span>Run <code>npx ghostbridge device inspect</code> to get the live numbered Markdown map.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3.5 px-6 text-xs text-slate-500 flex items-center justify-between">
        <div>
          GhostBridge Core • Phase 1 Protocol & Distillers Generated • Open Source Apache-2.0
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
