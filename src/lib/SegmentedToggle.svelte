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

<div class="flex gap-0.5 rounded-md border border-gray-300 bg-white p-0.5">
  {#each options as option (option.value)}
    <button
      type="button"
      onclick={() => (value = option.value)}
      aria-pressed={value === option.value}
      class="flex-1 rounded py-1 text-xs font-medium {value === option.value
        ? 'bg-slack-aubergine text-white'
        : 'text-gray-600 hover:bg-slack-aubergine/10'}"
    >
      {option.label}
    </button>
  {/each}
</div>
