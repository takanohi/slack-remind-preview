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
