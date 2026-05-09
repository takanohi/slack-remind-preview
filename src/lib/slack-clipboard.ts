import {
  SAFE_HREF_RE,
  inlineLeadingBlock,
  linkifyBareURLs,
  sanitizePreviewHTML,
} from './slack-format';

export const CHROMIUM_WEB_CUSTOM_DATA_MIME = 'org.chromium.web-custom-data';

export interface SlackClipboardOp {
  insert: string;
  attributes?: {
    link?: string;
  };
}

export interface ChromiumWebCustomData {
  ops: SlackClipboardOp[];
}

interface BuildClipboardDataParams {
  target: string;
  whatHTML: string;
  when: string;
}

export interface CommandClipboardData {
  text: string;
  html: string;
  webCustomData: ChromiumWebCustomData;
}

interface BuildCommandPreviewHTMLParams {
  target: string;
  whatHTML: string;
  when: string;
}

export function buildCommandClipboardData({
  target,
  whatHTML,
  when,
}: BuildClipboardDataParams): CommandClipboardData {
  const prefix = ['/remind', target.trim()].filter(Boolean).join(' ');
  const bodyOps = normalizeOps(walkOps(parseHTML(whatHTML).body));
  const suffix = when.trim();
  const ops = mergeAdjacentOps([
    { insert: `${prefix} ` },
    ...bodyOps,
    ...(suffix ? [{ insert: ` ${suffix}` }] : []),
  ]);

  return {
    text: opsToText(ops),
    html: opsToHTML(ops),
    webCustomData: { ops },
  };
}

export function buildCommandPreviewHTML({
  target,
  whatHTML,
  when,
}: BuildCommandPreviewHTMLParams): string {
  const parts: string[] = ['<span class="font-medium text-gray-700">/remind</span>'];

  const trimmedTarget = target.trim();
  if (trimmedTarget) {
    parts.push(` ${renderPreviewTarget(trimmedTarget)}`);
  }

  const bodyHTML = linkifyBareURLs(
    inlineLeadingBlock(sanitizePreviewHTML(whatHTML)),
  ).trim();
  if (bodyHTML) {
    parts.push(` <span class="whitespace-pre-wrap break-words">${bodyHTML}</span>`);
  }

  const trimmedWhen = when.trim();
  if (trimmedWhen) {
    parts.push(` ${escapeHTML(trimmedWhen)}`);
  }

  return parts.join('');
}

function renderPreviewTarget(target: string): string {
  if (!target.startsWith('#')) {
    return escapeHTML(target);
  }

  return `<span class="rounded bg-slack-link/10 px-1 font-medium text-slack-link">${escapeHTML(target)}</span>`;
}

function parseHTML(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function walkOps(node: Node): SlackClipboardOp[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ? [{ insert: node.textContent }] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const el = node as HTMLElement;
  const childOps = Array.from(el.childNodes).flatMap(walkOps);

  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      return wrapInline('*', childOps);
    case 'EM':
    case 'I':
      return wrapInline('_', childOps);
    case 'S':
    case 'STRIKE':
    case 'DEL':
      return wrapInline('~', childOps);
    case 'CODE':
      return wrapInline('`', childOps);
    case 'BR':
      return [{ insert: '\n' }];
    case 'DIV':
    case 'P':
      return [{ insert: '\n' }, ...childOps, { insert: '\n' }];
    case 'A': {
      const href = el.getAttribute('href');
      if (!href || !SAFE_HREF_RE.test(href)) {
        return childOps;
      }
      const insert = opsToText(childOps);
      return insert ? [{ insert, attributes: { link: href } }] : [];
    }
    default:
      return childOps;
  }
}

function wrapInline(marker: string, ops: SlackClipboardOp[]): SlackClipboardOp[] {
  if (ops.length === 0) return [];
  return [{ insert: marker }, ...ops, { insert: marker }];
}

function normalizeOps(ops: SlackClipboardOp[]): SlackClipboardOp[] {
  const chars = ops.flatMap((op) =>
    Array.from(op.insert).map((char) => ({ char, link: op.attributes?.link })),
  );
  const collapsedHorizontal: typeof chars = [];

  for (const current of chars) {
    const previous = collapsedHorizontal.at(-1);
    const isHorizontal = current.char === ' ' || current.char === '\t';
    const previousHorizontal = previous?.char === ' ' || previous?.char === '\t';
    if (isHorizontal && previousHorizontal) {
      continue;
    }
    collapsedHorizontal.push({
      char: isHorizontal ? ' ' : current.char,
      link: current.link,
    });
  }

  const trimmedAroundNewlines: typeof chars = [];
  for (const current of collapsedHorizontal) {
    const previous = trimmedAroundNewlines.at(-1);
    if (current.char === '\n' && previous?.char === ' ') {
      trimmedAroundNewlines.pop();
    }
    if (current.char === ' ' && previous?.char === '\n') {
      continue;
    }
    trimmedAroundNewlines.push(current);
  }

  const collapsedNewlines: typeof chars = [];
  for (const current of trimmedAroundNewlines) {
    if (current.char === '\n' && collapsedNewlines.at(-1)?.char === '\n') {
      continue;
    }
    collapsedNewlines.push(current);
  }

  while (
    collapsedNewlines[0] &&
    (collapsedNewlines[0].char === ' ' || collapsedNewlines[0].char === '\n')
  ) {
    collapsedNewlines.shift();
  }
  while (
    collapsedNewlines.at(-1) &&
    (collapsedNewlines.at(-1)!.char === ' ' ||
      collapsedNewlines.at(-1)!.char === '\n')
  ) {
    collapsedNewlines.pop();
  }

  return charsToOps(collapsedNewlines);
}

function charsToOps(chars: { char: string; link?: string }[]): SlackClipboardOp[] {
  const ops: SlackClipboardOp[] = [];

  for (const current of chars) {
    const previous = ops.at(-1);
    const previousLink = previous?.attributes?.link;
    if (
      previous &&
      previousLink === current.link &&
      Boolean(previousLink) === Boolean(current.link)
    ) {
      previous.insert += current.char;
      continue;
    }
    ops.push(
      current.link
        ? { insert: current.char, attributes: { link: current.link } }
        : { insert: current.char },
    );
  }

  return ops;
}

function mergeAdjacentOps(ops: SlackClipboardOp[]): SlackClipboardOp[] {
  const merged: SlackClipboardOp[] = [];

  for (const current of ops) {
    const previous = merged.at(-1);
    const previousLink = previous?.attributes?.link;
    const currentLink = current.attributes?.link;
    if (previousLink === currentLink && Boolean(previousLink) === Boolean(currentLink)) {
      if (previous) {
        previous.insert += current.insert;
        continue;
      }
    }
    merged.push(
      currentLink
        ? { insert: current.insert, attributes: { link: currentLink } }
        : { insert: current.insert },
    );
  }

  return merged;
}

function opsToText(ops: SlackClipboardOp[]): string {
  return ops.map((op) => op.insert).join('');
}

function opsToHTML(ops: SlackClipboardOp[]): string {
  return ops
    .map((op) => {
      const text = escapeHTML(op.insert).replace(/\n/g, '<br>');
      if (!op.attributes?.link) {
        return text;
      }
      return `<a href="${escapeAttribute(op.attributes.link)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    })
    .join('');
}

function escapeHTML(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttribute(text: string): string {
  return escapeHTML(text).replaceAll("'", '&#39;');
}
