/**
 * GhostBridge DOM Distiller
 * Extracts interactive & semantic elements from Web DOM, strips 95%+ noise,
 * assigns sequential ghost IDs, and yields compact numbered Markdown.
 */

import {
  DistilledElement,
  DistilledState,
  ElementBounds,
  SemanticRole,
} from '../types/protocol.ts';

/**
 * Estimates token count using standard ~3.8 chars/token heuristic.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 3.8));
}

/**
 * Client-side script injected into the page or executed in DOM environment.
 * Can be serialized and run inside Playwright via page.evaluate().
 */
export const DOM_DISTILLATION_SCRIPT = `
(function distillDOM() {
  const startTime = performance.now();
  const rawHtml = document.documentElement.outerHTML;
  const elements = [];
  let ghostIdCounter = 1;

  const INTERACTIVE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'DETAILS', 'SUMMARY']);
  const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'listbox',
    'option', 'menuitem', 'tab', 'switch', 'searchbox', 'slider'
  ]);
  const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

  function isVisible(el, style, rect) {
    if (!style) return false;
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (rect.width <= 0 || rect.height <= 0) return false;
    // Check if within reasonable screen / scroll boundaries
    if (rect.bottom < -200 || rect.top > window.innerHeight + 1500) return false;
    return true;
  }

  function getCleanText(el) {
    // Prioritize direct label or aria
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();

    // Check inner text
    let text = el.innerText || el.textContent || '';
    text = text.replace(/\\s+/g, ' ').trim();

    // If input button/submit
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
      if (el.value) return el.value.trim();
    }

    if (text) {
      return text.slice(0, 140);
    }

    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();

    const alt = el.getAttribute('alt');
    if (alt && alt.trim()) return alt.trim();

    // If container <a> or <button> has no direct text, check if it wraps a child with title/alt (e.g. <a id="up_..."><div class="votearrow" title="upvote">)
    if (el.tagName === 'A' || el.tagName === 'BUTTON') {
      const childWithTitle = el.querySelector('[title], [alt], [aria-label]');
      if (childWithTitle) {
        const childLabel = childWithTitle.getAttribute('title') || childWithTitle.getAttribute('aria-label') || childWithTitle.getAttribute('alt');
        if (childLabel && childLabel.trim()) return childLabel.trim();
      }
    }

    // Rule B (Fallback label for inputs & links): fall back to name, title, or id
    const name = el.getAttribute('name');
    if (name && name.trim()) return name.trim();

    const id = el.getAttribute('id');
    if (id && id.trim() && !id.startsWith('data-') && id.length < 32) {
      return id.trim();
    }

    return '';
  }

  function determineRole(el, tag, roleAttr) {
    if (roleAttr && INTERACTIVE_ROLES.has(roleAttr)) {
      if (roleAttr === 'textbox') return 'input';
      return roleAttr;
    }
    if (tag === 'BUTTON') return 'button';
    if (tag === 'A' && el.hasAttribute('href')) return 'link';
    if (tag === 'INPUT') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'button' || type === 'submit') return 'button';
      return 'input';
    }
    if (tag === 'TEXTAREA') return 'input';
    if (tag === 'SELECT') return 'select';
    if (tag === 'OPTION') return 'option';
    if (HEADING_TAGS.has(tag)) return 'heading';
    if (tag === 'IMG') return 'image';
    return 'text';
  }

  function generateSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const ghostId = el.getAttribute('data-ghost-id');
    if (ghostId) return '[data-ghost-id="' + ghostId + '"]';

    const testId = el.getAttribute('data-testid') || el.getAttribute('data-test');
    if (testId) return '[' + (el.hasAttribute('data-testid') ? 'data-testid' : 'data-test') + '="' + CSS.escape(testId) + '"]';

    const tag = el.tagName.toLowerCase();
    const name = el.getAttribute('name');
    if (name) return tag + '[name="' + CSS.escape(name) + '"]';

    const role = el.getAttribute('role');
    if (role) return tag + '[role="' + CSS.escape(role) + '"]';

    // Fallback: parent path index
    let path = tag;
    let parent = el.parentElement;
    if (parent) {
      const index = Array.from(parent.children).indexOf(el) + 1;
      path = parent.tagName.toLowerCase() + ' > ' + tag + ':nth-child(' + index + ')';
    }
    return path;
  }

  const walker = document.createTreeWalker(
    document.body || document.documentElement,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        const tag = node.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'SVG' || tag === 'IFRAME') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    const el = currentNode;
    const tag = el.tagName;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    if (isVisible(el, style, rect)) {
      // Rule A (Skip duplicate child spans): If an element is a <span>, <u>, or <div> whose trimmed text is identical to its parent <a ...> or <button> text, skip it
      const parent = el.parentElement;
      if (parent && (parent.tagName === 'A' || parent.tagName === 'BUTTON' || parent.getAttribute('role') === 'button' || parent.getAttribute('role') === 'link')) {
        const myText = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
        const parentText = (parent.innerText || parent.textContent || '').replace(/\\s+/g, ' ').trim();
        if (myText && myText === parentText) {
          currentNode = walker.nextNode();
          continue;
        }
        // Also skip child icon/div if parent <a> was already assigned its title/label
        const childTitle = el.getAttribute('title') || el.getAttribute('aria-label') || el.getAttribute('alt');
        const parentLabel = getCleanText(parent);
        if (childTitle && parentLabel && childTitle.trim() === parentLabel.trim()) {
          currentNode = walker.nextNode();
          continue;
        }
      }

      const roleAttr = el.getAttribute('role');
      const isClickable =
        (tag === 'A' ? el.hasAttribute('href') || el.hasAttribute('onclick') : INTERACTIVE_TAGS.has(tag)) ||
        INTERACTIVE_ROLES.has(roleAttr) ||
        el.hasAttribute('onclick') ||
        el.getAttribute('cursor') === 'pointer' ||
        style.cursor === 'pointer';
      
      const isHeading = HEADING_TAGS.has(tag);
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const cleanText = getCleanText(el);

      // Rule C (Drop empty unlabeled anchors & elements): If a tag has zero label after checking all attributes, skip tagging it unless it's an <input> or <textarea>
      if (!cleanText && !isInput) {
        currentNode = walker.nextNode();
        continue;
      }

      // Only distill if it's interactive OR a semantic header/status with text
      const shouldInclude = isClickable || isInput || (isHeading && cleanText.length > 0);

      // Avoid duplicate ancestor wrapping (e.g., button containing a span: tag the button, not inner span)
      if (shouldInclude) {
        const id = ghostIdCounter++;
        el.setAttribute('data-ghost-id', String(id));

        const role = determineRole(el, tag, roleAttr);
        let value = undefined;
        let checked = undefined;

        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          value = el.value || '';
          if (el.type === 'checkbox' || el.type === 'radio') {
            checked = !!el.checked;
          }
        } else if (tag === 'SELECT') {
          value = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : '';
        }

        elements.push({
          id,
          role,
          tag: tag.toLowerCase() + (el.getAttribute('type') ? ':' + el.getAttribute('type') : ''),
          label: cleanText,
          value,
          placeholder: el.getAttribute('placeholder') || undefined,
          platform: 'web',
          bounds: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            centerX: Math.round(rect.left + rect.width / 2),
            centerY: Math.round(rect.top + rect.height / 2),
          },
          selector: generateSelector(el),
          clickable: isClickable,
          focusable: el.tabIndex >= 0 || isInput || isClickable,
          scrollable: style.overflowY === 'auto' || style.overflowY === 'scroll',
          disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
          checked,
        });
      }
    }
    currentNode = walker.nextNode();
  }

  // Generate numbered Markdown tree
  let markdown = '### Web Viewport: ' + (document.title || 'Untitled') + ' (' + window.location.href + ')\\n';
  markdown += 'Screen: ' + window.innerWidth + 'x' + window.innerHeight + ' | Interactive Elements: ' + elements.length + '\\n\\n';

  elements.forEach(item => {
    let line = '[' + item.id + '] <' + item.tag + '>';
    if (item.label) {
      line += ' "' + item.label + '"';
    }
    if (item.placeholder) {
      line += ' [placeholder: "' + item.placeholder + '"]';
    }
    if (item.value !== undefined && item.value !== '') {
      line += ' [value: "' + item.value + '"]';
    }
    if (item.checked !== undefined) {
      line += item.checked ? ' [checked]' : ' [unchecked]';
    }
    if (item.disabled) {
      line += ' [disabled]';
    }
    markdown += line + '\\n';
  });

  const durationMs = performance.now() - startTime;
  const rawBytes = new Blob([rawHtml]).size;
  const distilledBytes = new Blob([markdown]).size;

  return {
    platform: 'web',
    context: {
      urlOrPackage: window.location.href,
      title: document.title || 'Untitled Web Page',
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    markdown,
    elements,
    stats: {
      rawByteCount: rawBytes,
      distilledByteCount: distilledBytes,
      rawEstimatedTokens: Math.ceil(rawHtml.length / 3.8),
      distilledEstimatedTokens: Math.ceil(markdown.length / 3.8),
      tokenReductionPercentage: Math.max(0, Math.round(((rawHtml.length - markdown.length) / rawHtml.length) * 100)),
      elementCount: elements.length,
      interactiveCount: elements.filter(e => e.clickable || e.role === 'input').length,
      timestamp: Date.now(),
      distillationDurationMs: Math.round(durationMs),
    }
  };
})();
`;

/**
 * Pure TypeScript fallback DOM distiller for Node/SSR/testing or parsing raw HTML.
 * Uses lightweight regex & DOM simulation to parse HTML strings without full browser.
 */
export function distillHtmlString(
  html: string,
  url = 'https://example.com',
  title = 'Simulated Web Page',
  viewport = { width: 1280, height: 800 }
): DistilledState {
  const startTime = Date.now();
  const elements: DistilledElement[] = [];
  let ghostIdCounter = 1;

  // Match all individual interactive elements and headings directly
  const elementRegex =
    /<(button|a|input|textarea|select|h[1-6])\b([^>]*)(?:>(.*?)<\/\1>|\/?>)/gis;

  let match: RegExpExecArray | null;
  while ((match = elementRegex.exec(html)) !== null) {
    const rawTag = (match[1] || '').toLowerCase();
    const attrs = match[2] || '';
    const innerContent = match[3] || '';

    // Check if tag is interactive or semantic
    const isInteractive =
      rawTag === 'button' ||
      (rawTag === 'a' && (attrs.includes('href') || attrs.includes('onclick'))) ||
      rawTag === 'input' ||
      rawTag === 'textarea' ||
      rawTag === 'select';

    const isHeading = rawTag.startsWith('h') && rawTag.length === 2;

    if (!isInteractive && !isHeading) continue;

    // Extract attributes
    const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : rawTag === 'input' ? 'text' : '';
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    const nameMatch = attrs.match(/name=["']([^"']+)["']/i);
    const titleMatch = attrs.match(/title=["']([^"']+)["']/i);
    const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
    const placeholderMatch = attrs.match(/placeholder=["']([^"']+)["']/i);
    const valueMatch = attrs.match(/value=["']([^"']+)["']/i);
    const ariaLabelMatch = attrs.match(/aria-label=["']([^"']+)["']/i);
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    const checked = attrs.includes('checked');
    const disabled = attrs.includes('disabled');

    // Check if inner content has a child element with title, alt, or aria-label (e.g. <div class="votearrow" title="upvote">)
    const childTitleMatch = innerContent.match(/title=["']([^"']+)["']/i);
    const childAltMatch = innerContent.match(/alt=["']([^"']+)["']/i);
    const childAriaMatch = innerContent.match(/aria-label=["']([^"']+)["']/i);

    // Clean inner text
    const textOnly = innerContent.replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();

    // Rule B (Fallback label for inputs & links): fall back to name, title, or id
    let cleanText = (
      ariaLabelMatch?.[1] ||
      placeholderMatch?.[1] ||
      textOnly ||
      childTitleMatch?.[1] ||
      childAltMatch?.[1] ||
      childAriaMatch?.[1] ||
      titleMatch?.[1] ||
      altMatch?.[1] ||
      nameMatch?.[1] ||
      (idMatch && !idMatch[1].startsWith('data-') && idMatch[1].length < 32 ? idMatch[1] : '')
    ).slice(0, 120);

    const isInput = rawTag === 'input' || rawTag === 'textarea' || rawTag === 'select';

    // Rule C (Drop empty unlabeled anchors & elements): If a tag has zero label after checking all attributes, skip tagging it unless it's an <input> or <textarea>
    if (!cleanText && !isInput) {
      continue;
    }

    // For unlabeled inputs, fall back to name, type, or tag
    if (!cleanText && isInput) {
      cleanText = nameMatch?.[1] || (type ? `input[${type}]` : rawTag);
    }

    // Rule A (Skip duplicate child tags / links with identical text)
    if (elements.length > 0) {
      const prev = elements[elements.length - 1];
      if (prev.label && cleanText && prev.label === cleanText && (prev.role === 'link' || prev.role === 'button')) {
        continue;
      }
    }

    const id = ghostIdCounter++;
    const role: SemanticRole =
      rawTag === 'button'
        ? 'button'
        : rawTag === 'a'
        ? 'link'
        : rawTag === 'input'
        ? type === 'checkbox'
          ? 'checkbox'
          : type === 'radio'
          ? 'radio'
          : 'input'
        : isHeading
        ? 'heading'
        : 'button';

    const simulatedY = 60 + id * 45;
    const bounds: ElementBounds = {
      x: 40,
      y: simulatedY,
      width: Math.min(320, 40 + cleanText.length * 10),
      height: 38,
      centerX: 40 + Math.min(160, 20 + cleanText.length * 5),
      centerY: simulatedY + 19,
    };

    elements.push({
      id,
      role,
      tag: rawTag + (type ? `:${type}` : ''),
      label: cleanText || (hrefMatch ? hrefMatch[1] : rawTag),
      placeholder: placeholderMatch ? placeholderMatch[1] : undefined,
      value: valueMatch ? valueMatch[1] : undefined,
      checked: type === 'checkbox' || type === 'radio' ? checked : undefined,
      disabled,
      platform: 'web',
      bounds,
      selector: idMatch ? `#${idMatch[1]}` : `[data-ghost-id="${id}"]`,
      clickable: isInteractive,
      focusable: isInteractive,
      scrollable: false,
    });
  }

  // Format into Markdown
  let markdown = `### Web Viewport: ${title} (${url})\n`;
  markdown += `Screen: ${viewport.width}x${viewport.height} | Interactive Elements: ${elements.length}\n\n`;

  for (const item of elements) {
    let line = `[${item.id}] <${item.tag}>`;
    if (item.label) line += ` "${item.label}"`;
    if (item.placeholder) line += ` [placeholder: "${item.placeholder}"]`;
    if (item.value) line += ` [value: "${item.value}"]`;
    if (item.checked !== undefined) line += item.checked ? ' [checked]' : ' [unchecked]';
    if (item.disabled) line += ' [disabled]';
    markdown += `${line}\n`;
  }

  const rawTokens = estimateTokens(html);
  const distilledTokens = estimateTokens(markdown);
  const reduction =
    html.length > 0
      ? Math.max(0, Math.round(((html.length - markdown.length) / html.length) * 100))
      : 0;

  return {
    platform: 'web',
    context: {
      urlOrPackage: url,
      title,
    },
    viewport: {
      width: viewport.width,
      height: viewport.height,
      devicePixelRatio: 1,
    },
    markdown,
    elements,
    stats: {
      rawByteCount: new TextEncoder().encode(html).length,
      distilledByteCount: new TextEncoder().encode(markdown).length,
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
