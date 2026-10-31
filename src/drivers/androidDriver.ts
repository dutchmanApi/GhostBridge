/**
 * GhostBridge Physical Android Driver
 * Zero-dependency child_process ADB controller for real physical Android devices.
 * Fast uiautomator dump streaming, coordinate tap, safe shell text input, and gesture swipes.
 */

import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import {
  ConnectedDevice,
  DistilledState,
  GhostAction,
  GhostActionResult,
} from '../types/protocol.ts';
import { distillAndroidXml } from '../distillers/androidDistiller.ts';
import { SessionVault } from '../vault/sessionVault.ts';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface AndroidDriverOptions {
  adbPath?: string;
  deviceSerial?: string;
  vaultDir?: string;
}

export class GhostAndroidDriver {
  private adbPath: string;
  private deviceSerial?: string;
  private vault: SessionVault;
  private cachedResolution: { width: number; height: number } = { width: 1080, height: 2400 };

  constructor(options: AndroidDriverOptions = {}) {
    this.adbPath = options.adbPath || process.env.ADB_PATH || 'adb';
    this.deviceSerial = options.deviceSerial;
    this.vault = new SessionVault(options.vaultDir);
  }

  /**
   * Builds the ADB command arguments array targeting the selected device.
   */
  private getAdbArgs(args: string[]): string[] {
    if (this.deviceSerial) {
      return ['-s', this.deviceSerial, ...args];
    }
    return args;
  }

  /**
   * Executes an ADB command safely.
   */
  public async execAdb(args: string[]): Promise<string> {
    try {
      const fullArgs = this.getAdbArgs(args);
      const { stdout } = await execFileAsync(this.adbPath, fullArgs, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (err: any) {
      throw new Error(`ADB command failed (${args.join(' ')}): ${err.message}`);
    }
  }

  /**
   * Discovers all physical and wireless Android devices connected to the host.
   */
  public async listDevices(): Promise<ConnectedDevice[]> {
    try {
      const output = await this.execAdb(['devices', '-l']);
      const lines = output.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      const devices: ConnectedDevice[] = [];

      for (const line of lines) {
        if (line.startsWith('List of devices')) continue;

        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const serial = parts[0];
          const state = parts[1] as ConnectedDevice['state'];

          let model: string | undefined;
          let product: string | undefined;

          for (const item of parts.slice(2)) {
            if (item.startsWith('model:')) model = item.replace('model:', '');
            if (item.startsWith('product:')) product = item.replace('product:', '');
          }

          const isWifi = serial.includes(':');
          const isEmulator = serial.startsWith('emulator-');

          devices.push({
            serial,
            state,
            model,
            product,
            connectionType: isEmulator ? 'emulator' : isWifi ? 'wifi' : 'usb',
          });
        }
      }

      // If no explicit serial was set, auto-select the first available online device
      if (!this.deviceSerial && devices.length > 0) {
        const onlineDevice = devices.find((d) => d.state === 'device');
        if (onlineDevice) {
          this.deviceSerial = onlineDevice.serial;
        }
      }

      return devices;
    } catch {
      // Return empty list if ADB binary is missing or daemon fails
      return [];
    }
  }

  /**
   * Fetches the physical screen resolution of the active device.
   */
  public async getScreenResolution(): Promise<{ width: number; height: number }> {
    try {
      const output = await this.execAdb(['shell', 'wm', 'size']);
      const match = output.match(/Physical size:\s*(\d+)x(\d+)/i) || output.match(/(\d+)x(\d+)/);
      if (match) {
        this.cachedResolution = {
          width: parseInt(match[1], 10),
          height: parseInt(match[2], 10),
        };
      }
    } catch {
      // Keep default 1080x2400
    }
    return this.cachedResolution;
  }

  /**
   * Inspects the top-most focused Android app package and activity name.
   */
  public async getCurrentApp(): Promise<{ packageName: string; activityName: string }> {
    try {
      const output = await this.execAdb(['shell', 'dumpsys', 'window']);
      const focusMatch =
        output.match(/mCurrentFocus[^\n]*\/([^\s}]+)/) ||
        output.match(/mFocusedApp[^\n]*\s([a-zA-Z0-9._]+)\/([^\s}]+)/);

      if (focusMatch) {
        const full = focusMatch[0];
        const pkgMatch = full.match(/([a-zA-Z0-9._]+)\/([a-zA-Z0-9._]+)/);
        if (pkgMatch) {
          return { packageName: pkgMatch[1], activityName: pkgMatch[2] };
        }
      }
    } catch {
      // Fallback
    }
    return { packageName: 'android.app', activityName: 'CurrentScreen' };
  }

  /**
   * Fast uiautomator dump streamed directly without slow multi-step file pulls.
   */
  public async dumpAndDistill(): Promise<DistilledState> {
    const res = await this.getScreenResolution();
    const app = await this.getCurrentApp();

    try {
      // Execute dump to tmp file and cat in single compound shell command
      const cmd = 'uiautomator dump /data/local/tmp/ghost_dump.xml > /dev/null && cat /data/local/tmp/ghost_dump.xml';
      const xml = await this.execAdb(['shell', cmd]);

      return distillAndroidXml(xml, app.packageName, app.activityName, res.width, res.height);
    } catch (err: any) {
      throw new Error(`Failed to capture Android screen hierarchy: ${err.message}`);
    }
  }

  /**
   * Executes unified GhostAction on physical Android device.
   */
  public async executeAction(action: GhostAction): Promise<GhostActionResult> {
    const startTime = Date.now();

    try {
      switch (action.type) {
        case 'open': {
          const pkg = action.urlOrPackage;
          if (!pkg) throw new Error('Open requires package name (e.g., com.android.settings)');

          // Launch application via monkey launcher
          await this.execAdb(['shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1']);
          // Settle delay for app launch animation
          await new Promise((r) => setTimeout(r, 1200));

          const state = await this.dumpAndDistill();
          return {
            success: true,
            action: 'open',
            message: `Launched Android package: ${pkg}`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'inspect': {
          const state = await this.dumpAndDistill();
          return {
            success: true,
            action: 'inspect',
            message: 'Android UI hierarchy distilled',
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'click': {
          let x: number;
          let y: number;

          if (action.coordinates) {
            x = action.coordinates.x;
            y = action.coordinates.y;
          } else if (action.targetId) {
            const state = await this.dumpAndDistill();
            const el = state.elements.find((e) => e.id === action.targetId);
            if (!el) {
              throw new Error(`Android element with id [${action.targetId}] not found on screen`);
            }
            x = el.bounds.centerX;
            y = el.bounds.centerY;
          } else {
            throw new Error('Click requires targetId or coordinates');
          }

          // Add biological micro-jitter (+- 2px)
          const jitterX = x + Math.round((Math.random() - 0.5) * 4);
          const jitterY = y + Math.round((Math.random() - 0.5) * 4);

          await this.execAdb(['shell', 'input', 'tap', String(jitterX), String(jitterY)]);
          await new Promise((r) => setTimeout(r, 600));

          const state = await this.dumpAndDistill();
          return {
            success: true,
            action: 'click',
            message: `Tapped @(${jitterX}, ${jitterY}) on Android device`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'type': {
          const text = action.text ?? '';
          if (action.targetId) {
            // First tap the target element to focus it
            const preState = await this.dumpAndDistill();
            const el = preState.elements.find((e) => e.id === action.targetId);
            if (el) {
              await this.execAdb(['shell', 'input', 'tap', String(el.bounds.centerX), String(el.bounds.centerY)]);
              await new Promise((r) => setTimeout(r, 300));
            }
          }

          if (action.clearBefore) {
            // Select all and delete (simulate 15 backspaces or keycombo)
            for (let i = 0; i < 15; i++) {
              await this.execAdb(['shell', 'input', 'keyevent', '67']); // KEYCODE_DEL
            }
          }

          // Safely encode text for ADB input (escape spaces with %s and shell quotes)
          const escaped = text.replace(/ /g, '%s').replace(/([&$`"'\\])/g, '\\$1');
          await this.execAdb(['shell', 'input', 'text', escaped]);

          if (action.key === 'Enter') {
            await this.execAdb(['shell', 'input', 'keyevent', '66']); // KEYCODE_ENTER
          }

          await new Promise((r) => setTimeout(r, 500));
          const state = await this.dumpAndDistill();
          return {
            success: true,
            action: 'type',
            message: `Typed "${text}" on Android device`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'scroll': {
          const res = await this.getScreenResolution();
          const centerX = Math.round(res.width / 2);
          const dir = action.direction || 'down';

          let startY: number;
          let endY: number;

          if (dir === 'down') {
            // Swipe up to scroll down
            startY = Math.round(res.height * 0.7);
            endY = Math.round(res.height * 0.3);
          } else if (dir === 'up') {
            // Swipe down to scroll up
            startY = Math.round(res.height * 0.3);
            endY = Math.round(res.height * 0.7);
          } else {
            startY = Math.round(res.height * 0.5);
            endY = Math.round(res.height * 0.5);
          }

          // Swipe with natural touch duration (350ms)
          await this.execAdb([
            'shell',
            'input',
            'swipe',
            String(centerX),
            String(startY),
            String(centerX),
            String(endY),
            '350',
          ]);

          await new Promise((r) => setTimeout(r, 600));
          const state = await this.dumpAndDistill();
          return {
            success: true,
            action: 'scroll',
            message: `Scrolled Android screen ${dir}`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'press': {
          const key = action.key || 'Enter';
          let keyCode = '66'; // ENTER
          if (key.toLowerCase() === 'back') keyCode = '4';
          if (key.toLowerCase() === 'home') keyCode = '3';
          if (key.toLowerCase() === 'app_switch') keyCode = '187';

          await this.execAdb(['shell', 'input', 'keyevent', keyCode]);
          await new Promise((r) => setTimeout(r, 400));

          const state = await this.dumpAndDistill();
          return {
            success: true,
            action: 'press',
            message: `Sent keyevent ${keyCode} (${key}) to Android device`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'back': {
          await this.execAdb(['shell', 'input', 'keyevent', '4']); // KEYCODE_BACK
          await new Promise((r) => setTimeout(r, 400));
          const state = await this.dumpAndDistill();
          return {
            success: true,
            action: 'back',
            message: 'Navigated back on Android device',
            state,
            durationMs: Date.now() - startTime,
          };
        }

        case 'handoff': {
          const reason = action.reason || 'Biometric prompt or SMS OTP verification on physical device';
          const resolved = await this.vault.waitForHumanHandoff(reason);
          const state = await this.dumpAndDistill();
          return {
            success: resolved,
            action: 'handoff',
            message: resolved ? 'Human verification confirmed on Android device' : 'Handoff cancelled or timed out',
            state,
            durationMs: Date.now() - startTime,
            requiresHandoff: !resolved,
          };
        }

        case 'wait': {
          const delay = action.delayMs || 1000;
          await new Promise((r) => setTimeout(r, delay));
          const state = await this.dumpAndDistill();
          return {
            success: true,
            action: 'wait',
            message: `Waited ${delay}ms on Android`,
            state,
            durationMs: Date.now() - startTime,
          };
        }

        default:
          throw new Error(`Unsupported Android action: ${(action as any).type}`);
      }
    } catch (err: any) {
      return {
        success: false,
        action: action.type,
        message: `Android action failed: ${err.message}`,
        error: err.stack || err.message,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
