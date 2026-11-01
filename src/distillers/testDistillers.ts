/**
 * Verification test for GhostBridge DOM & Android Distillers
 */

import { distillHtmlString } from './domDistiller.ts';
import { distillAndroidXml } from './androidDistiller.ts';

// Sample noisy Web HTML with heavy wrappers, svgs, styles, scripts, hidden elements
const SAMPLE_WEB_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    .hidden { display: none; }
    .btn { padding: 10px; background: blue; color: white; }
    .noise { margin: 20px; font-size: 14px; }
  </style>
  <script>
    console.log("Analytics script tracking 12345");
    window.addEventListener("load", () => { /* tracking code */ });
  </script>
</head>
<body>
  <header class="header-nav-container-wrapper-outer">
    <div class="inner-wrap">
      <h1>GitHub Dashboard</h1>
      <nav class="nav-links">
        <a href="/pulls">Pull requests</a>
        <a href="/issues">Issues</a>
        <a href="/marketplace">Marketplace</a>
        <a href="/explore">Explore</a>
      </nav>
    </div>
  </header>
  
  <main class="main-content-layout-grid-column">
    <div class="search-bar-row">
      <input type="text" id="top-search-input" placeholder="Type / to search" value="" />
      <button class="btn" id="search-submit-btn" aria-label="Search repositories">Search</button>
    </div>

    <section class="card-feed">
      <h2>Recent Repositories</h2>
      <div class="repo-item">
        <a href="/owner/ghostbridge" class="repo-title">owner/ghostbridge</a>
        <button class="btn star-btn" aria-label="Star this repository">Star</button>
        <button class="btn fork-btn">Fork (142)</button>
      </div>

      <div class="auth-section">
        <input type="checkbox" id="persist-session-cb" checked />
        <label for="persist-session-cb">Stay signed in for 30 days</label>
        <button class="btn logout-btn" onclick="alert('logout')">Sign out</button>
      </div>
    </section>
  </main>
</body>
</html>
`;

// Sample Android uiautomator XML dump
const SAMPLE_ANDROID_XML = `
<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.android.vending" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,0][1080,2400]">
    <node index="0" text="" resource-id="com.android.vending:id/toolbar" class="android.view.ViewGroup" package="com.android.vending" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,72][1080,240]">
      <node index="0" text="Search apps &amp; games" resource-id="com.android.vending:id/search_box_idle_text" class="android.widget.EditText" package="com.android.vending" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="true" password="false" selected="false" bounds="[48,96][876,216]" />
      <node index="1" text="" resource-id="com.android.vending:id/voice_search_button" class="android.widget.ImageView" package="com.android.vending" content-desc="Voice search" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[876,96][972,216]" />
      <node index="2" text="" resource-id="com.android.vending:id/profile_avatar_button" class="android.widget.ImageView" package="com.android.vending" content-desc="Google Account: John Doe" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[972,96][1056,216]" />
    </node>
    <node index="1" text="" resource-id="com.android.vending:id/navigation_bar" class="android.view.ViewGroup" package="com.android.vending" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,2232][1080,2400]">
      <node index="0" text="Games" resource-id="com.android.vending:id/tab_games" class="android.widget.Button" package="com.android.vending" content-desc="Games tab" checkable="true" checked="true" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="true" bounds="[0,2232][270,2400]" />
      <node index="1" text="Apps" resource-id="com.android.vending:id/tab_apps" class="android.widget.Button" package="com.android.vending" content-desc="Apps tab" checkable="true" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[270,2232][540,2400]" />
      <node index="2" text="Offers" resource-id="com.android.vending:id/tab_offers" class="android.widget.Button" package="com.android.vending" content-desc="Offers tab" checkable="true" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[540,2232][810,2400]" />
      <node index="3" text="Books" resource-id="com.android.vending:id/tab_books" class="android.widget.Button" package="com.android.vending" content-desc="Books tab" checkable="true" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[810,2232][1080,2400]" />
    </node>
  </node>
</hierarchy>
`;

export function runDistillerTests() {
  console.log('=== GHOSTBRIDGE DISTILLER BENCHMARKS ===\n');

  // Test Web Distiller
  const webState = distillHtmlString(
    SAMPLE_WEB_HTML,
    'https://github.com/dashboard',
    'GitHub Dashboard'
  );
  console.log('--- WEB DISTILLATION RESULTS ---');
  console.log(`Raw HTML Tokens: ~${webState.stats.rawEstimatedTokens} (${webState.stats.rawByteCount} bytes)`);
  console.log(`Distilled Tokens: ~${webState.stats.distilledEstimatedTokens} (${webState.stats.distilledByteCount} bytes)`);
  console.log(`Token Reduction: ${webState.stats.tokenReductionPercentage}% savings!`);
  console.log(`Interactive Elements Found: ${webState.elements.length}`);
  console.log('\nDistilled Markdown Output:\n' + webState.markdown);

  // Test Android Distiller
  const androidState = distillAndroidXml(
    SAMPLE_ANDROID_XML,
    'com.android.vending',
    'MainActivity',
    1080,
    2400
  );
  console.log('\n--- ANDROID DISTILLATION RESULTS ---');
  console.log(`Raw XML Tokens: ~${androidState.stats.rawEstimatedTokens} (${androidState.stats.rawByteCount} bytes)`);
  console.log(`Distilled Tokens: ~${androidState.stats.distilledEstimatedTokens} (${androidState.stats.distilledByteCount} bytes)`);
  console.log(`Token Reduction: ${androidState.stats.tokenReductionPercentage}% savings!`);
  console.log(`Interactive Elements Found: ${androidState.elements.length}`);
  console.log('\nDistilled Markdown Output with Tap Coordinates:\n' + androidState.markdown);

  // Test Hacker News sample verifying Rules A, B, and C
  const SAMPLE_HN_HTML = `
  <table class="itemlist">
    <tr>
      <td><a id="up_38100" href="vote?id=38100&how=up"><div class="votearrow" title="upvote"></div></a></td>
      <td class="title"><a href="https://talosintelligence.com/post">New Vulnerability in Linux Kernel</a></td>
      <td class="sitebit"><a href="from?site=talosintelligence.com"><span class="sitestr">talosintelligence.com</span></a></td>
    </tr>
    <tr>
      <td><a id="top"></a></td>
      <td><input type="text" name="q" size="17" autocorrect="off" spellcheck="false" autocapitalize="off" autocomplete="false"></td>
    </tr>
  </table>
  `;

  const hnState = distillHtmlString(SAMPLE_HN_HTML, 'https://news.ycombinator.com', 'Hacker News');
  console.log('\n--- HACKER NEWS RULES A, B, C TEST ---');
  console.log(`Elements Found: ${hnState.elements.length}`);
  console.log('Distilled Markdown:\n' + hnState.markdown);

  return { webState, androidState, hnState };
}

// Auto-run if executed directly via node / tsx
if (process.argv[1]?.includes('testDistillers')) {
  runDistillerTests();
}
