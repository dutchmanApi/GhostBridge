/**
 * GhostBridge Model Context Protocol (MCP) Server
 * Exposes the unified 95%-token-saving semantic runtime to Claude Code, Cursor, and OpenClaw via stdio.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GhostWebDriver } from '../drivers/webDriver.ts';
import { GhostAndroidDriver } from '../drivers/androidDriver.ts';
import { TargetPlatform } from '../types/protocol.ts';

class GhostBridgeMcpServer {
  private server: Server;
  private activePlatform: TargetPlatform = 'web';
  private webDriver: GhostWebDriver | null = null;
  private androidDriver: GhostAndroidDriver | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'ghostbridge-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registerToolHandlers();
  }

  private getWebDriver(): GhostWebDriver {
    if (!this.webDriver) {
      this.webDriver = new GhostWebDriver({
        headless: process.env.GHOSTBRIDGE_HEADLESS !== 'false',
        executablePath: process.env.GHOSTBRIDGE_BROWSER_PATH,
      });
    }
    return this.webDriver;
  }

  private getAndroidDriver(): GhostAndroidDriver {
    if (!this.androidDriver) {
      this.androidDriver = new GhostAndroidDriver({
        adbPath: process.env.ADB_PATH,
        deviceSerial: process.env.ADB_DEVICE_SERIAL,
      });
    }
    return this.androidDriver;
  }

  private registerToolHandlers(): void {
    // 1. List Available Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'ghost_open',
            description:
              'Navigates to a URL on web browser or launches an Android package on physical phone. Automatically distills page into numbered Markdown map.',
            inputSchema: {
              type: 'object',
              properties: {
                target: {
                  type: 'string',
                  description: 'URL (for web) or package name/intent (for Android, e.g., com.android.settings)',
                },
                platform: {
                  type: 'string',
                  enum: ['web', 'android'],
                  description: 'Target platform (defaults to active runtime platform)',
                },
              },
              required: ['target'],
            },
          },
          {
            name: 'ghost_inspect',
            description:
              'Distills the current active screen (Web DOM or Android UIAutomator) into a compact, 95%-token-saving numbered Markdown map [id] <tag> "label" with token reduction statistics.',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['web', 'android'],
                  description: 'Target platform (defaults to active runtime platform)',
                },
              },
            },
          },
          {
            name: 'ghost_click',
            description:
              'Clicks an element identified by [targetId] from the distilled Markdown map. Uses human-like Bezier mouse curves on Web or precision center (x,y) tap on Android.',
            inputSchema: {
              type: 'object',
              properties: {
                targetId: {
                  type: 'number',
                  description: 'The numeric element ID [id] from the distilled Markdown map',
                },
                platform: {
                  type: 'string',
                  enum: ['web', 'android'],
                },
              },
              required: ['targetId'],
            },
          },
          {
            name: 'ghost_type',
            description:
              'Types text into an input element identified by [targetId]. Supports clearing previous text and pressing Enter upon completion.',
            inputSchema: {
              type: 'object',
              properties: {
                targetId: {
                  type: 'number',
                  description: 'The numeric element ID [id]',
                },
                text: {
                  type: 'string',
                  description: 'The text to type',
                },
                clearBefore: {
                  type: 'boolean',
                  description: 'Whether to clear existing text in the input before typing',
                  default: false,
                },
                submit: {
                  type: 'boolean',
                  description: 'Whether to press Enter key after typing',
                  default: false,
                },
                platform: {
                  type: 'string',
                  enum: ['web', 'android'],
                },
              },
              required: ['targetId', 'text'],
            },
          },
          {
            name: 'ghost_scroll',
            description:
              'Scrolls the current viewport in the specified direction ("up", "down", "left", "right") with human gesture jitter.',
            inputSchema: {
              type: 'object',
              properties: {
                direction: {
                  type: 'string',
                  enum: ['up', 'down', 'left', 'right'],
                  default: 'down',
                },
                platform: {
                  type: 'string',
                  enum: ['web', 'android'],
                },
              },
            },
          },
          {
            name: 'ghost_handoff',
            description:
              'Pauses the AI agent cleanly and alerts human operator when encountering CAPTCHAs, 2FA, biometric authentication, or SMS OTP. Emits terminal bell and waits for manual completion before saving authenticated session cookies into the Vault.',
            inputSchema: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Description of the checkpoint (e.g., "Cloudflare Turnstile challenge" or "SMS 2FA Code prompt")',
                },
              },
              required: ['reason'],
            },
          },
          {
            name: 'ghost_switch_target',
            description:
              'Switches the active runtime platform between "web" (Playwright/CloakBrowser) and "android" (Physical Phone ADB).',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['web', 'android'],
                  description: 'The platform to set as active',
                },
              },
              required: ['platform'],
            },
          },
        ],
      };
    });

    // 2. Handle Tool Invocations
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const targetPlatform = ((args as any)?.platform as TargetPlatform) || this.activePlatform;

      try {
        switch (name) {
          case 'ghost_switch_target': {
            const newPlatform = (args as any)?.platform as TargetPlatform;
            if (newPlatform !== 'web' && newPlatform !== 'android') {
              throw new Error('Platform must be "web" or "android"');
            }
            this.activePlatform = newPlatform;
            return {
              content: [
                {
                  type: 'text',
                  text: `Switched active GhostBridge target to: ${newPlatform.toUpperCase()}`,
                },
              ],
            };
          }

          case 'ghost_open': {
            const target = (args as any)?.target as string;
            if (!target) throw new Error('Missing "target" parameter');

            if (targetPlatform === 'web') {
              const driver = this.getWebDriver();
              const result = await driver.executeAction({ type: 'open', urlOrPackage: target });
              return {
                content: [
                  {
                    type: 'text',
                    text: `${result.message}\n\n${result.state?.markdown || ''}\nToken reduction: ${result.state?.stats.tokenReductionPercentage}% savings`,
                  },
                ],
              };
            } else {
              const driver = this.getAndroidDriver();
              const result = await driver.executeAction({ type: 'open', urlOrPackage: target });
              return {
                content: [
                  {
                    type: 'text',
                    text: `${result.message}\n\n${result.state?.markdown || ''}\nToken reduction: ${result.state?.stats.tokenReductionPercentage}% savings`,
                  },
                ],
              };
            }
          }

          case 'ghost_inspect': {
            if (targetPlatform === 'web') {
              const driver = this.getWebDriver();
              const result = await driver.executeAction({ type: 'inspect' });
              return {
                content: [
                  {
                    type: 'text',
                    text: `${result.state?.markdown || 'No page state'}\nToken reduction: ${result.state?.stats.tokenReductionPercentage}% savings (~${result.state?.stats.distilledEstimatedTokens} tokens vs ~${result.state?.stats.rawEstimatedTokens} raw)`,
                  },
                ],
              };
            } else {
              const driver = this.getAndroidDriver();
              const result = await driver.executeAction({ type: 'inspect' });
              return {
                content: [
                  {
                    type: 'text',
                    text: `${result.state?.markdown || 'No screen state'}\nToken reduction: ${result.state?.stats.tokenReductionPercentage}% savings`,
                  },
                ],
              };
            }
          }

          case 'ghost_click': {
            const targetId = Number((args as any)?.targetId);
            if (!targetId) throw new Error('TargetId is required');

            const driver = targetPlatform === 'web' ? this.getWebDriver() : this.getAndroidDriver();
            const result = await driver.executeAction({ type: 'click', targetId });
            return {
              content: [
                {
                  type: 'text',
                  text: `${result.message}\n\nUpdated State:\n${result.state?.markdown || ''}`,
                },
              ],
            };
          }

          case 'ghost_type': {
            const targetId = Number((args as any)?.targetId);
            const text = String((args as any)?.text ?? '');
            const clearBefore = Boolean((args as any)?.clearBefore);
            const submit = Boolean((args as any)?.submit);

            const driver = targetPlatform === 'web' ? this.getWebDriver() : this.getAndroidDriver();
            const result = await driver.executeAction({
              type: 'type',
              targetId,
              text,
              clearBefore,
              key: submit ? 'Enter' : undefined,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `${result.message}\n\nUpdated State:\n${result.state?.markdown || ''}`,
                },
              ],
            };
          }

          case 'ghost_scroll': {
            const direction = ((args as any)?.direction as any) || 'down';
            const driver = targetPlatform === 'web' ? this.getWebDriver() : this.getAndroidDriver();
            const result = await driver.executeAction({ type: 'scroll', direction });

            return {
              content: [
                {
                  type: 'text',
                  text: `${result.message}\n\nUpdated State:\n${result.state?.markdown || ''}`,
                },
              ],
            };
          }

          case 'ghost_handoff': {
            const reason = String((args as any)?.reason || 'Operator intervention required');
            const driver = targetPlatform === 'web' ? this.getWebDriver() : this.getAndroidDriver();
            const result = await driver.executeAction({ type: 'handoff', reason });

            return {
              content: [
                {
                  type: 'text',
                  text: `${result.message}\n\nUpdated State:\n${result.state?.markdown || ''}`,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `GhostBridge error executing ${name}: ${err.message}`,
            },
          ],
        };
      }
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[GhostBridge] MCP Stdio Server running. Waiting for agent requests...');

    // Graceful cleanup on shutdown
    const cleanup = async () => {
      console.error('[GhostBridge] Shutting down MCP Server...');
      if (this.webDriver) await this.webDriver.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}

export async function runMcpServer(): Promise<void> {
  const mcpServer = new GhostBridgeMcpServer();
  await mcpServer.start();
}

// Auto-run if executed directly
if (process.argv[1]?.includes('server.ts') || process.argv[1]?.includes('server.js')) {
  runMcpServer().catch((err) => {
    console.error('Failed to start GhostBridge MCP Server:', err);
    process.exit(1);
  });
}
