/**
 * GhostBridge Session Vault & Human Handoff Manager
 * Persists authenticated browser session states (cookies, localStorage, tokens) locally
 * in ~/.ghostbridge/vault and orchestrates clean human-intervention pauses for 2FA / CAPTCHAs.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import chalk from 'chalk';
import { SessionVaultRecord } from '../types/protocol.ts';

export class SessionVault {
  private vaultDir: string;

  constructor(customVaultDir?: string) {
    if (customVaultDir) {
      this.vaultDir = customVaultDir;
    } else {
      const homeDir = os.homedir();
      this.vaultDir = process.env.GHOSTBRIDGE_VAULT_DIR || path.join(homeDir, '.ghostbridge', 'vault');
    }
    this.ensureVaultDirectory();
  }

  /**
   * Ensures the storage vault directory exists locally.
   */
  private ensureVaultDirectory(): void {
    try {
      if (!fs.existsSync(this.vaultDir)) {
        fs.mkdirSync(this.vaultDir, { recursive: true, mode: 0o700 });
      }
    } catch {
      // Fallback to local working directory if home is read-only
      this.vaultDir = path.join(process.cwd(), '.ghostbridge-vault');
      if (!fs.existsSync(this.vaultDir)) {
        fs.mkdirSync(this.vaultDir, { recursive: true });
      }
    }
  }

  /**
   * Sanitizes a URL or hostname into a clean filename key (e.g., "https://sub.github.com/login" -> "sub.github.com")
   */
  public sanitizeDomain(targetUrlOrDomain: string): string {
    let domain = targetUrlOrDomain.trim();
    try {
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        domain = new URL(domain).hostname;
      }
    } catch {
      // Keep as-is if URL parse fails
    }
    return domain.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  }

  private getFilePath(domain: string): string {
    const safeKey = this.sanitizeDomain(domain);
    return path.join(this.vaultDir, `${safeKey}.json`);
  }

  /**
   * Saves Playwright storageState or cookie bundle into the vault.
   */
  public saveStorageState(
    domain: string,
    storageState: {
      cookies?: any[];
      origins?: any[];
    },
    notes?: string
  ): SessionVaultRecord {
    const cleanDomain = this.sanitizeDomain(domain);
    const filePath = this.getFilePath(cleanDomain);
    const now = new Date().toISOString();

    const record: SessionVaultRecord = {
      id: cleanDomain,
      domain: cleanDomain,
      platform: 'web',
      createdAt: now,
      updatedAt: now,
      cookies: storageState.cookies || [],
      origins: storageState.origins || [],
      notes: notes || `Session saved for ${cleanDomain}`,
    };

    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');
    return record;
  }

  /**
   * Loads saved Playwright storageState if available for the given domain.
   */
  public loadStorageState(domain: string): SessionVaultRecord | null {
    const filePath = this.getFilePath(domain);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as SessionVaultRecord;
    } catch {
      return null;
    }
  }

  /**
   * Checks if a valid session exists for a domain.
   */
  public hasSession(domain: string): boolean {
    return fs.existsSync(this.getFilePath(domain));
  }

  /**
   * Lists all stored session profiles in the vault.
   */
  public listEntries(): Array<{
    domain: string;
    cookieCount: number;
    originsCount: number;
    updatedAt: string;
    filePath: string;
  }> {
    this.ensureVaultDirectory();
    try {
      const files = fs.readdirSync(this.vaultDir).filter((f) => f.endsWith('.json'));
      return files.map((file) => {
        const fullPath = path.join(this.vaultDir, file);
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const data = JSON.parse(raw);
          return {
            domain: data.domain || file.replace('.json', ''),
            cookieCount: data.cookies?.length || 0,
            originsCount: data.origins?.length || 0,
            updatedAt: data.updatedAt || 'Unknown',
            filePath: fullPath,
          };
        } catch {
          return {
            domain: file.replace('.json', ''),
            cookieCount: 0,
            originsCount: 0,
            updatedAt: 'Error reading',
            filePath: fullPath,
          };
        }
      });
    } catch {
      return [];
    }
  }

  /**
   * Deletes a session profile from the vault.
   */
  public deleteEntry(domain: string): boolean {
    const filePath = this.getFilePath(domain);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Pauses the AI agent cleanly for human intervention (2FA, CAPTCHA, Biometric).
   * Emits audible terminal chime, renders a visible alert box, and waits for user confirmation.
   */
  public async waitForHumanHandoff(
    reason: string,
    timeoutMs: number = 300000 // 5-minute default timeout
  ): Promise<boolean> {
    // Sound terminal alert bell
    if (process.stdout.isTTY) {
      process.stdout.write('\x07');
    }

    const boxWidth = 66;
    const line = '═'.repeat(boxWidth);

    console.log('\n' + chalk.yellow(`╔${line}╗`));
    console.log(chalk.yellow(`║  ⚠️   GHOSTBRIDGE HUMAN HANDOFF REQUIRED                          ║`));
    console.log(chalk.yellow(`╠${line}╣`));
    console.log(chalk.yellow(`║  Reason: `) + chalk.white(reason.padEnd(boxWidth - 10)) + chalk.yellow(`║`));
    console.log(chalk.yellow(`║                                                                  ║`));
    console.log(chalk.yellow(`║  The AI Agent has paused execution.                              ║`));
    console.log(chalk.yellow(`║  1. Complete the CAPTCHA or 2FA login in the target window.       ║`));
    console.log(chalk.yellow(`║  2. Return here and press [ENTER] to resume automation.          ║`));
    console.log(chalk.yellow(`║  3. All authenticated cookies will be cached in your Vault.      ║`));
    console.log(chalk.yellow(`╚${line}╝\n`));

    return new Promise<boolean>((resolve) => {
      let resolved = false;

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          rl.close();
          console.log(chalk.red('\n[GhostBridge] Human handoff timed out after ' + Math.round(timeoutMs / 1000) + 's.\n'));
          resolve(false);
        }
      }, timeoutMs);

      rl.question(chalk.cyan('👉 Press ENTER once verified [or type "cancel"]: '), (answer) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          rl.close();
          if (answer.trim().toLowerCase() === 'cancel') {
            console.log(chalk.red('[GhostBridge] Human handoff cancelled by operator.\n'));
            resolve(false);
          } else {
            console.log(chalk.green('✓ Human handoff resolved. Persisting state & resuming agent...\n'));
            resolve(true);
          }
        }
      });
    });
  }
}
