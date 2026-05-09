# AGENTS.md

Rules for humans and AI agents changing this repo. Keep this file focused on
judgment calls and implementation pitfalls, not facts that are already obvious
from the tree or README.

## Brand guardrails

- This is an unaffiliated third-party tool. Do not imply Slack endorsement.
- Keep the product name in the `for Slack` form: `Remind Preview for Slack`.
- Do not introduce a domain containing `slack` or close variants.
- Do not add Slack logos or other Slack trademarks as project branding.

If a change touches naming, domain, logo, or trademark usage, check Slack's
Brand Terms before shipping.

## Code rules

### Svelte 5 runes

- Use the generic form of `$state`:

  ```ts
  let mode = $state<Mode>('once');
  ```

- Child props used with `bind:` must use `$bindable()`.
- Use `$derived` for computed values and `$effect` for side effects.
- If a child pushes a computed value back into a bound parent prop, use the
  guarded `$effect` pattern: `if (parent !== computed) parent = computed`.
- Always declare a `Props` interface and type the `$props()` destructure.

### TypeScript and architecture

- Keep pure logic in `.ts` modules, not buried inside `.svelte` files.
- Add tests for pure parsing/formatting logic.
- State should live in the nearest common ancestor, usually `App.svelte`.
- Prefer small, single-purpose components. Split files when they start feeling
  mixed-responsibility rather than waiting for a hard size threshold.
- Locale-dependent formatting must pass `'en-US'` explicitly. The UI is
  English-only and tests should not drift by environment.

### Styling

- Use the brand tokens in `src/app.css`; do not hardcode replacement hex values.
- Match existing hover patterns unless there is a clear reason to introduce a
  new interaction style.
- Required markers should stay
  `<span class="text-red-500" aria-label="required">*</span>`.

## Testing expectations

- `pnpm run test` is the default full-suite check.
- `pnpm run check` must stay clean.
- Component tests use `@testing-library/svelte` and should target brittle
  user-facing flows, not snapshots or broad DOM coverage.
- Date-related tests should pass an explicit `now`.

## `/remind` domain pitfalls

- Recipient support is `me` or `#channel` only. Do not reintroduce `@user`.
- The message body may be multi-language, but the `when` expression is treated
  as English-only.
- Default firing time, when omitted, is 09:00 in the user's timezone.
- Sub-day recurrence is out of scope. Do not treat `every hour`-style patterns
  as supported.
- Slack's reminder parser is closed-source. Prefer graceful degradation over
  pretending to have exact compatibility.
- Ambiguous numeric dates should be treated cautiously and surfaced as
  uncertain, not confidently interpreted.
- This tool currently emits plain URLs in generated commands and does not try to
  preserve labelled link markup through the editor pipeline.

## Product heuristics

When making design or implementation tradeoffs, bias in this order:

1. Preserve the familiar Slack-like feel without copying Slack branding.
2. Keep logic testable and easy to reason about.
3. Be skeptical of new dependencies.
4. Ship clear, working behavior before polishing abstractions.
