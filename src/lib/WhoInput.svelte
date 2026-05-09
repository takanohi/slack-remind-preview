<script lang="ts">
  import type { Who } from './types';
  import SegmentedToggle from './SegmentedToggle.svelte';

  interface Props {
    who: Who;
    channelName: string;
  }

  let { who = $bindable(), channelName = $bindable() }: Props = $props();

  const whoOptions: { value: Who; label: string }[] = [
    { value: 'channel', label: '#channel' },
    { value: 'me', label: 'me' },
  ];
</script>

<SegmentedToggle bind:value={who} options={whoOptions} />
{#if who === 'channel'}
  <div
    class="mt-2 flex items-center rounded border border-gray-300 bg-white px-2 focus-within:border-gray-500"
  >
    <span class="select-none font-bold text-gray-500">#</span>
    <input
      type="text"
      bind:value={channelName}
      placeholder="channel-name"
      class="block w-full bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
    />
  </div>
{/if}
