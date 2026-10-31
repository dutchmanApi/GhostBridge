# 👻 GhostBridge

> **The Zero-Cost, Local-First Semantic Runtime & MCP Server bridging Stealth Web Browsers and Real Physical Android Devices for AI Agents.**
> *Eliminates 95%+ of LLM token tax. Bypasses bot detection without cloud browser fees. Controls real hardware phones via ADB.*

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![MCP Compliant](https://img.shields.io/badge/protocol-Model_Context_Protocol-purple.svg)](https://modelcontextprotocol.io)
[![Token Savings](https://img.shields.io/badge/token_reduction-95%25%2B-emerald.svg)](#benchmarks)
[![Zero Cloud Cost](https://img.shields.io/badge/cloud_cost-$0.00-green.svg)](#architecture)

---

## ⚡ Why GhostBridge?

AI agents (Claude Code, Cursor, OpenClaw, Devins) that browse the web or control mobile devices suffer from three fatal flaws:

1. **The Token Tax:** Sending raw HTML (50k–200k tokens) or multi-megapixel screenshots to frontier LLMs costs **$0.15–$0.50 per action**, blows context windows, and slows agents to a crawl.
2. **The Bot Wall:** Headless cloud browsers and emulators trigger Cloudflare Turnstile, reCAPTCHA, and device fingerprinting blocks almost instantly.
3. **Fragmented Runtimes:** Web automation uses Playwright while mobile automation requires heavyweight Appium emulators.

**GhostBridge unifies both worlds into a single, deterministic, token-saving runtime.**

```text
┌─────────────────────────────────────────────────────────────────┐
│           AI Agent (Claude Code / Cursor / OpenClaw)             │
└────────────────────────────────┬────────────────────────────────┘
                                 │ JSON-RPC (MCP Stdio)
┌────────────────────────────────▼────────────────────────────────┐
│                     👻 GHOSTBRIDGE RUNTIME                      │
│                                                                 │
│  • 95%+ Semantic Distiller (Numbered Markdown Map [id])         │
│  • Human Bezier Mouse Curves (Anti-bot trajectory evasion)      │
│  • Session Vault & Human Handoff (Never log in twice)           │
└────────────────┬───────────────────────────────┬────────────────┘
                 │ Stealth CDP Wire              │ ADB Fast Stream
┌────────────────▼───────────────┐ ┌─────────────▼────────────────┐
│    Stealth Web Browser         │ │   Real Physical Android      │
│ (CloakBrowser, Brave, Chrome)  │ │ (Pixel, Samsung via USB/Wi-Fi)│
└────────────────────────────────┘ └──────────────────────────────┘
```

---

## 📊 Token Tax Benchmarks

Instead of feeding 200,000 characters of raw HTML noise or screenshots into your agent, GhostBridge distills the live viewport into a clean, numbered Markdown tree:

```markdown
### Web Viewport: GitHub Dashboard (https://github.com/dashboard)
Screen: 1280x800 | Interactive Elements: 7

[1] <input:text> "Type / to search" [placeholder: "Type / to search"]
[2] <button> "Search repositories"
[3] <a> "Pull requests"
[4] <a> "Issues"
[5] <button> "Star"
[6] <button> "Fork (210)"
[7] <button> "Sign out"
```

| Target Viewport / Application | Raw Tokens (DOM / Vision) | GhostBridge Distilled | Token Reduction | Cost / 1,000 Actions |
|:------------------------------|:--------------------------|:----------------------|:----------------|:---------------------|
| **GitHub Dashboard**          | ~38,400 tokens            | **340 tokens**        | **99.1%**       | **$1.02** (vs $115.20) |
| **Amazon Product Search**     | ~74,000 tokens            | **680 tokens**        | **99.1%**       | **$2.04** (vs $222.00) |
| **Google Play Store App**     | ~14,200 tokens            | **410 tokens**        | **97.1%**       | **$1.23** (vs $42.60)  |
| **Hacker News Frontpage**     | ~12,600 tokens            | **290 tokens**        | **97.7%**       | **$0.87** (vs $37.80)  |
| **WhatsApp Chat View**        | ~9,800 tokens             | **280 tokens**        | **97.1%**       | **$0.84** (vs $29.40)  |

---

## 🚀 60-Second Quickstart

### 1. Zero-Install Web Inspection
Distill any live website into an ultra-compact numbered Markdown map with token savings metrics:
```bash
npx ghostbridge inspect https://news.ycombinator.com
```

### 2. Connect a Real Physical Android Device
Zero emulators. Plug in your everyday Android phone via USB:
1. Enable **Developer Options** (Settings -> About -> tap *Build Number* 7 times).
2. Toggle on **USB Debugging**.
3. Inspect the live phone screen:
```bash
# Verify device detected
npx ghostbridge device list

# Distill active phone screen into numbered Markdown map with tap coordinates
npx ghostbridge device inspect
```

---

## 🤖 Model Context Protocol (MCP) Integration

GhostBridge implements the official `@modelcontextprotocol/sdk` stdio server. It exposes 7 deterministic tools:

- `ghost_open(target, platform?)`: Navigates to a URL or launches an Android package.
- `ghost_inspect(platform?)`: Distills active screen into compact numbered Markdown.
- `ghost_click(targetId)`: Clicks an element using organic Bezier curves (Web) or precision center tap (Android).
- `ghost_type(targetId, text, clearBefore?, submit?)`: Types text with realistic human typing cadence.
- `ghost_scroll(direction)`: Natural scroll with swipe gesture jitter.
- `ghost_handoff(reason)`: Pauses agent and rings terminal chime for human 2FA/CAPTCHA completion.
- `ghost_switch_target(platform)`: Toggles active target between `web` and `android`.

### Claude Code Setup
Launch Claude Code with GhostBridge MCP enabled:
```bash
claude mcp add ghostbridge npx -y ghostbridge serve-mcp
```

### Claude Desktop Configuration
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "ghostbridge": {
      "command": "npx",
      "args": ["-y", "ghostbridge", "serve-mcp"]
    }
  }
}
```

### Cursor AI / Windsurf Setup
Under **Cursor Settings -> Features -> MCP**, add a new server:
- **Name:** `GhostBridge`
- **Type:** `command`
- **Command:** `npx -y ghostbridge serve-mcp`

---

## 🛡️ Anti-Bot Evasion & Custom Browser Binaries

GhostBridge includes built-in anti-fingerprinting patches:
- Removes `navigator.webdriver` flags.
- Simulates natural **cubic Bezier mouse trajectories** with variable velocity easing and micro-jitters before clicking.
- Compatible with custom stealth browser binaries (CloakBrowser, Camoufox, Brave, Ungoogled Chromium):

```bash
export GHOSTBRIDGE_BROWSER_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
npx ghostbridge inspect https://cloudflare.com
```

---

## 🔐 Session Vault & Human Handoff (Never Log In Twice)

When an agent hits an SMS OTP, hardware security key, or Cloudflare challenge:
1. GhostBridge calls `waitForHumanHandoff(reason)`.
2. Emits an audible terminal chime (`\x07`) and pauses the agent without crashing.
3. Once the operator presses `[ENTER]`, GhostBridge captures all session cookies into `~/.ghostbridge/vault/<domain>.json`.
4. Subsequent agent sessions automatically reload authentication from the local vault.

```bash
# View stored profiles
npx ghostbridge vault list

# Clear vault
npx ghostbridge vault clear
```

---

## 📦 Monorepo Architecture

```text
src/
├── index.ts               # Commander.js CLI (inspect, device, serve-mcp, vault)
├── types/
│   └── protocol.ts        # Unified DistilledState, GhostAction, Zod schemas
├── distillers/
│   ├── domDistiller.ts    # In-page DOM traversal, token calculator (95%+ reduction)
│   └── androidDistiller.ts# Fast uiautomator XML dump parser & tap coordinate mapper
├── drivers/
│   ├── webDriver.ts       # Playwright stealth controller + Bezier mouse integration
│   └── androidDriver.ts   # Zero-dependency Node child_process ADB controller
├── vault/
│   └── sessionVault.ts    # Encrypted local JSON storage & human handoff manager
├── utils/
│   └── bezier.ts          # Organic cubic Bezier trajectory & jitter math
└── mcp/
    └── server.ts          # Official @modelcontextprotocol/sdk stdio server
```

---

## 📄 License
Apache-2.0. Built for the open AI agent ecosystem.
