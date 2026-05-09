<script lang="ts">
  interface Props {
    value: string;
    placeholder?: string;
    id?: string;
  }

  let { value = $bindable(), placeholder = '', id }: Props = $props();

  let editorEl: HTMLDivElement | undefined = $state();
  let isFocused = $state(false);
  let isEmpty = $state(computeIsEmpty(value));
  let activeStates = $state({
    bold: false,
    italic: false,
    strike: false,
    code: false,
  });

  function computeIsEmpty(html: string): boolean {
    if (!html) return true;
    return (
      (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '')
        .length === 0
    );
  }

  function syncValue(): void {
    if (!editorEl) return;
    value = editorEl.innerHTML;
    isEmpty = (editorEl.textContent ?? '').length === 0;
  }

  function updateActive(): void {
    activeStates = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      strike: document.queryCommandState('strikeThrough'),
      code: !!findAncestor('CODE'),
    };
  }

  function findAncestor(tagName: string): HTMLElement | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorEl) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).tagName === tagName
      ) {
        return node as HTMLElement;
      }
      node = node.parentNode;
    }
    return null;
  }

  function toggleBold(): void {
    document.execCommand('bold');
    syncValue();
    updateActive();
    editorEl?.focus();
  }

  function toggleItalic(): void {
    document.execCommand('italic');
    syncValue();
    updateActive();
    editorEl?.focus();
  }

  function toggleStrike(): void {
    document.execCommand('strikeThrough');
    syncValue();
    updateActive();
    editorEl?.focus();
  }

  function toggleCode(): void {
    const existing = findAncestor('CODE');
    if (existing) {
      // Unwrap: move children out of <code>, then remove <code>.
      const parent = existing.parentNode;
      if (parent) {
        while (existing.firstChild) {
          parent.insertBefore(existing.firstChild, existing);
        }
        parent.removeChild(existing);
      }
      syncValue();
      updateActive();
      editorEl?.focus();
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const codeEl = document.createElement('code');
    try {
      range.surroundContents(codeEl);
    } catch {
      // surroundContents fails when the selection crosses element boundaries.
      const contents = range.extractContents();
      codeEl.appendChild(contents);
      range.insertNode(codeEl);
    }
    syncValue();
    updateActive();
    editorEl?.focus();
  }

  function onPaste(e: ClipboardEvent): void {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    if (e.shiftKey && key === 'x') {
      e.preventDefault();
      toggleStrike();
    } else if (!e.shiftKey && key === 'e') {
      e.preventDefault();
      toggleCode();
    }
  }

  // Sync external value changes (e.g., resets) into the editor without
  // creating a feedback loop with onInput.
  $effect(() => {
    if (editorEl && editorEl.innerHTML !== value) {
      editorEl.innerHTML = value;
      isEmpty = (editorEl.textContent ?? '').length === 0;
    }
  });
</script>

<div
  class="rounded border bg-white {isFocused
    ? 'border-gray-500'
    : 'border-gray-300'}"
>
  <!-- toolbar -->
  <div class="flex items-center gap-0.5 border-b border-gray-200 px-1.5 py-1">
    <button
      type="button"
      onclick={toggleBold}
      class="flex h-6 w-6 items-center justify-center rounded text-sm font-bold {activeStates.bold
        ? 'bg-slack-aubergine/15 text-slack-aubergine'
        : 'text-gray-600 hover:bg-slack-aubergine/10 hover:text-slack-aubergine'}"
      title="Bold (⌘B)"
      aria-label="Bold"
    >
      B
    </button>
    <button
      type="button"
      onclick={toggleItalic}
      class="flex h-6 w-6 items-center justify-center rounded text-sm italic {activeStates.italic
        ? 'bg-slack-aubergine/15 text-slack-aubergine'
        : 'text-gray-600 hover:bg-slack-aubergine/10 hover:text-slack-aubergine'}"
      title="Italic (⌘I)"
      aria-label="Italic"
    >
      I
    </button>
    <button
      type="button"
      onclick={toggleStrike}
      class="flex h-6 w-6 items-center justify-center rounded text-sm font-bold line-through {activeStates.strike
        ? 'bg-slack-aubergine/15 text-slack-aubergine'
        : 'text-gray-600 hover:bg-slack-aubergine/10 hover:text-slack-aubergine'}"
      title="Strikethrough (⌘⇧X)"
      aria-label="Strikethrough"
    >
      S
    </button>
    <button
      type="button"
      onclick={toggleCode}
      class="flex h-6 w-6 items-center justify-center rounded {activeStates.code
        ? 'bg-slack-aubergine/15 text-slack-aubergine'
        : 'text-gray-600 hover:bg-slack-aubergine/10 hover:text-slack-aubergine'}"
      title="Code (⌘E)"
      aria-label="Inline code"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    </button>
  </div>

  <!-- editable area -->
  <div class="relative">
    <div
      {id}
      bind:this={editorEl}
      contenteditable="true"
      role="textbox"
      tabindex="0"
      aria-multiline="true"
      onfocus={() => {
        isFocused = true;
        updateActive();
      }}
      onblur={() => {
        isFocused = false;
      }}
      oninput={syncValue}
      onkeyup={updateActive}
      onclick={updateActive}
      onpaste={onPaste}
      onkeydown={onKeydown}
      class="block min-h-[6rem] w-full px-3 py-2 text-sm text-gray-900 focus:outline-none [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]"
    ></div>
    {#if isEmpty}
      <div
        class="pointer-events-none absolute inset-x-0 top-0 px-3 py-2 text-sm text-gray-400"
      >
        {placeholder}
      </div>
    {/if}
  </div>
</div>
