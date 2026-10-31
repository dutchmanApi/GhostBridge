/**
 * GhostBridge Stealth Web Driver
 * Powered by Playwright with anti-detection flags, custom CloakBrowser/Camoufox support,
 * human-like Bezier mouse curves, automatic session vault persistence, and semantic DOM distillation.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import {
  DistilledState,
  GhostAction,
  GhostActionResult,
} from '../types/protocol.ts';
import { DOM_DISTILLATION_SCRIPT } from '../distillers/domDistiller.ts';
import { SessionVault } from '../vault/sessionVault.ts';
import { generateHumanTrajectory, Point } from '../utils/bezier.ts';

export interface WebDriverOptions {
  headless?: boolean;
  executablePath?: string; // Custom browser binary (e.g., CloakBrowser, Camoufox, Brave)
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: { server: string; username?: string; password?: string };
  vaultDir?: string;
}

export class GhostWebDriver {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private currentMousePos: Point = { x: 100, y: 100 };
  private vault: SessionVault;
  private options: WebDriverOptions;

  constructor(options: WebDriverOptions = {}) {
    this.options = {
      headless: options.headless ?? true,
      executablePath: options.executablePath || process.env.GHOSTBRIDGE_BROWSER_PATH,
      viewport: options.viewport || { width: 1280, height: 800 },
      userAgent:
        options.userAgent ||
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      proxy: options.proxy,
      vaultDir: options.vaultDir,
    };
    this.vault = new SessionVault(this.options.vaultDir);
  }

  /**
   * Initializes stealth browser context with anti-fingerprinting patches.
   */
  public async init(targetUrl?: string): Promise<Page> {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    const launchArgs = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
    ];

    // Load session state from vault if available
    let storageStateToLoad: string | undefined = undefined;
    if (targetUrl) {
      const domain = this.vault.sanitizeDomain(targetUrl);
      const saved = this.vault.loadStorageState(domain);
      if (saved && (saved.cookies?.length > 0 || (saved.origins && saved.origins.length > 0))) {
        storageStateToLoad = JSON.stringify({
          cookies: saved.cookies,
          origins: saved.origins || [],
        });
      }
    }

    this.browser = await chromium.launch({
      headless: this.options.headless,
      executablePath: this.options.executablePath,
      args: launchArgs,
    });

    const contextOptions: any = {
      viewport: this.options.viewport,
      userAgent: this.options.userAgent,
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      locale: 'en-US',
      timezoneId: 'America/New_York',
    };

    if (storageStateToLoad) {
      try {
        contextOptions.storageState = JSON.parse(storageStateToLoad);
      } catch {
        // Continue with fresh session if corrupt
      }
    }

    this.context = await this.browser.newContext(contextOptions);

    // Apply anti-detection script before any page navigation
    await this.context.addInitScript(() => {
      // Mask webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mask Chrome runtime
      (window as any).chrome = {
        app: { isInstalled: false },
        runtime: {},
        csi: () => {},
        loadTimes: () => {},
      };

      // Mask plugins length
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mask languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    this.page = await this.context.newPage();
    return this.page;
  }

  /**
   * Distills current page into the unified semantic Markdown map.
   */
  public async distill(): Promise<DistilledState> {
    if (!this.page) {
      throw new Error('Browser is not initialized. Call open() first.');
    }

    // Inject and execute DOM distillation script inside page
    const state = await this.page.evaluate((scriptStr: string) => {
      return eval(scriptStr);
    }, DOM_DISTILLATION_SCRIPT);

    return state as DistilledState;
  }

  /**
   * Moves mouse to target with natural cubic Bezier interpolation and micro-jitters.
   */
  public async moveMouseNaturally(target: Point): Promise<void> {
    if (!this.page) return;

    const trajectory = generateHumanTrajectory(this.currentMousePos, target, {
      deviationFactor: 0.2,
      jitterFactor: 1.2,
    });

    for (const pt of trajectory) {
      await this.page.mouse.move(pt.x, pt.y);
      // Small randomized interval between movement steps
      await new Promise((r) => setTimeout(r, 6 + Math.random() * 8));
    }

    this.currentMousePos = target;
  }

  /**
   * Executes a unified GhostAction on the browser.
   */
  public async executeAction(action: GhostAction): Promise<GhostActionResult> {
    const startTime = Date.now();

    try {
      switch (action.type) {
        case 'open': {
          const url = action.urlOrPackage || 'about:blank';
          const page = await this.init(url);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          // Settle briefly for dynamic renders
          await page.waitForTimeout(500);

          const state = await this.distill();
          return {
            success: true,
            action: 'open',
            message: `Navigated to ${url}`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'inspect': {
          if (!this.page) await this.init();
          const state = await this.distill();
          return {
            success: true,
            action: 'inspect',
            message: 'Page distilled successfully',
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'click': {
          if (!this.page) throw new Error('Browser page not available');
          const targetId = action.targetId;
          if (!targetId) throw new Error('Click requires targetId');

          // Find element tagged with data-ghost-id
          const selector = `[data-ghost-id="${targetId}"]`;
          const handle = await this.page.$(selector);

          if (!handle) {
            throw new Error(`Element with id [${targetId}] not found in DOM`);
          }

          const box = await handle.boundingBox();
          if (!box) {
            throw new Error(`Element [${targetId}] is not visible on screen`);
          }

          // Compute target point with subtle random offset inside element
          const targetPoint: Point = {
            x: Math.round(box.x + box.width * (0.35 + Math.random() * 0.3)),
            y: Math.round(box.y + box.height * (0.35 + Math.random() * 0.3)),
          };

          // Smooth Bezier mouse movement
          await this.moveMouseNaturally(targetPoint);

          // Human-like down/up press delay
          await this.page.mouse.down();
          await new Promise((r) => setTimeout(r, 45 + Math.random() * 60));
          await this.page.mouse.up();

          // Wait for any potential navigation or DOM changes
          await this.page.waitForTimeout(400);

          const state = await this.distill();
          return {
            success: true,
            action: 'click',
            message: `Clicked element [${targetId}] at (${targetPoint.x}, ${targetPoint.y})`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'type': {
          if (!this.page) throw new Error('Browser page not available');
          const targetId = action.targetId;
          const text = action.text ?? '';
          if (!targetId) throw new Error('Type requires targetId');

          const selector = `[data-ghost-id="${targetId}"]`;
          const handle = await this.page.$(selector);
          if (!handle) throw new Error(`Element [${targetId}] not found`);

          const box = await handle.boundingBox();
          if (box) {
            await this.moveMouseNaturally({
              x: box.x + box.width / 2,
              y: box.y + box.height / 2,
            });
            await handle.click();
          }

          if (action.clearBefore) {
            await handle.fill('');
          }

          // Type with randomized human cadence
          for (const char of text) {
            await this.page.keyboard.type(char, {
              delay: 30 + Math.random() * 50,
            });
          }

          if (action.key === 'Enter') {
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(500);
          }

          const state = await this.distill();
          return {
            success: true,
            action: 'type',
            message: `Typed "${text}" into element [${targetId}]`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'scroll': {
          if (!this.page) throw new Error('Browser page not available');
          const dir = action.direction || 'down';
          const deltaY = dir === 'down' ? 450 : dir === 'up' ? -450 : 0;
          const deltaX = dir === 'right' ? 300 : dir === 'left' ? -300 : 0;

          await this.page.mouse.wheel(deltaX, deltaY);
          await this.page.waitForTimeout(300);

          const state = await this.distill();
          return {
            success: true,
            action: 'scroll',
            message: `Scrolled ${dir}`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'press': {
          if (!this.page) throw new Error('Browser page not available');
          const key = action.key || 'Enter';
          await this.page.keyboard.press(key);
          await this.page.waitForTimeout(350);

          const state = await this.distill();
          return {
            success: true,
            action: 'press',
            message: `Pressed key "${key}"`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'handoff': {
          const reason = action.reason || 'Human intervention requested';
          const resolved = await this.vault.waitForHumanHandoff(reason);

          // If resolved, capture refreshed storage state into vault
          if (resolved && this.context && this.page) {
            const url = this.page.url();
            const state = await this.context.storageState();
            this.vault.saveStorageState(url, state, `Auto-saved after handoff: ${reason}`);
          }

          const distilled = await this.distill();
          return {
            success: resolved,
            action: 'handoff',
            message: resolved ? 'Human handoff completed & session persisted' : 'Human handoff cancelled or timed out',
            state: distilled,
            durationMs: Date.now() - startTime,
            requiresHandoff: !resolved,
          };
        }

        case 'back': {
          if (!this.page) throw new Error('Browser page not available');
          await this.page.goBack();
          await this.page.waitForTimeout(400);
          const state = await this.distill();
          return {
            success: true,
            action: 'back',
            message: 'Navigated back',
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'wait': {
          const delay = action.delayMs || 1000;
          await new Promise((r) => setTimeout(r, delay));
          const state = await this.distill();
          return {
            success: true,
            action: 'wait',
            message: `Waited ${delay}ms`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        default:
          throw new Error(`Unsupported action type: ${(action as any).type}`);
      }
    } catch (err: any) {
      return {
        success: false,
        action: action.type,
        message: `Action failed: ${err.message}`,
        error: err.stack || err.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Closes browser context and instance cleanly.
   */
  public async close(): Promise<void> {
    if (this.context && this.page) {
      try {
        const url = this.page.url();
        if (url && !url.startsWith('about:')) {
          const state = await this.context.storageState();
          this.vault.saveStorageState(url, state, 'Saved on browser close');
        }
      } catch {
        // ignore state persistence errors during shutdown
      }
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}
