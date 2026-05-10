/**
 * Convert HTML produced by the rich-text editor into Slack-flavored markdown
 * for embedding in a /remind command.
 *
 * Slack inline syntax:
 *   *text*       bold
 *   _text_       italic
 *   ~text~       strikethrough
 *   `text`       inline code
 *
 * Links are intentionally not formatted: Slack's `/remind` parser URL-encodes
 * the `|` in `<URL|text>`, so we emit URLs as bare text and let users embed
 * or relabel them inside Slack after the reminder fires.
 */
export function htmlToSlack(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return walk(doc.body)
    .replace(/[ \t]+/g, ' ') // collapse horizontal whitespace, keep newlines
    .replace(/[ ]*\n[ ]*/g, '\n') // tidy spaces around newlines
    .replace(/\n{2,}/g, '\n') // collapse multiple newlines to one
    .trim();
}

/**
 * Reduce arbitrary editor HTML to the small subset the preview intentionally
 * supports before it reaches {@html}.
 */
export function sanitizePreviewHTML(html: string): string {
  if (!html) return '';
  const source = new DOMParser().parseFromString(html, 'text/html');
  const clean = document.implementation.createHTMLDocument('');

  for (const child of Array.from(source.body.childNodes)) {
    for (const safeChild of sanitizeNode(child, clean)) {
      clean.body.appendChild(safeChild);
    }
  }

  return clean.body.innerHTML;
}

/**
 * Reduce pasted/editor HTML to the safe subset this app intentionally supports.
 */
export function sanitizeEditorHTML(html: string): string {
  if (!html) return '';
  const source = new DOMParser().parseFromString(html, 'text/html');
  const clean = document.implementation.createHTMLDocument('');

  for (const child of Array.from(source.body.childNodes)) {
    for (const safeChild of sanitizeNode(child, clean, { preserveLinkAttrs: false })) {
      clean.body.appendChild(safeChild);
    }
  }

  return clean.body.innerHTML;
}

/**
 * Unwrap a leading block element (`<div>` / `<p>`) so its content renders
 * inline with preceding text. Browsers wrap multi-line contenteditable input
 * in block elements; without this, a label like "Reminder:" placed before
 * the editor HTML would be forced onto its own line.
 */
export function inlineLeadingBlock(html: string): string {
  if (!html) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  const first = body.firstChild;
  if (
    first &&
    first.nodeType === Node.ELEMENT_NODE &&
    ((first as HTMLElement).tagName === 'DIV' ||
      (first as HTMLElement).tagName === 'P')
  ) {
    const el = first as HTMLElement;
    const hasNextSibling = el.nextSibling !== null;
    while (el.firstChild) {
      body.insertBefore(el.firstChild, el);
    }
    // Preserve the line break the block element implied between its content
    // and what follows.
    if (hasNextSibling) {
      body.insertBefore(doc.createElement('br'), el);
    }
    body.removeChild(el);
  }
  return body.innerHTML;
}

/**
 * Unwrap top-level block elements (`<div>` / `<p>`) into inline content with
 * explicit `<br>` separators so the result can be embedded inside inline UI
 * without browsers reintroducing block layout.
 */
export function inlineBlockHTML(html: string): string {
  if (!html) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;

  for (const child of Array.from(body.childNodes)) {
    if (
      child.nodeType !== Node.ELEMENT_NODE ||
      (((child as HTMLElement).tagName !== 'DIV') &&
        (child as HTMLElement).tagName !== 'P')
    ) {
      continue;
    }

    const el = child as HTMLElement;
    const previousSibling = el.previousSibling;
    const hasNextSibling = el.nextSibling !== null;
    if (
      previousSibling &&
      !(
        previousSibling.nodeType === Node.ELEMENT_NODE &&
        (previousSibling as HTMLElement).tagName === 'BR'
      )
    ) {
      body.insertBefore(doc.createElement('br'), el);
    }
    while (el.firstChild) {
      body.insertBefore(el.firstChild, el);
    }
    if (hasNextSibling) {
      body.insertBefore(doc.createElement('br'), el);
    }
    body.removeChild(el);
  }

  return body.innerHTML;
}

/**
 * Wrap bare URLs found in text nodes with an anchor tag that opens in a new
 * tab. Any RFC 3986 scheme followed by `://` is recognized (`http`, `https`,
 * `ftp`, `ssh`, custom app deep links, …) so the preview matches Slack's
 * permissive auto-linking when the reminder fires.
 *
 * URLs inside `<a>` or `<code>` are skipped. Trailing sentence punctuation
 * (`.,;:!?`) is peeled off the matched URL so it stays with the surrounding
 * text rather than the `href`.
 */
export function linkifyBareURLs(html: string): string {
  if (!html) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  linkifyNode(doc.body);
  return doc.body.innerHTML;
}

const URL_RE = /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s<>"]+/g;
const TRAILING_PUNCT_RE = /[.,;:!?]+$/;
export const SAFE_HREF_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s<>"]+$/;
const SAFE_PREVIEW_TAGS = new Set([
  'A',
  'B',
  'BR',
  'CODE',
  'DEL',
  'DIV',
  'EM',
  'I',
  'P',
  'S',
  'STRIKE',
  'STRONG',
]);
const DROP_WITH_CONTENT_TAGS = new Set(['IFRAME', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG']);

function linkifyNode(node: Node): void {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = (node as HTMLElement).tagName;
    if (tag === 'A' || tag === 'CODE') return;
    Array.from(node.childNodes).forEach(linkifyNode);
    return;
  }
  if (node.nodeType !== Node.TEXT_NODE) return;
  const text = node.textContent ?? '';
  if (!text) return;
  const ownerDoc = node.ownerDocument;
  const parent = node.parentNode;
  if (!ownerDoc || !parent) return;

  const matches: { start: number; end: number; url: string }[] = [];
  for (const m of text.matchAll(URL_RE)) {
    if (m.index === undefined) continue;
    const trimmed = m[0].replace(TRAILING_PUNCT_RE, '');
    matches.push({
      start: m.index,
      end: m.index + trimmed.length,
      url: trimmed,
    });
  }
  if (matches.length === 0) return;

  let cursor = 0;
  const parts: Node[] = [];
  for (const m of matches) {
    if (m.start > cursor) {
      parts.push(ownerDoc.createTextNode(text.slice(cursor, m.start)));
    }
    const a = ownerDoc.createElement('a');
    a.setAttribute('href', m.url);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.textContent = m.url;
    parts.push(a);
    cursor = m.end;
  }
  if (cursor < text.length) {
    parts.push(ownerDoc.createTextNode(text.slice(cursor)));
  }
  for (const p of parts) parent.insertBefore(p, node);
  parent.removeChild(node);
}

function sanitizeNode(
  node: Node,
  ownerDoc: Document,
  options: { preserveLinkAttrs: boolean } = { preserveLinkAttrs: true },
): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [ownerDoc.createTextNode(node.textContent ?? '')];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as HTMLElement;
  const tag = el.tagName;
  if (DROP_WITH_CONTENT_TAGS.has(tag)) return [];
  const children = Array.from(el.childNodes).flatMap((child) =>
    sanitizeNode(child, ownerDoc),
  );

  if (!SAFE_PREVIEW_TAGS.has(tag)) return children;

  if (tag === 'BR') return [ownerDoc.createElement('br')];

  if (tag === 'A') {
    const href = el.getAttribute('href');
    if (!href || !SAFE_HREF_RE.test(href)) {
      return children;
    }
    const a = ownerDoc.createElement('a');
    a.setAttribute('href', href);
    if (options.preserveLinkAttrs) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    for (const child of children) a.appendChild(child);
    return [a];
  }

  const safeEl = ownerDoc.createElement(tag.toLowerCase());
  for (const child of children) safeEl.appendChild(child);
  return [safeEl];
}

/** Strip HTML to plain text — used for empty checks. */
export function htmlToPlain(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').trim();
}

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const inner = Array.from(el.childNodes).map(walk).join('');

  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      return inner ? `*${inner}*` : '';
    case 'EM':
    case 'I':
      return inner ? `_${inner}_` : '';
    case 'S':
    case 'STRIKE':
    case 'DEL':
      return inner ? `~${inner}~` : '';
    case 'CODE':
      return inner ? `\`${inner}\`` : '';
    case 'BR':
      return '\n';
    case 'P':
    case 'DIV':
      // Block boundary on both sides; post-processing collapses extras.
      return `\n${inner}\n`;
    default:
      return inner;
  }
}
