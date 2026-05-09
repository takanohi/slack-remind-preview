<script lang="ts">
  interface Props {
    /** Channel name without the leading '#'. */
    name: string;
    /** Render variant for dark backgrounds (e.g. inside a code block). */
    onDark?: boolean;
  }

  let { name, onDark = false }: Props = $props();
</script>

{#if onDark}
  <span class="rounded bg-blue-500/20 px-1 font-medium text-blue-300">#{name}</span>
{:else}
  <span class="rounded bg-slack-link/10 px-1 font-medium text-slack-link">#{name}</span>
{/if}
