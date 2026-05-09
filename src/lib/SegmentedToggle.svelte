<script lang="ts" generics="T extends string">
  interface Option {
    value: T;
    label: string;
  }

  interface Props {
    value: T;
    options: Option[];
  }

  let { value = $bindable(), options }: Props = $props();
</script>

<div class="flex gap-1 rounded-md">
  {#each options as option (option.value)}
    <button
      type="button"
      onclick={() => (value = option.value)}
      aria-pressed={value === option.value}
      class="flex-1 rounded-md border px-3 py-1 text-xs font-medium transition-colors {value === option.value
        ? 'border-slack-aubergine bg-slack-aubergine text-white'
        : 'border-gray-300 bg-white text-gray-600 hover:border-slack-aubergine/40 hover:bg-slack-aubergine/10 hover:text-slack-aubergine'}"
    >
      {option.label}
    </button>
  {/each}
</div>
