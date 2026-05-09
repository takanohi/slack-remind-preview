<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    valid: boolean;
    children: Snippet;
  }

  let { label, valid, children }: Props = $props();
</script>

<section
  class="rounded-lg border bg-white p-3 transition-colors {valid
    ? 'border-slack-green/60'
    : 'border-gray-300'}"
>
  <div class="flex items-center gap-1.5 text-xs font-bold text-gray-700">
    <span>{label}</span>
    {#if valid}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-slack-green"
        aria-label="filled"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    {:else}
      <span class="text-red-500" aria-label="required">*</span>
    {/if}
  </div>
  <div class="mt-2">
    {@render children()}
  </div>
</section>
