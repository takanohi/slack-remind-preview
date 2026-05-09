# Remind Preview for Slack

A visual builder and preview tool for Slack's `/remind` command syntax. Compose reminders by filling in fields, see the generated `/remind` syntax in real time, and preview how Slack will interpret it before posting.

Live: https://remindpreview.pages.dev

Status: Early development.

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
