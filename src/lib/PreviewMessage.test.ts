import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PreviewMessage from './PreviewMessage.svelte';

describe('PreviewMessage', () => {
  it('sanitizes stored HTML before rendering the preview', () => {
    const { container } = render(PreviewMessage, {
      preview: {
        id: 'preview-1',
        whatHTML:
          '<strong onclick="alert(1)">hello</strong><script>alert(1)</script> https://example.com <a href="javascript:alert(2)">bad</a>',
        timestamp: new Date(2026, 4, 9, 15, 30, 0),
      },
    });

    expect(container.querySelector('script')).toBeNull();

    const strong = container.querySelector('strong');
    expect(strong?.textContent).toBe('hello');
    expect(strong?.getAttribute('onclick')).toBeNull();

    const anchors = Array.from(container.querySelectorAll('a'));
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.getAttribute('href')).toBe('https://example.com');
    expect(container.textContent).toContain('bad');
  });
});
