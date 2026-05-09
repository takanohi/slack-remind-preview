import { describe, expect, it } from 'vitest';
import {
  htmlToPlain,
  htmlToSlack,
  inlineLeadingBlock,
  linkifyBareURLs,
} from './slack-format';

describe('htmlToSlack', () => {
  describe('empty / plain', () => {
    it('returns empty string for empty input', () => {
      expect(htmlToSlack('')).toBe('');
    });

    it('preserves plain text', () => {
      expect(htmlToSlack('hello world')).toBe('hello world');
    });

    it('trims surrounding whitespace', () => {
      expect(htmlToSlack('  hello  ')).toBe('hello');
    });

    it('collapses internal horizontal whitespace', () => {
      expect(htmlToSlack('hello   world')).toBe('hello world');
    });
  });

  describe('inline formatting', () => {
    it('converts <strong> to *text*', () => {
      expect(htmlToSlack('<strong>bold</strong>')).toBe('*bold*');
    });

    it('converts <b> to *text*', () => {
      expect(htmlToSlack('<b>bold</b>')).toBe('*bold*');
    });

    it('converts <em> to _text_', () => {
      expect(htmlToSlack('<em>italic</em>')).toBe('_italic_');
    });

    it('converts <i> to _text_', () => {
      expect(htmlToSlack('<i>italic</i>')).toBe('_italic_');
    });

    it('converts <s>/<del> to ~text~', () => {
      expect(htmlToSlack('<s>strike</s>')).toBe('~strike~');
      expect(htmlToSlack('<del>strike</del>')).toBe('~strike~');
    });

    it('converts <code> to `text`', () => {
      expect(htmlToSlack('<code>foo()</code>')).toBe('`foo()`');
    });

    it('drops formatting tags with empty inner content', () => {
      expect(htmlToSlack('<strong></strong>text')).toBe('text');
    });
  });

  describe('links (defensive: editor no longer produces <a>)', () => {
    it('unwraps <a> to its inner text and drops the href', () => {
      expect(htmlToSlack('<a href="https://example.com">docs</a>')).toBe(
        'docs',
      );
    });

    it('emits a bare URL for an <a> whose text equals its href', () => {
      expect(
        htmlToSlack('<a href="https://example.com">https://example.com</a>'),
      ).toBe('https://example.com');
    });
  });

  describe('line breaks', () => {
    it('converts <br> to \\n', () => {
      expect(htmlToSlack('line1<br>line2')).toBe('line1\nline2');
    });

    it('converts text + <div> structure (Chrome editor)', () => {
      expect(htmlToSlack('first line<div>second line</div>')).toBe(
        'first line\nsecond line',
      );
    });

    it('converts multiple <div> blocks', () => {
      expect(htmlToSlack('<div>line1</div><div>line2</div>')).toBe(
        'line1\nline2',
      );
    });

    it('handles nested <br> within <div>', () => {
      expect(
        htmlToSlack('<div>line1<br>line2</div><div>line3</div>'),
      ).toBe('line1\nline2\nline3');
    });

    it('collapses consecutive newlines from empty divs', () => {
      expect(htmlToSlack('<div>a</div><div></div><div>b</div>')).toBe('a\nb');
    });

    it('trims leading and trailing newlines', () => {
      expect(htmlToSlack('<div>only</div>')).toBe('only');
    });

    it('handles <p> elements like <div>', () => {
      expect(htmlToSlack('<p>line1</p><p>line2</p>')).toBe('line1\nline2');
    });
  });

  describe('combinations', () => {
    it('combines bold and italic across lines', () => {
      expect(
        htmlToSlack('<strong>hello</strong> <em>world</em><br>line2'),
      ).toBe('*hello* _world_\nline2');
    });

    it('keeps surrounding text when an <a> is unwrapped', () => {
      expect(
        htmlToSlack(
          'see <a href="https://example.com">docs</a> for more',
        ),
      ).toBe('see docs for more');
    });
  });
});

describe('inlineLeadingBlock', () => {
  it('returns empty for empty input', () => {
    expect(inlineLeadingBlock('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(inlineLeadingBlock('hello')).toBe('hello');
  });

  it('unwraps a leading <div> and inserts <br> to keep the line break', () => {
    expect(inlineLeadingBlock('<div>line1</div><div>line2</div>')).toBe(
      'line1<br><div>line2</div>',
    );
  });

  it('unwraps a leading <p> and inserts <br>', () => {
    expect(inlineLeadingBlock('<p>line1</p><p>line2</p>')).toBe(
      'line1<br><p>line2</p>',
    );
  });

  it('does not add <br> when the leading block is the only content', () => {
    expect(inlineLeadingBlock('<div>only</div>')).toBe('only');
  });

  it('handles leading <div> followed by a bare text node', () => {
    // Reproduces the case where the user types a line, then inserts a new
    // line at the very top: <div>top</div>aaaa would otherwise collapse to
    // 'topaaaa' without the <br> insertion.
    expect(inlineLeadingBlock('<div>hee</div>aaaa')).toBe('hee<br>aaaa');
  });

  it('keeps text + <div> structure (no leading block)', () => {
    expect(inlineLeadingBlock('text<div>more</div>')).toBe('text<div>more</div>');
  });

  it('preserves inline formatting inside the leading block', () => {
    expect(
      inlineLeadingBlock('<div><strong>bold</strong></div><div>plain</div>'),
    ).toBe('<strong>bold</strong><br><div>plain</div>');
  });

  it('preserves <br> inside the leading block', () => {
    expect(inlineLeadingBlock('<div>line1<br>line2</div><div>line3</div>')).toBe(
      'line1<br>line2<br><div>line3</div>',
    );
  });
});

describe('linkifyBareURLs', () => {
  it('returns empty for empty input', () => {
    expect(linkifyBareURLs('')).toBe('');
  });

  it('leaves text without URLs unchanged', () => {
    expect(linkifyBareURLs('hello world')).toBe('hello world');
  });

  it('wraps a bare https URL in an anchor that opens in a new tab', () => {
    expect(linkifyBareURLs('https://example.com')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>',
    );
  });

  it('wraps non-http schemes with :// (ftp, ssh, custom)', () => {
    expect(linkifyBareURLs('ftp://files.example.com')).toContain(
      'href="ftp://files.example.com"',
    );
    expect(linkifyBareURLs('ssh://user@host')).toContain(
      'href="ssh://user@host"',
    );
    expect(linkifyBareURLs('myapp://open?id=42')).toContain(
      'href="myapp://open?id=42"',
    );
  });

  it('does not match a bare scheme with no authority', () => {
    expect(linkifyBareURLs('use https:// as a prefix')).toBe(
      'use https:// as a prefix',
    );
  });

  it('wraps a URL embedded in a sentence', () => {
    expect(linkifyBareURLs('see https://example.com for more')).toBe(
      'see <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a> for more',
    );
  });

  it('strips trailing sentence punctuation from the href', () => {
    expect(linkifyBareURLs('visit https://example.com.')).toBe(
      'visit <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>.',
    );
  });

  it('handles multiple URLs in one text node', () => {
    const out = linkifyBareURLs('a https://a.example b https://b.example');
    expect(out).toContain('href="https://a.example"');
    expect(out).toContain('href="https://b.example"');
    expect(out.match(/<a /g)).toHaveLength(2);
  });

  it('preserves URLs with paths and query strings', () => {
    expect(
      linkifyBareURLs('https://example.com/path/to?x=1&y=2'),
    ).toContain('href="https://example.com/path/to?x=1&amp;y=2"');
  });

  it('does not linkify URLs inside <code>', () => {
    expect(linkifyBareURLs('<code>https://example.com</code>')).toBe(
      '<code>https://example.com</code>',
    );
  });

  it('does not double-wrap URLs already inside <a>', () => {
    const html =
      '<a href="https://example.com">https://example.com</a>';
    expect(linkifyBareURLs(html)).toBe(html);
  });

  it('linkifies inside formatting tags like <strong>', () => {
    expect(linkifyBareURLs('<strong>https://example.com</strong>')).toBe(
      '<strong><a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a></strong>',
    );
  });
});

describe('htmlToPlain', () => {
  it('returns empty for empty input', () => {
    expect(htmlToPlain('')).toBe('');
  });

  it('strips inline tags', () => {
    expect(htmlToPlain('<strong>hello</strong>')).toBe('hello');
  });

  it('strips link tags but keeps text', () => {
    expect(htmlToPlain('<a href="https://example.com">docs</a>')).toBe('docs');
  });

  it('preserves text content across blocks', () => {
    expect(htmlToPlain('<div>line1</div><div>line2</div>')).toMatch(
      /line1.*line2/,
    );
  });

  it('trims whitespace', () => {
    expect(htmlToPlain('  hello  ')).toBe('hello');
  });
});
