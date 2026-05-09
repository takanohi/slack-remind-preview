<script lang="ts">
  import type { Who } from './types';
  import ChannelMention from './ChannelMention.svelte';
  import { CHANNEL_NAME } from './constants';

  interface Props {
    who: Who;
    channelName: string;
    whatSlack: string;
    when: string;
    isComposable: boolean;
    addPreview: () => void;
    hasContent: boolean;
    copied: boolean;
    copyCommand: () => void;
  }

  let {
    who,
    channelName,
    whatSlack,
    when,
    isComposable,
    addPreview,
    hasContent,
    copied,
    copyCommand,
  }: Props = $props();
</script>

<footer class="shrink-0 px-5 pb-3">
  <div class="flex items-end gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
    <div
      class="min-h-[1.5rem] flex-1 self-center text-sm leading-relaxed text-gray-800 [&_a]:text-slack-aubergine [&_a]:underline"
    >
      {#if hasContent}
        <span class="font-medium text-gray-700">/remind</span>
        {#if who === 'me'}
          <span> me</span>
        {:else if channelName}
          {' '}<ChannelMention name={channelName} />
        {/if}
        {#if whatSlack}<span class="whitespace-pre-wrap"> {whatSlack}</span>{/if}
        {#if when}<span> {when}</span>{/if}
      {:else}
        <span class="text-gray-400"
          >Message <span class="font-medium">#{CHANNEL_NAME}</span></span
        >
      {/if}
    </div>

    <button
      type="button"
      onclick={copyCommand}
      disabled={!isComposable}
      aria-label={copied ? 'Copied!' : 'Copy command (⌘ + Shift + Enter)'}
      title={copied ? 'Copied!' : 'Copy command (⌘ + Shift + Enter)'}
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded {isComposable
        ? 'text-gray-500 hover:bg-slack-aubergine/10 hover:text-slack-aubergine'
        : 'text-gray-300'}"
    >
      {#if copied}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="text-slack-green"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      {/if}
    </button>

    <button
      type="button"
      onclick={addPreview}
      disabled={!isComposable}
      aria-label="Send preview (⌘ + Enter)"
      title="Send preview (⌘ + Enter)"
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded {isComposable
        ? 'bg-slack-green text-white hover:bg-slack-green-hover'
        : 'bg-transparent text-gray-300'}"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
        />
        <path d="m21.854 2.147-10.94 10.939" />
      </svg>
    </button>
  </div>

  <div class="mt-1.5 flex justify-end gap-3 pr-3 text-[10px] text-gray-400">
    <span class="flex items-center gap-1">
      <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-mono text-[10px] text-gray-500">⌘</kbd>
      <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-mono text-[10px] text-gray-500">Shift</kbd>
      <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-mono text-[10px] text-gray-500">Enter</kbd>
      <span>Copy</span>
    </span>
    <span class="flex items-center gap-1">
      <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-mono text-[10px] text-gray-500">⌘</kbd>
      <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-mono text-[10px] text-gray-500">Enter</kbd>
      <span>Send</span>
    </span>
  </div>
</footer>
