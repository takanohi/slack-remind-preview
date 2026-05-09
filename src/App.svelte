<script lang="ts">
  import WorkspaceRail from './lib/WorkspaceRail.svelte';
  import ComposePane from './lib/ComposePane.svelte';
  import ChannelChat from './lib/ChannelChat.svelte';
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

  let command = $derived.by(() => {
    const target =
      who === 'me' ? 'me' : channelName.trim() ? `#${channelName.trim()}` : '';
    const parts = ['/remind', target, whatSlack, when.trim()].filter(Boolean);
    return parts.join(' ');
  });

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
      await navigator.clipboard.writeText(command);
      copied = true;
      if (copyResetTimer) clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => (copied = false), 1500);
    } catch {
      // Clipboard API can fail in non-secure contexts; silently ignore.
    }
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
  <WorkspaceRail />
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
    {whatSlack}
    when={when.trim()}
    {isComposable}
    {addPreview}
    {hasContent}
    {copied}
    {copyCommand}
  />
</div>
