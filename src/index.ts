#!/usr/bin/env node

/**
 * GhostBridge CLI
 * Zero-cost, local-first semantic runtime for stealth browsers and physical Android devices.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { GhostWebDriver } from './drivers/webDriver.ts';
import { GhostAndroidDriver } from './drivers/androidDriver.ts';
import { SessionVault } from './vault/sessionVault.ts';
import { runMcpServer } from './mcp/server.ts';

const program = new Command();

program
  .name('ghostbridge')
  .description('👻 GhostBridge: 95%-token-saving semantic runtime & MCP server for AI agents')
  .version('1.0.0');

// 1. Web Inspect Command
program
  .command('inspect [url]')
  .option('-u, --url <url>', 'Target URL to inspect')
  .option('--no-headless', 'Launch browser with visible GUI')
  .description('Distills any live web page into an ultra-compact numbered semantic Markdown map')
  .action(async (urlArg, options) => {
    const targetUrl = urlArg || options.url || 'https://news.ycombinator.com';
    console.log(chalk.cyan(`\n👻 GhostBridge Web Inspector: ${chalk.bold(targetUrl)}`));
    console.log(chalk.gray('Launching stealth browser & distilling DOM...'));

    const driver = new GhostWebDriver({
      headless: options.headless,
    });

    try {
      const result = await driver.executeAction({
        type: 'open',
        urlOrPackage: targetUrl,
      });

      if (!result.success || !result.state) {
        console.error(chalk.red(`\nFailed to inspect: ${result.message}`));
        process.exit(1);
      }

      const { stats, markdown, elements } = result.state;

      console.log('\n' + chalk.bold.green('=== DISTILLED SEMANTIC MAP ==='));
      console.log(markdown);

      console.log(chalk.bold.yellow('=== TOKEN TAX BENCHMARK ==='));
      console.log(
        chalk.white(`Raw HTML Size:       ${chalk.bold(stats.rawByteCount.toLocaleString())} bytes (~${stats.rawEstimatedTokens.toLocaleString()} tokens)`)
      );
      console.log(
        chalk.white(`Distilled Map Size:  ${chalk.bold(stats.distilledByteCount.toLocaleString())} bytes (~${stats.distilledEstimatedTokens.toLocaleString()} tokens)`)
      );
      console.log(
        chalk.bold.cyan(`Token Reduction:     ${stats.tokenReductionPercentage}% savings!`)
      );
      console.log(
        chalk.white(`Elements Tagged:     ${elements.length} (${stats.interactiveCount} interactive)`)
      );
      console.log(
        chalk.gray(`Execution latency:   ${stats.distillationDurationMs} ms\n`)
      );
    } catch (err: any) {
      console.error(chalk.red(`\nError: ${err.message}`));
    } finally {
      await driver.close();
      process.exit(0);
    }
  });

// 2. Android Device Subcommands
const deviceCmd = program
  .command('device')
  .description('Inspect and control real physical Android devices via ADB');

deviceCmd
  .command('list')
  .description('List all connected USB and wireless Android devices')
  .action(async () => {
    console.log(chalk.cyan('\n📱 GhostBridge ADB Device Discovery:'));
    const driver = new GhostAndroidDriver();
    const devices = await driver.listDevices();

    if (devices.length === 0) {
      console.log(chalk.yellow('No Android devices found. Make sure USB Debugging is enabled.\n'));
      return;
    }

    console.log(chalk.green(`Found ${devices.length} connected device(s):\n`));
    devices.forEach((d, i) => {
      console.log(
        `  ${chalk.bold.cyan(`[${i + 1}]`)} Serial: ${chalk.bold(d.serial)} | Model: ${chalk.green(d.model || 'Unknown')} | Type: ${chalk.magenta(d.connectionType)} | State: ${chalk.yellow(d.state)}`
      );
    });
    console.log('');
  });

deviceCmd
  .command('inspect')
  .description('Stream and distill current physical Android screen into numbered Markdown map')
  .action(async () => {
    await runAndroidInspect();
  });

// Also provide top-level alias: `npx ghostbridge android-inspect`
program
  .command('android-inspect')
  .description('Alias for "device inspect"')
  .action(async () => {
    await runAndroidInspect();
  });

async function runAndroidInspect() {
  console.log(chalk.cyan('\n📱 GhostBridge Android Screen Inspector:'));
  console.log(chalk.gray('Streaming uiautomator hierarchy dump from device...'));

  const driver = new GhostAndroidDriver();
  try {
    const devices = await driver.listDevices();
    if (devices.length === 0) {
      console.log(chalk.yellow('⚠️  No active physical Android devices detected.'));
      console.log(chalk.gray('Tip: Connect phone via USB, enable Developer Options & USB Debugging.\n'));
      return;
    }

    const state = await driver.dumpAndDistill();
    console.log('\n' + chalk.bold.green('=== ANDROID SEMANTIC MAP ==='));
    console.log(state.markdown);

    console.log(chalk.bold.yellow('=== TOKEN TAX BENCHMARK ==='));
    console.log(
      chalk.white(`Raw XML Dump Size:   ${chalk.bold(state.stats.rawByteCount.toLocaleString())} bytes (~${state.stats.rawEstimatedTokens.toLocaleString()} tokens)`)
    );
    console.log(
      chalk.white(`Distilled Map Size:  ${chalk.bold(state.stats.distilledByteCount.toLocaleString())} bytes (~${state.stats.distilledEstimatedTokens.toLocaleString()} tokens)`)
    );
    console.log(
      chalk.bold.cyan(`Token Reduction:     ${state.stats.tokenReductionPercentage}% savings!`)
    );
    console.log(
      chalk.white(`Interactive Elements: ${state.elements.length}\n`)
    );
  } catch (err: any) {
    console.error(chalk.red(`\nADB Error: ${err.message}\n`));
  }
}

// 3. MCP Server Command & Alias
program
  .command('serve-mcp')
  .alias('mcp')
  .description('Start the Model Context Protocol (MCP) stdio server for Claude Code / Cursor')
  .action(async () => {
    await runMcpServer();
  });

// 4. Session Vault Commands
const vaultCmd = program
  .command('vault')
  .description('Inspect and manage the local ~/.ghostbridge/vault storage');

vaultCmd
  .command('list')
  .description('List all saved authenticated domain profiles and cookie counts')
  .action(() => {
    const vault = new SessionVault();
    const entries = vault.listEntries();
    console.log(chalk.cyan('\n🔐 GhostBridge Local Session Vault:'));

    if (entries.length === 0) {
      console.log(chalk.gray('Vault is empty. Sessions are auto-saved upon authentication & handoff.\n'));
      return;
    }

    console.log(chalk.green(`Stored Profiles (${entries.length}):\n`));
    entries.forEach((e) => {
      console.log(
        `  • ${chalk.bold.white(e.domain.padEnd(25))} | ${chalk.cyan(`${e.cookieCount} cookies`)} | Updated: ${chalk.gray(e.updatedAt)}`
      );
    });
    console.log('');
  });

vaultCmd
  .command('clear')
  .description('Clear all saved profiles in the vault')
  .action(() => {
    const vault = new SessionVault();
    const entries = vault.listEntries();
    entries.forEach((e) => vault.deleteEntry(e.domain));
    console.log(chalk.green(`\n✓ Cleared ${entries.length} profile(s) from vault.\n`));
  });

vaultCmd
  .command('handoff [reason]')
  .description('Test the human handoff terminal pause and notification chime')
  .action(async (reason) => {
    const vault = new SessionVault();
    await vault.waitForHumanHandoff(reason || 'CLI Handoff Verification Test');
  });

program.parse(process.argv);
