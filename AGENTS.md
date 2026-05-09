# AGENTS.md

Conventions for AI agents and humans working on this repo. Each rule includes a "why" so you can apply judgment in edge cases instead of mechanically following.

## Project overview

**Remind Preview for Slack** — a web app that lets you compose Slack `/remind` commands via a form and preview how the resulting reminder will appear in Slack before you post it.

## Slack Brand Terms compliance

This is an unaffiliated third-party tool, not built by or endorsed by Slack. The project complies with the [Slack Brand Terms of Service](https://slack.com/terms-of-service/slack-brand):

- **Product name uses the "for Slack" form** ("Remind Preview for Slack"), which the Brand Terms explicitly permit for third-party integrations
- **No `slack` substring in the domain name** (`remind-preview.pages.dev`, and any future custom domain must follow the same rule). The Brand Terms state: *"Don't register a domain containing the word 'slack' or any variation thereof. Deliberate misspellings and transliterations are also not permitted."*
- **No use of the Slack logo or trademarks** as our own. The bell icon and aubergine palette evoke a Slack-like UI for the preview but are not Slack's marks

Any change that would touch the product name, domain, logo, or trademark usage must be checked against the Brand Terms before shipping.

## Tech stack

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | 24.15.0 (`.node-version`) |
| Package manager | pnpm | 11.0.9 (`packageManager` field) |
| Bundler | Vite | 8 |
| Framework | Svelte 5 (runes) | 5 |
| Type system | TypeScript | 6 |
| Styling | Tailwind CSS v4 | 4.x (brand tokens via `@theme`) |
| Testing | Vitest + happy-dom | 4 |
| Hosting | Cloudflare Pages | `remind-preview.pages.dev` |

## Repository layout

```
src/
├── App.svelte                 # State orchestration + layout shell
├── main.ts
├── app.css                    # @import "tailwindcss" + theme tokens
└── lib/
    ├── types.ts               # Shared types (Who, Preview)
    ├── constants.ts           # Constants like CHANNEL_NAME
    ├── slack-format.ts        # HTML <-> Slack markdown conversion
    ├── parse-when.ts          # Natural-language "when" -> Date
    ├── format-when.ts         # Structured data -> Slack syntax
    ├── *.test.ts              # Vitest tests for pure modules
    └── *.svelte               # Components, split by responsibility
public/
└── favicon.svg                # Static asset
.github/workflows/ci.yml       # GitHub Actions
```

## Commit rules

- One commit = one logical change (don't bundle a refactor with a feature)
- Message body: 1–2 sentences focused on **why**, not what. Avoid boilerplate
- No pre-commit hooks installed (revisit if needed)

## Code conventions

### Svelte 5 (runes)

- **Use the generic form of `$state`**:

  ```ts
  // ✓ Good
  let mode = $state<Mode>('once');

  // ✗ Bad — svelte-check sometimes narrows incorrectly
  let mode: Mode = $state('once');
  ```

- **Two-way binding**: child props that are bound from the parent must use `$bindable()`. Parent uses `bind:`
- **`$derived` vs `$effect`**:
  - Derived values → `$derived` or `$derived.by(() => {...})`
  - Side effects (DOM mutation, store updates) → `$effect`
  - Pushing a derived value back into a parent prop → use `$effect` with the `if (parent !== computed) parent = computed` pattern to avoid feedback loops
- **Always declare a `Props` interface** and annotate the destructure target

### TypeScript

- Honor the `strict`-style defaults from the Svelte scaffold
- Pure functions belong in `.ts` modules so they can be tested directly. Don't bury them inside `.svelte` files
- Locale-dependent APIs (`toLocaleString` etc.) **must pass `'en-US'` explicitly**. The UI is English-only, and this avoids environment drift in tests

### Component architecture

- **Single responsibility**. Consider splitting once a file pushes past ~200 lines
- **State ownership lives in the nearest common ancestor** (typically `App.svelte`). Children read via props or two-way bindings, not by importing parent state
- **Reusable atoms** live directly under `lib/`:
  - `BellIcon.svelte` — bell glyph (favicon, WorkspaceRail, PreviewMessage)
  - `ChannelMention.svelte` — `#channel` pill
  - `SegmentedToggle.svelte` — generic 2-way segment (me/channel, Once/Recurring)

### Tailwind

- **Brand colors are defined in `@theme`** (see `src/app.css`). Don't hardcode hex values:
  - `slack-aubergine` (#4a154b) — primary
  - `slack-aubergine-deep` (#3f0e40) — darker variant
  - `slack-green` (#007a5a) — primary action
  - `slack-link` (#1264a3) — channel mentions / links
  - `slack-compose` (#f1ebf0) — compose pane background
  - `slack-cream` (#f8f8f8) — row hover
- **Hover states are unified site-wide**:
  - Default: `hover:bg-slack-aubergine/10`
  - Bordered chips: `hover:border-slack-aubergine/40 hover:bg-slack-aubergine/10`
  - Icon buttons: `hover:bg-slack-aubergine/10 hover:text-slack-aubergine`
- **Required-field marker**: `<span class="text-red-500" aria-label="required">*</span>` next to the label

## Testing

- **All pure functions must have tests** (slack-format, parse-when, format-when)
- Test files are co-located: `lib/*.test.ts`
- `pnpm run test` runs the full suite (also wired into CI)
- For date logic, pass an explicit `now` to keep tests deterministic
- No component-level integration tests yet. If they're added, use `@testing-library/svelte`

## Slack `/remind` domain knowledge

These details bite — capture them here so they don't get lost.

- **Recipient**: `me` or `#channel` only. `@user` was removed in 2023 (the API doc says "No longer supported")
- **What (body)**: multi-language. Slack markdown supported: `*bold*` / `_italic_` / `~strike~` / `` `code` ``. **Links (`<URL|text>`) are not emitted** — Slack's `/remind` parser URL-encodes the `|`, breaking the link. The tool emits URLs as plain text and leaves embedding/relabeling to the user inside Slack
- **When (timing)**: **English only** (the ja-jp official help explicitly states this)
- **Default time when omitted**: 09:00 in the user's timezone
- **Sub-day recurrence is not supported** (`every hour` is rejected; daily-or-larger only)
- **Slack's parser is closed-source**, so exact compatibility is impossible. Cover the common patterns and degrade gracefully on the rest
- **Date formats**: official help recommends locale-specific (en-gb suggests DD/MM, ja-jp suggests MM/DD). The actual parser likely accepts both. Ambiguous dates like `5/6/2026` should be flagged to the user since interpretation is uncertain

## Keyboard shortcuts

- `⌘ + Enter` / `Ctrl + Enter` — Send
- `⌘ + Shift + Enter` — Copy generated command
- `⌘ + B` / `⌘ + I` / `⌘ + ⇧ + X` / `⌘ + E` — Bold / Italic / Strikethrough / Inline code (inside the What editor)

Send and Copy shortcuts live in a window-level `$effect` in `App.svelte`. The editor formatting shortcuts are local to RichTextInput.

## Build & deploy

- Local dev: `pnpm run dev` → http://localhost:5173
- Type check: `pnpm run check`
- Tests: `pnpm run test` (one-shot, also used by CI) / `pnpm run test:watch` (interactive)
- Build: `pnpm run build` → `dist/`
- **Cloudflare Pages** auto-deploys on `main` push. Dashboard config:
  - Build command: `pnpm run build`
  - Output directory: `dist`
  - Framework preset: None
- Favicon at `public/favicon.svg` (aubergine rounded square + white bell)

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs check + test + build on `push to main` and on PRs targeting main. Node and the package manager are picked up automatically from `.node-version` and `package.json` so CI matches local exactly.

## Decision framework

When in doubt, work through this list in order:

1. **Lean into Slack's design language** (aubergine, green, bell glyph, channel pills) so the preview UI feels familiar
2. **Be skeptical of new dependencies.** Weigh bundle size and maintenance against the value. (Skipping chrono-node and TipTap was a deliberate choice along this axis)
3. **Make logic testable.** A `.ts` module with co-located tests beats a private function inside a component
4. **Prefer shipping working code over polishing.** Refactor when you feel friction, not preemptively
