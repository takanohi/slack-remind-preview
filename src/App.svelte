<script lang="ts">
  import ComposePane from './lib/ComposePane.svelte';
  import ChannelChat from './lib/ChannelChat.svelte';
  import {
    buildCommandClipboardData,
    buildCommandPreviewHTML,
    CHROMIUM_WEB_CUSTOM_DATA_MIME,
  } from './lib/slack-clipboard';
  import { htmlToPlain, htmlToSlack } from './lib/slack-format';
  import { parseFiringDate } from './lib/parse-when';
  import type { Preview, Who } from './lib/types';

  let who = $state<Who>('channel');
  let channelName = $state('');
  let what = $state(''); // HTML from RichTextInput
  let when = $state('');
  let previews: Preview[] = $state([]);

  let whatPlain = $derived(htmlToPlain(what));
  let whatSlack = $derived(htmlToSlack(what));
  let target = $derived(
    who === 'me' ? 'me' : channelName.trim() ? `#${channelName.trim()}` : '',
  );
  let commandClipboardData = $derived(
    buildCommandClipboardData({
      target,
      whatHTML: what,
      when,
    }),
  );
  let commandPreviewHTML = $derived(
    buildCommandPreviewHTML({
      target,
      whatHTML: what,
      when,
    }),
  );

  let firingDate = $derived(parseFiringDate(when.trim()));

  let whoValid = $derived(who === 'me' || channelName.trim().length > 0);
  let whatValid = $derived(whatPlain.length > 0);
  let whenValid = $derived(firingDate !== null);

  let isComposable = $derived(whoValid && whatValid && whenValid);

  function addPreview(): void {
    if (!isComposable || !firingDate) return;
    previews.push({
      id: crypto.randomUUID(),
      whatHTML: what,
      timestamp: firingDate,
    });
  }

  let hasContent = $derived(
    whatSlack.length > 0 ||
      when.trim().length > 0 ||
      (who === 'channel' && channelName.trim().length > 0),
  );

  let copied = $state(false);
  let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

  async function copyCommand(): Promise<void> {
    if (!isComposable) return;

    try {
      await writeCommandToClipboard();
      showCopiedState();
    } catch {
      try {
        await navigator.clipboard.writeText(commandClipboardData.text);
        showCopiedState();
      } catch {
        // Clipboard API can fail in non-secure contexts; silently ignore.
      }
    }
  }

  async function writeCommandToClipboard(): Promise<void> {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard.write) {
      await navigator.clipboard.writeText(commandClipboardData.text);
      return;
    }

    try {
      await navigator.clipboard.write([buildClipboardItem(true)]);
    } catch {
      await navigator.clipboard.write([buildClipboardItem(false)]);
    }
  }

  function buildClipboardItem(includeCustomData: boolean): ClipboardItem {
    const data: Record<string, Blob> = {
      'text/plain': new Blob([commandClipboardData.text], { type: 'text/plain' }),
      'text/html': new Blob([commandClipboardData.html], { type: 'text/html' }),
    };

    if (includeCustomData) {
      data[CHROMIUM_WEB_CUSTOM_DATA_MIME] = new Blob(
        [JSON.stringify(commandClipboardData.webCustomData)],
        { type: CHROMIUM_WEB_CUSTOM_DATA_MIME },
      );
    }

    return new ClipboardItem(data);
  }

  function showCopiedState(): void {
    copied = true;
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => (copied = false), 1500);
  }

  // Keyboard shortcuts: ⌘/Ctrl + Enter sends, ⌘/Ctrl + Shift + Enter copies.
  $effect(() => {
    function onKeydown(e: KeyboardEvent): void {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return;
      e.preventDefault();
      if (e.shiftKey) {
        copyCommand();
      } else if (isComposable) {
        addPreview();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="flex h-screen flex-col overflow-hidden bg-slack-cream text-gray-900 lg:flex-row">
  <ComposePane
    bind:who
    bind:channelName
    bind:what
    bind:when
    {whoValid}
    {whatValid}
    {whenValid}
  />
  <ChannelChat
    {previews}
    {who}
    channelName={channelName.trim()}
    commandHTML={commandPreviewHTML}
    {whatSlack}
    when={when.trim()}
    {isComposable}
    {addPreview}
    {hasContent}
    {copied}
    {copyCommand}
  />
</div>
