/**
 * GhostBridge Android UIAutomator XML Distiller
 * Parses raw `adb shell uiautomator dump` XML trees, computes center (x, y) tap coordinates,
 * eliminates empty frame noise, and yields the unified compact Markdown element map.
 */

import { XMLParser } from 'fast-xml-parser';
import {
  DistilledElement,
  DistilledState,
  ElementBounds,
  SemanticRole,
} from '../types/protocol.ts';
import { estimateTokens } from './domDistiller.ts';

interface RawXmlNode {
  '@_index'?: string;
  '@_text'?: string;
  '@_resource-id'?: string;
  '@_class'?: string;
  '@_package'?: string;
  '@_content-desc'?: string;
  '@_checkable'?: string;
  '@_checked'?: string;
  '@_clickable'?: string;
  '@_enabled'?: string;
  '@_focusable'?: string;
  '@_focused'?: string;
  '@_scrollable'?: string;
  '@_long-clickable'?: string;
  '@_password'?: string;
  '@_selected'?: string;
  '@_bounds'?: string;
  node?: RawXmlNode | RawXmlNode[];
}

/**
 * Parses Android UIAutomator bounds "[x1,y1][x2,y2]"
 */
export function parseAndroidBounds(boundsStr?: string): ElementBounds | null {
  if (!boundsStr) return null;
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;

  const x1 = parseInt(match[1], 10);
  const y1 = parseInt(match[2], 10);
  const x2 = parseInt(match[3], 10);
  const y2 = parseInt(match[4], 10);

  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);

  return {
    x: x1,
    y: y1,
    width,
    height,
    centerX: Math.round(x1 + width / 2),
    centerY: Math.round(y1 + height / 2),
  };
}

/**
 * Determines clean semantic role from Android class name & attributes
 */
function determineAndroidRole(
  className: string,
  clickable: boolean,
  checkable: boolean,
  scrollable: boolean,
  isPassword: boolean
): SemanticRole {
  const lowerClass = className.toLowerCase();

  if (isPassword || lowerClass.includes('edittext')) return 'input';
  if (lowerClass.includes('checkbox')) return 'checkbox';
  if (lowerClass.includes('switch') || lowerClass.includes('togglebutton')) return 'switch';
  if (lowerClass.includes('radiobutton')) return 'radio';
  if (lowerClass.includes('tab') || lowerClass.includes('tabitem')) return 'tab';
  if (lowerClass.includes('button') || clickable) return 'button';
  if (scrollable || lowerClass.includes('scrollview') || lowerClass.includes('recyclerview')) {
    return 'scrollable';
  }
  if (lowerClass.includes('imageview') && !clickable) return 'image';
  return 'text';
}

/**
 * Sanitizes Android resource-id (e.g., "com.whatsapp:id/send_button" -> "send_button")
 */
function cleanResourceId(resId?: string): string {
  if (!resId) return '';
  const idx = resId.indexOf(':id/');
  return idx !== -1 ? resId.slice(idx + 4) : resId;
}

/**
 * Distills raw Android uiautomator dump XML into unified DistilledState
 */
export function distillAndroidXml(
  xmlContent: string,
  defaultPackage = 'unknown.android.app',
  defaultActivity = 'MainActivity',
  screenWidth = 1080,
  screenHeight = 2400
): DistilledState {
  const startTime = Date.now();
  const elements: DistilledElement[] = [];
  let ghostIdCounter = 1;
  let detectedPackage = defaultPackage;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
  });

  let parsed: any;
  try {
    parsed = parser.parse(xmlContent);
  } catch {
    // If parse fails (e.g. malformed or partial dump), return graceful empty state
    return {
      platform: 'android',
      context: { urlOrPackage: defaultPackage, title: defaultActivity },
      viewport: { width: screenWidth, height: screenHeight },
      markdown: `### Android Screen: ${defaultPackage}\n(No elements parsed from dump)\n`,
      elements: [],
      stats: {
        rawByteCount: Buffer.byteLength(xmlContent, 'utf8'),
        distilledByteCount: 0,
        rawEstimatedTokens: estimateTokens(xmlContent),
        distilledEstimatedTokens: 0,
        tokenReductionPercentage: 0,
        elementCount: 0,
        interactiveCount: 0,
        timestamp: Date.now(),
        distillationDurationMs: 0,
      },
    };
  }

  function traverseNode(node: RawXmlNode) {
    if (!node) return;

    const bounds = parseAndroidBounds(node['@_bounds']);
    const className = node['@_class'] || '';
    const text = (node['@_text'] || '').trim();
    const contentDesc = (node['@_content-desc'] || '').trim();
    const resId = node['@_resource-id'] || '';
    const pkg = node['@_package'];

    if (pkg && detectedPackage === defaultPackage && pkg !== 'android') {
      detectedPackage = pkg;
    }

    const clickable = node['@_clickable'] === 'true';
    const checkable = node['@_checkable'] === 'true';
    const checked = node['@_checked'] === 'true';
    const focusable = node['@_focusable'] === 'true';
    const scrollable = node['@_scrollable'] === 'true';
    const isPassword = node['@_password'] === 'true';
    const enabled = node['@_enabled'] !== 'false';

    // Meaningful label
    const label = text || contentDesc || cleanResourceId(resId);

    // Filter criteria: Skip invisible / zero-sized nodes and pure layout containers with no interaction or text
    const hasDimensions = bounds && bounds.width > 0 && bounds.height > 0;
    const isInteractive = clickable || checkable || scrollable || focusable || className.includes('EditText');
    const isMeaningfulText = text.length > 0 || contentDesc.length > 0;

    // Filter out top-level screen containers that span entire screen with no action
    const isFullRootLayout =
      bounds && bounds.width >= screenWidth && bounds.height >= screenHeight && !clickable && !isMeaningfulText;

    if (hasDimensions && !isFullRootLayout && (isInteractive || isMeaningfulText)) {
      const id = ghostIdCounter++;
      const role = determineAndroidRole(className, clickable, checkable, scrollable, isPassword);
      const tagSuffix = className.split('.').pop()?.toLowerCase() || 'view';

      elements.push({
        id,
        role,
        tag: `android:${tagSuffix}`,
        label: label.slice(0, 140),
        value: className.includes('EditText') ? text : undefined,
        platform: 'android',
        bounds,
        resourceId: resId || undefined,
        clickable,
        focusable,
        scrollable,
        disabled: !enabled,
        checked: checkable ? checked : undefined,
      });
    }

    // Process children
    if (node.node) {
      if (Array.isArray(node.node)) {
        for (const child of node.node) {
          traverseNode(child);
        }
      } else {
        traverseNode(node.node);
      }
    }
  }

  // Find root hierarchy
  const hierarchy = parsed?.hierarchy || parsed;
  if (hierarchy) {
    if (hierarchy.node) {
      if (Array.isArray(hierarchy.node)) {
        for (const child of hierarchy.node) {
          traverseNode(child);
        }
      } else {
        traverseNode(hierarchy.node);
      }
    }
  }

  // Generate compact numbered Markdown
  let markdown = `### Android Screen: ${detectedPackage}\n`;
  markdown += `Screen: ${screenWidth}x${screenHeight} | Interactive Elements: ${elements.length}\n\n`;

  for (const item of elements) {
    let line = `[${item.id}] <${item.tag}>`;
    if (item.label) {
      line += ` "${item.label}"`;
    }
    if (item.resourceId) {
      line += ` [id: "${cleanResourceId(item.resourceId)}"]`;
    }
    if (item.value !== undefined && item.value !== '') {
      line += ` [value: "${item.value}"]`;
    }
    if (item.checked !== undefined) {
      line += item.checked ? ' [checked]' : ' [unchecked]';
    }
    if (item.disabled) {
      line += ' [disabled]';
    }
    line += ` @(${item.bounds.centerX},${item.bounds.centerY})`;
    markdown += `${line}\n`;
  }

  const rawBytes = new TextEncoder().encode(xmlContent).length;
  const distilledBytes = new TextEncoder().encode(markdown).length;
  const rawTokens = estimateTokens(xmlContent);
  const distilledTokens = estimateTokens(markdown);
  const reduction =
    xmlContent.length > 0
      ? Math.max(0, Math.round(((xmlContent.length - markdown.length) / xmlContent.length) * 100))
      : 0;

  return {
    platform: 'android',
    context: {
      urlOrPackage: detectedPackage,
      title: defaultActivity,
    },
    viewport: {
      width: screenWidth,
      height: screenHeight,
      devicePixelRatio: 1,
    },
    markdown,
    elements,
    stats: {
      rawByteCount: rawBytes,
      distilledByteCount: distilledBytes,
      rawEstimatedTokens: rawTokens,
      distilledEstimatedTokens: distilledTokens,
      tokenReductionPercentage: reduction,
      elementCount: elements.length,
      interactiveCount: elements.filter((e) => e.clickable || e.role === 'input').length,
      timestamp: Date.now(),
      distillationDurationMs: Date.now() - startTime,
    },
  };
}
