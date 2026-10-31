<p align="center">
  <h1 align="center">👻 GhostBridge</h1>
  <p align="center"><strong>Zero-Cost, Local-First Semantic Runtime & MCP Server bridging Stealth Web Browsers and Real Physical Android Devices for AI Agents.</strong></p>
  <p align="center">
    <a href="#benchmarks">📊 95%+ Token Reduction</a> •
    <a href="#architecture">⚡ Unified Action Runtime</a> •
    <a href="#quickstart">🚀 60-Second Setup</a> •
    <a href="#mcp-setup">🤖 Claude Code & Cursor Ready</a>
  </p>
</p>

---

## 💥 The Problem GhostBridge Solves

AI agents that browse the web or control mobile devices suffer from three fundamental bottlenecks:

1. **The Token Tax:** Sending raw HTML (50k–200k tokens) or multi-megapixel screenshots to frontier LLMs costs **$0.10–$0.50 per action** and induces severe context drift.
2. **Device Fragmentation:** Separate tools and fragmented APIs for Playwright vs. Appium vs. ADB.
3. **The Bot Wall:** Cloud emulators and headless browsers trigger Cloudflare, reCAPTCHA, and device fingerprinting bans within seconds.

---

## ⚡ The GhostBridge Solution

- **Semantic Distillation Engine:** Strips 95%+ of invisible CSS, SVG paths, script bundles, and layout noise. Replaces bloated DOMs and Android `uiautomator` XML hierarchies with an ultra-compact numbered Markdown tree:
  ```markdown
  ### Android Screen: com.android.vending (1080x2400)
  Screen: 1080x2400 | Interactive Elements: 7

  [1] <android:edittext> "Search apps & games" [id: "search_box_idle_text"] @(462,156)
  [2] <android:imageview> "Voice search" [id: "voice_search_button"] @(924,156)
  [3] <android:button> "Games" [id: "tab_games"] [checked] @(135,2316)
  [4] <android:button> "Apps" [id: "tab_apps"] [unchecked] @(405,2316)
  ```
- **Unified Deterministic Commands:** The agent issues identical commands regardless of whether it is commanding a stealth Chromium instance or a real Samsung/Pixel device over USB/Wi-Fi ADB:
  ```json
  { "type": "click", "targetId": 1 }
  { "type": "type", "targetId": 1, "text": "Linear App" }
  ```
- **Zero Cloud Cost & Local-First:** No browser cloud bills, no emulators, no monthly SaaS subscriptions. Runs locally via Node.js, Playwright, and your own physical phone.
- **Human-Handoff Session Vault:** Stalls execution cleanly when CAPTCHA/2FA is encountered, rings a terminal alert, prompts human intervention, and caches authenticated session cookies locally.

---

## 📊 Token Reduction Benchmarks

| Target Screen / Page | Raw Tokens (HTML / XML) | GhostBridge Distilled | Token Savings | Cost per 100 Actions |
|:---------------------|:------------------------|:----------------------|:--------------|:---------------------|
| **GitHub Dashboard** | ~38,400 tokens          | **340 tokens**        | **99.1%**     | ~$0.02 (vs $2.88)    |
| **Google Play Store**| ~12,200 tokens          | **410 tokens**        | **96.6%**     | ~$0.03 (vs $0.91)    |
| **Amazon Product**   | ~74,000 tokens          | **680 tokens**        | **99.1%**     | ~$0.04 (vs $5.55)    |
| **WhatsApp Chat**    | ~8,900 tokens           | **290 tokens**        | **96.7%**     | ~$0.02 (vs $0.66)    |

---

## 🚀 Quickstart

### 1. Run with npx (Zero Install)
```bash
npx ghostbridge inspect --url https://github.com
```

### 2. Connect a Physical Android Phone
Enable **Developer Options** and **USB Debugging** on your phone, connect via USB:
```bash
# Verify device is detected
npx ghostbridge device list

# Inspect current phone screen into numbered semantic map
npx ghostbridge device inspect
```

---

## 🤖 Model Context Protocol (MCP) Setup

GhostBridge implements the official `@modelcontextprotocol/sdk` stdio interface.

### Claude Code / Claude Desktop Configuration
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

### Cursor AI / Windsurf Configuration
Under **Cursor Settings -> Features -> MCP**, add a new server:
- **Name:** GhostBridge
- **Type:** command
- **Command:** `npx -y ghostbridge serve-mcp`

---

## 🛠️ Unified Protocol Specification

All actions operate on numeric `targetId` identifiers extracted by the distillers:

```typescript
type GhostAction = 
  | { type: 'open'; urlOrPackage: string; platform?: 'web' | 'android' }
  | { type: 'inspect' }
  | { type: 'click'; targetId: number }
  | { type: 'type'; targetId: number; text: string; clearBefore?: boolean }
  | { type: 'scroll'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'press'; key: 'Enter' | 'Backspace' | 'Escape' }
  | { type: 'handoff'; reason: string }
  | { type: 'back' };
```

---

## 📄 License
Apache-2.0. Built for the open AI agent ecosystem.
