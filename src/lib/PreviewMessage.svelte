<script lang="ts">
  import type { Preview } from './types';
  import { formatFiringTime } from './parse-when';
  import {
    inlineLeadingBlock,
    linkifyBareURLs,
    sanitizePreviewHTML,
  } from './slack-format';
  import BellIcon from './BellIcon.svelte';

  interface Props {
    preview: Preview;
  }

  let { preview }: Props = $props();
  let normalizedHTML = $derived(
    linkifyBareURLs(inlineLeadingBlock(sanitizePreviewHTML(preview.whatHTML))),
  );
</script>

<article
  class="group flex gap-3 rounded py-1 hover:bg-slack-cream flash-on-mount"
>
  <div
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-600"
    aria-hidden="true"
  >
    <BellIcon size={18} />
  </div>
  <div class="min-w-0 flex-1">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span class="font-bold text-gray-900">Slack</span>
      <span class="text-xs text-gray-500">{formatFiringTime(preview.timestamp)}</span>
    </div>

    <!-- Actual reminder firing message -->
    <div
      class="mt-0.5 text-sm leading-relaxed text-gray-800 [&_a]:text-slack-link [&_a]:underline [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]"
    >
      Reminder: <span>{@html normalizedHTML}</span>
    </div>
  </div>
</article>

<style>
  .flash-on-mount {
    animation: flash 1.4s ease-out;
  }
  @keyframes flash {
    0% {
      background-color: rgba(74, 21, 75, 0.08);
    }
    100% {
      background-color: transparent;
    }
  }
</style>
