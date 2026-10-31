/**
 * GhostBridge Core Protocol Specification
 * Unified Semantic Runtime for Stealth Web and Real Android Physical Devices
 */

import { z } from 'zod';

export type TargetPlatform = 'web' | 'android';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type SemanticRole =
  | 'button'
  | 'input'
  | 'link'
  | 'text'
  | 'heading'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'option'
  | 'image'
  | 'scrollable'
  | 'container'
  | 'tab'
  | 'dialog'
  | 'switch';

export interface DistilledElement {
  id: number;
  role: SemanticRole;
  tag: string;
  label: string;
  value?: string;
  placeholder?: string;
  platform: TargetPlatform;
  bounds: ElementBounds;
  selector?: string;
  resourceId?: string;
  xpath?: string;
  clickable: boolean;
  focusable: boolean;
  scrollable: boolean;
  disabled: boolean;
  checked?: boolean;
}

export interface DistillationStats {
  rawByteCount: number;
  distilledByteCount: number;
  rawEstimatedTokens: number;
  distilledEstimatedTokens: number;
  tokenReductionPercentage: number;
  elementCount: number;
  interactiveCount: number;
  timestamp: number;
  distillationDurationMs: number;
}

export interface DistilledState {
  platform: TargetPlatform;
  context: {
    urlOrPackage: string;
    title: string;
    activity?: string;
  };
  viewport: {
    width: number;
    height: number;
    devicePixelRatio?: number;
  };
  markdown: string;
  elements: DistilledElement[];
  stats: DistillationStats;
}

export type ActionType =
  | 'open'
  | 'inspect'
  | 'click'
  | 'type'
  | 'scroll'
  | 'press'
  | 'wait'
  | 'back'
  | 'handoff'
  | 'capture';

export interface GhostAction {
  type: ActionType;
  platform?: TargetPlatform;
  targetId?: number;
  text?: string;
  urlOrPackage?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  coordinates?: { x: number; y: number };
  key?: string;
  delayMs?: number;
  reason?: string;
  clearBefore?: boolean;
}

export interface GhostActionResult {
  success: boolean;
  action: ActionType;
  message: string;
  state?: DistilledState;
  durationMs: number;
  screenshotBase64?: string;
  error?: string;
  requiresHandoff?: boolean;
}

export interface SessionVaultRecord {
  id: string;
  domain: string;
  platform: TargetPlatform;
  createdAt: string;
  updatedAt: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  origins?: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
  notes?: string;
}

export interface ConnectedDevice {
  serial: string;
  state: 'device' | 'unauthorized' | 'offline' | 'bootloader';
  model?: string;
  product?: string;
  connectionType: 'usb' | 'wifi' | 'emulator';
  resolution?: { width: number; height: number };
  batteryLevel?: number;
}

// Zod schemas for runtime parameter validation & MCP tools
export const GhostActionSchema = z.object({
  type: z.enum([
    'open',
    'inspect',
    'click',
    'type',
    'scroll',
    'press',
    'wait',
    'back',
    'handoff',
    'capture',
  ]),
  platform: z.enum(['web', 'android']).optional(),
  targetId: z.number().int().positive().optional(),
  text: z.string().optional(),
  urlOrPackage: z.string().optional(),
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  coordinates: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  key: z.string().optional(),
  delayMs: z.number().positive().optional(),
  reason: z.string().optional(),
  clearBefore: z.boolean().optional(),
});
