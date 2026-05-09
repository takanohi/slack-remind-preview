<script lang="ts">
  import type { Preview, Who } from './types';
  import ChannelHeader from './ChannelHeader.svelte';
  import PreviewMessage from './PreviewMessage.svelte';
  import MessageComposer from './MessageComposer.svelte';

  interface Props {
    previews: Preview[];
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
    previews,
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

  let chatContainer: HTMLDivElement | undefined = $state();

  $effect(() => {
    void previews.length;
    if (chatContainer) {
      queueMicrotask(() => {
        chatContainer!.scrollTop = chatContainer!.scrollHeight;
      });
    }
  });
</script>

<main class="flex flex-1 flex-col overflow-hidden bg-white">
  <ChannelHeader />

  <div bind:this={chatContainer} class="flex flex-1 flex-col overflow-y-auto px-5 py-4">
    {#if previews.length === 0}
      <div class="m-auto text-center">
        <div class="mb-3 text-6xl" aria-hidden="true">⏰</div>
        <p class="text-sm text-gray-500">No previews yet.</p>
        <p class="mt-1 text-xs text-gray-400">
          Fill in the compose panel and hit send below.
        </p>
      </div>
    {:else}
      <div class="mt-auto space-y-4">
        {#each previews as preview (preview.id)}
          <PreviewMessage {preview} />
        {/each}
      </div>
    {/if}
  </div>

  <MessageComposer
    {who}
    {channelName}
    {whatSlack}
    {when}
    {isComposable}
    {addPreview}
    {hasContent}
    {copied}
    {copyCommand}
  />
</main>
