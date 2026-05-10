import { describe, expect, it } from 'vitest';
import {
  buildCommandClipboardData,
  buildCommandPreviewHTML,
  CHROMIUM_WEB_CUSTOM_DATA_MIME,
} from './slack-clipboard';

describe('CHROMIUM_WEB_CUSTOM_DATA_MIME', () => {
  it('matches the Chromium custom clipboard type used by Slack', () => {
    expect(CHROMIUM_WEB_CUSTOM_DATA_MIME).toBe('org.chromium.web-custom-data');
  });
});

describe('buildCommandClipboardData', () => {
  it('builds plain text, html, and custom ops for a labelled link', () => {
    const data = buildCommandClipboardData({
      target: 'me',
      whatHTML:
        'this is <a href="https://github.com/takanohi/slack-remind-preview">link</a> desu',
      when: 'tomorrow',
    });

    expect(data.text).toBe('/remind me this is link desu tomorrow');
    expect(data.html).toContain('/remind me this is ');
    expect(data.html).toContain(
      '<a href="https://github.com/takanohi/slack-remind-preview" target="_blank" rel="noopener noreferrer">link</a>',
    );
    expect(data.webCustomData).toEqual({
      ops: [
        { insert: '/remind me this is ' },
        {
          insert: 'link',
          attributes: {
            link: 'https://github.com/takanohi/slack-remind-preview',
          },
        },
        { insert: ' desu tomorrow' },
      ],
    });
  });

  it('keeps slack markdown markers around linked text', () => {
    const data = buildCommandClipboardData({
      target: '#general',
      whatHTML:
        '<strong>read</strong> <a href="https://example.com"><em>docs</em></a>',
      when: 'every day at 9am',
    });

    expect(data.text).toBe('/remind #general *read* _docs_ every day at 9am');
    expect(data.webCustomData.ops).toEqual([
      { insert: '/remind #general *read* ' },
      {
        insert: '_docs_',
        attributes: {
          link: 'https://example.com',
        },
      },
      { insert: ' every day at 9am' },
    ]);
  });

  it('does not insert a stray leading space when the body ends with a newline', () => {
    const data = buildCommandClipboardData({
      target: '#aaa',
      whatHTML: 'reminder<div>hello<br></div>',
      when: 'in 30 minutes',
    });

    expect(data.text).toBe('/remind #aaa reminder\nhello in 30 minutes');
    expect(data.webCustomData.ops).toEqual([
      { insert: '/remind #aaa reminder\nhello in 30 minutes' },
    ]);
  });
});

describe('buildCommandPreviewHTML', () => {
  it('renders formatted editor html as wysiwyg in the command preview', () => {
    const html = buildCommandPreviewHTML({
      target: 'me',
      whatHTML:
        '<strong>bold</strong> <code>code()</code> <a href="https://example.com">docs</a>',
      when: 'tomorrow',
    });

    expect(html).toContain('<span class="font-medium text-gray-700">/remind</span> me');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code()</code>');
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">docs</a>',
    );
    expect(html).toContain(' tomorrow');
  });

  it('does not render a leading space before when after a trailing line break', () => {
    const html = buildCommandPreviewHTML({
      target: '#aaa',
      whatHTML: 'reminder<div>hello<br></div>',
      when: 'in 30 minutes',
    });

    expect(html).toContain('reminder<br>hello<br></span>in 30 minutes');
    expect(html).not.toContain('</span> in 30 minutes');
  });
});
