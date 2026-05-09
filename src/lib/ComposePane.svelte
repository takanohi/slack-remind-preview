<script lang="ts">
  import type { Who } from './types';
  import RichTextInput from './RichTextInput.svelte';
  import WhenInput from './WhenInput.svelte';
  import WhoInput from './WhoInput.svelte';
  import FieldSection from './FieldSection.svelte';

  interface Props {
    who: Who;
    channelName: string;
    what: string;
    when: string;
    whoValid: boolean;
    whatValid: boolean;
    whenValid: boolean;
  }

  let {
    who = $bindable(),
    channelName = $bindable(),
    what = $bindable(),
    when = $bindable(),
    whoValid,
    whatValid,
    whenValid,
  }: Props = $props();

  // Resize logic — drag the right-edge handle to widen.
  // Min 240px (form usability), max 50% of viewport.
  const MIN_WIDTH = 240;
  const DEFAULT_WIDTH = 384;
  let width = $state(DEFAULT_WIDTH);

  function startResize(e: PointerEvent): void {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    function onMove(ev: PointerEvent): void {
      const delta = ev.clientX - startX;
      const max = window.innerWidth / 2;
      width = Math.max(MIN_WIDTH, Math.min(max, startWidth + delta));
    }

    function onUp(): void {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
</script>

<aside
  class="relative flex w-full max-h-[55vh] shrink-0 flex-col overflow-hidden bg-slack-compose text-gray-900 lg:max-h-none lg:w-[var(--compose-width)]"
  style="--compose-width: {width}px;"
>
  <!-- workspace header -->
  <div class="flex h-14 shrink-0 items-center border-b border-slack-aubergine/15 px-4">
    <h1 class="text-base font-bold text-slack-aubergine">Remind Preview for Slack</h1>
  </div>

  <!-- form -->
  <div class="flex-1 space-y-3 overflow-y-auto px-4 py-4">
    <h2 class="text-[11px] font-bold uppercase tracking-wider text-gray-500">Compose</h2>

    <FieldSection label="Who" valid={whoValid}>
      <WhoInput bind:who bind:channelName />
    </FieldSection>

    <FieldSection label="What" valid={whatValid}>
      <RichTextInput
        id="what-input"
        bind:value={what}
        placeholder="to follow up on the launch"
      />
      <p class="mt-1 pl-3 text-[11px] text-gray-500">
        Multi-language OK. Toolbar shortcuts: ⌘B / ⌘I / ⌘⇧X / ⌘E.
      </p>
    </FieldSection>

    <FieldSection label="When" valid={whenValid}>
      <WhenInput bind:value={when} />
    </FieldSection>
  </div>

  <!-- resize handle (lg+ only) -->
  <button
    type="button"
    aria-label="Resize compose pane"
    onpointerdown={startResize}
    class="absolute top-0 right-0 hidden h-full w-1 cursor-col-resize hover:bg-slack-aubergine/20 active:bg-slack-aubergine/30 lg:block"
  ></button>
</aside>
