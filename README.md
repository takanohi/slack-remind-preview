# Remind Preview for Slack

A visual builder and preview tool for Slack's `/remind` command syntax. Compose reminders by filling in fields, see the generated `/remind` syntax in real time, and preview how Slack will interpret it before posting.

Live: https://remind-preview.pages.dev

## Supported `/remind` syntax

The patterns below are what the form and the parser handle. They cover the official examples and the additional patterns that Slack accepts in practice (some of which aren't documented in Slack's help pages).

### Recipient

- `me` — your direct message with Slackbot
- `#channel-name` — the named channel

`@user` reminders for other people were removed by Slack in 2023 and are not supported.

### One-time

| Pattern | Example |
|---|---|
| `in N (minutes\|hours\|days)` | `in 30 minutes`, `in 2 hours`, `in 3 days` |
| `today [at TIME]` | `today at 5pm` |
| `tomorrow [at TIME]` | `tomorrow at 10am` |
| `next week` | `next week` |
| `next <day> [at TIME]` | `next Monday at 9am` |
| `on <day> [at TIME]` | `on Friday at 5pm` |
| `on <Month> <day> [at TIME]` | `on March 15 at 9am` |
| `<day> <Month>` | `31 December` |
| `at TIME` | `at 5pm` (today, or tomorrow if past) |

### Recurring

| Pattern | Example |
|---|---|
| `every day [at TIME]` | `every day at 9am` |
| `every weekday [at TIME]` | `every weekday at 5pm` |
| `every <day> [at TIME]` | `every Monday at 9am` |
| `every <day>, <day>, and <day> [at TIME]` | `every Monday, Wednesday, and Friday at 9am` |
| `every other <day> [at TIME]` (bi-weekly) | `every other Monday` |
| `every N weeks on <day> [at TIME]` | `every 4 weeks on Friday at 5pm` |

Recurring patterns can be combined with a starting clause to set the first firing date:

| Pattern | Example |
|---|---|
| `<recurring> starting [from\|on] <date>` | `every Monday at 9am starting tomorrow` |

### Time formats

- `9am`, `9:30am`, `9pm`, `9:30pm` — 12-hour with am/pm
- `21:00` — 24-hour
- When the time is omitted, the reminder defaults to **09:00 in your timezone**

### Date formats (used inside `on <date>` clauses)

- Day of week: `Monday`, `Friday`, …
- Month name + day: `March 15`, `April 3`
- Numeric: `31/12/2024` or `12/31/2024` — Slack accepts both, but the help recommends the form that matches the workspace locale

### Message body

- Plain text in any language (Japanese, etc.)
- Inline formatting with Slack-flavoured markdown:
  - `*bold*`
  - `_italic_`
  - `~strikethrough~`
  - `` `inline code` ``

URLs are emitted as plain text. Slack `/remind`'s parser URL-encodes the `|` in `<URL|text>`, which corrupts the link, so this tool deliberately doesn't emit that syntax — paste raw URLs into the body and let Slack auto-link them, or relabel the link inside Slack after the reminder fires. The preview pane auto-links any bare `scheme://…` URL (matching what Slack will render) so you can sanity-check the destination before posting.

### Limitations

- **No sub-day recurrence.** `every hour` and similar are rejected by Slack — recurrence is daily or coarser
- **The "when" expression must be English**, even in non-English workspaces
- **Slack's natural-language parser is closed-source.** This tool covers the patterns above; less common phrasings may surface a "couldn't determine the firing time" warning
- **Links inside the message body cannot carry display text.** See above — only bare URLs survive `/remind`

## Stack

- Vite 8 + Svelte 5 + TypeScript 6
- Tailwind CSS v4
- Hosted on Cloudflare Pages

## Development

```sh
pnpm install
pnpm run dev      # http://localhost:5173
pnpm run build    # → dist/
pnpm run preview  # serve built output
```

Node version is pinned via `.node-version` (24.15.0) and pnpm via the `packageManager` field in `package.json`.

## Contributing

Before working on the codebase, read [`AGENTS.md`](./AGENTS.md). It covers the architecture, code conventions, Slack Brand Terms compliance, the `/remind` domain quirks the parser relies on, and the decision framework used when adding features.
