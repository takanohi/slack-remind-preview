<script lang="ts">
  import BellIcon from './BellIcon.svelte';
</script>

<aside
  class="hidden w-[68px] shrink-0 flex-col items-center bg-slack-aubergine-deep text-white lg:flex"
>
  <div class="flex h-14 items-center justify-center">
    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow">
      <BellIcon size={22} strokeWidth={2.2} class="text-slack-aubergine" />
    </div>
  </div>
</aside>
