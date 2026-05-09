<script lang="ts">
  import SegmentedToggle from './SegmentedToggle.svelte';
  import { parseFiringDate } from './parse-when';
  import {
    type DayOfWeek,
    ALL_DAYS,
    WEEKDAYS,
    arraysEqualAsSets,
    formatDayPart,
    formatTimePart,
  } from './format-when';

  type Mode = 'once' | 'recurring';

  interface Props {
    value: string;
  }

  let { value = $bindable() }: Props = $props();

  let mode = $state<Mode>('once');
  let onceText = $state('');
  let selectedDays: DayOfWeek[] = $state(['monday']);
  let time = $state('09:00');
  let weekInterval = $state(1);
  let startingFrom = $state('');

  const modeOptions: { value: Mode; label: string }[] = [
    { value: 'once', label: 'Once' },
    { value: 'recurring', label: 'Recurring' },
  ];

  const onceExamples: string[] = [
    'in 30 minutes',
    'in 2 hours',
    'tomorrow',
    'tomorrow at 10am',
    'next Monday at 9am',
    'on March 15',
    'every Monday at 9am starting tomorrow',
    'every other Monday',
    'every 4 weeks on Friday at 5pm',
  ];

  const days: { value: DayOfWeek; label: string; short: string }[] = [
    { value: 'sunday', label: 'Sunday', short: 'Su' },
    { value: 'monday', label: 'Monday', short: 'Mo' },
    { value: 'tuesday', label: 'Tuesday', short: 'Tu' },
    { value: 'wednesday', label: 'Wednesday', short: 'We' },
    { value: 'thursday', label: 'Thursday', short: 'Th' },
    { value: 'friday', label: 'Friday', short: 'Fr' },
    { value: 'saturday', label: 'Saturday', short: 'Sa' },
  ];

  const dayPresets: { label: string; days: DayOfWeek[] }[] = [
    { label: 'Every day', days: ALL_DAYS },
    { label: 'Weekdays', days: WEEKDAYS },
  ];

  function toggleDay(d: DayOfWeek): void {
    selectedDays = selectedDays.includes(d)
      ? selectedDays.filter((x) => x !== d)
      : [...selectedDays, d];
  }

  function applyDayPreset(preset: DayOfWeek[]): void {
    selectedDays = [...preset];
  }

  let computed = $derived.by(() => {
    if (mode === 'once') return onceText.trim();
    if (selectedDays.length === 0) return '';
    const timePart = formatTimePart(time);

    let result: string;
    if (weekInterval === 1) {
      result = formatDayPart(selectedDays);
    } else {
      // every N weeks supports a single day only; pick the earliest in the
      // week order from the user's selection.
      const firstDay = ALL_DAYS.find((d) => selectedDays.includes(d));
      if (!firstDay) return '';
      const dayName = firstDay.charAt(0).toUpperCase() + firstDay.slice(1);
      result =
        weekInterval === 2
          ? `every other ${dayName}`
          : `every ${weekInterval} weeks on ${dayName}`;
    }

    if (timePart) result += ` at ${timePart}`;
    const trimmedStart = startingFrom.trim();
    if (trimmedStart) result += ` starting ${trimmedStart}`;
    return result;
  });

  $effect(() => {
    if (value !== computed) value = computed;
  });

  let onceParseFailed = $derived(
    mode === 'once' && onceText.trim().length > 0 && parseFiringDate(onceText.trim()) === null,
  );
  let recurringNoDays = $derived(mode === 'recurring' && selectedDays.length === 0);
  let startingParseFailed = $derived(
    mode === 'recurring' &&
      startingFrom.trim().length > 0 &&
      parseFiringDate(startingFrom.trim()) === null,
  );
</script>

<div class="space-y-2">
  <SegmentedToggle bind:value={mode} options={modeOptions} />

  {#if mode === 'once'}
    <input
      type="text"
      bind:value={onceText}
      placeholder="tomorrow at 10am"
      class="block w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
    />
    <div class="flex flex-wrap items-center gap-1">
      <span class="text-[11px] text-gray-500">Examples:</span>
      {#each onceExamples as ex}
        <button
          type="button"
          onclick={() => (onceText = ex)}
          class="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:border-slack-aubergine/40 hover:bg-slack-aubergine/10 hover:text-slack-aubergine"
        >
          {ex}
        </button>
      {/each}
    </div>
    {#if onceParseFailed}
      <p class="pl-3 text-[11px] text-amber-700">
        ⚠ Couldn't determine the firing time. Try a pattern from the examples.
      </p>
    {/if}
  {:else}
    <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div class="space-y-3 p-3">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Repeats on
            </span>
            <div class="flex flex-wrap justify-end gap-1.5">
              {#each dayPresets as preset (preset.label)}
                {@const active = arraysEqualAsSets(selectedDays, preset.days)}
                <button
                  type="button"
                  onclick={() => applyDayPreset(preset.days)}
                  aria-pressed={active}
                  class="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors {active
                    ? 'border-slack-aubergine bg-slack-aubergine text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-slack-aubergine/40 hover:bg-slack-aubergine/10'}"
                >
                  {preset.label}
                </button>
              {/each}
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {#each days as d}
              {@const picked = selectedDays.includes(d.value)}
              <button
                type="button"
                onclick={() => toggleDay(d.value)}
                title={d.label}
                aria-label={d.label}
                aria-pressed={picked}
                class="rounded-md border px-0 py-2 text-center text-xs font-semibold transition-colors {picked
                  ? 'border-slack-aubergine bg-slack-aubergine text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-slack-aubergine/40 hover:bg-slack-aubergine/10 hover:text-slack-aubergine'}"
              >
                {d.short}
              </button>
            {/each}
          </div>

          {#if recurringNoDays}
            <p class="text-[11px] text-amber-700">⚠ Select at least one day.</p>
          {/if}
        </div>

        <div class="border-t border-gray-200 pt-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Every
            </span>
            <input
              id="when-interval"
              type="number"
              min="1"
              max="52"
              bind:value={weekInterval}
              class="w-16 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm font-mono text-gray-800 focus:border-gray-500 focus:outline-none"
            />
            <span class="text-sm text-gray-700">{weekInterval === 1 ? 'week' : 'weeks'}</span>
            {#if weekInterval > 1 && selectedDays.length > 1}
              <span class="text-[11px] text-gray-500">Uses the first selected day only.</span>
            {/if}
          </div>
        </div>

        <div class="border-t border-gray-200 pt-3">
          <div class="flex flex-wrap items-center gap-2">
            <label
              for="when-time"
              class="text-[11px] font-semibold uppercase tracking-wide text-gray-500"
            >
              At
            </label>
            <input
              id="when-time"
              type="time"
              bind:value={time}
              class="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm font-mono text-gray-800 focus:border-gray-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="border-t border-gray-200 pt-3">
          <div class="flex items-center justify-between gap-3">
            <label
              for="when-start"
              class="text-[11px] font-semibold uppercase tracking-wide text-gray-500"
            >
              Starts
            </label>
            <span class="text-[11px] text-gray-400">Optional</span>
          </div>
          <input
            id="when-start"
            type="text"
            bind:value={startingFrom}
            placeholder="tomorrow, next Monday, March 15…"
            class="mt-2 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          />
          {#if startingParseFailed}
            <p class="mt-2 text-[11px] text-amber-700">⚠ Couldn't parse the start date.</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
