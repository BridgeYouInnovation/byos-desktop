# BridgeYou Business OS — Desktop

Offline-first desktop build of BYOS. **Login + the software only** (no marketing pages). Records the
daily workflow (sales/income/expense, stock, contacts, dashboard, reports, receipts) with no internet,
and syncs to the central Supabase via **PowerSync** when online.

See the brief + plan in the BYOS docs folder: `~/Documents/BridgeYou Business OS (BYOS)/DESKTOP_APP_HANDOFF.md`
and `DESKTOP_BUILD_PLAN.md`. PowerSync provisioning: `POWERSYNC_SETUP.md` (this repo).

> This repo lives at `~/Documents/byos-desktop` (moved out of the BYOS folder — native
> module builds and electron-builder can't handle the parentheses in `(BYOS)`).

## Stack

- Electron (electron-vite) + React 19 + Tailwind v4 + TypeScript
- Local DB: PowerSync wa-sqlite (offline source of truth)
- Sync: PowerSync Service ⇄ Supabase Postgres; uploads via an authenticated BYOS sync API
- Packaging: electron-builder (Windows-first, NSIS)

## Layout

```
src/main/      Electron main process (window, IPC, native print)
src/preload/   contextBridge API surface
src/core/      Shared business logic ported from web/src/lib (templates, permissions, format, …)
src/renderer/  React app (login + workspace)
```

## Develop

```bash
npm install
npm run dev          # launches the Electron app with HMR
npm run typecheck    # node + web tsconfigs
npm run package:win  # build + NSIS installer (run on/for Windows)
```

## Code sharing

`src/core` holds business rules ported from the web app. Pure files (`templates.ts`, `permissions.ts`,
`format.ts`) are copied verbatim and must stay in sync with `web/src/lib`. A later step extracts a shared
`@byos/core` package consumed by both web and desktop.
