# Jigsaw

A themed jigsaw puzzle game that runs on the **web**, **desktop** (Steam — Windows /
macOS / Linux via Electron), and **mobile** (iOS / Android via Capacitor). Built
with React + PixiJS.

## Features

- Turn any photo into a jigsaw puzzle, 8 sizes from **10 to 10,000 pieces**.
- Four visual themes (cartoon, modern, dark, arcade) with theme-aware boards,
  piece styling, and background music.
- Drag, snap, group, and a piece tray for stashing pieces.
- Touch + mouse support; zoom/pan controls.
- Save / resume puzzles (autosaves as you place pieces); finished puzzles are
  kept in a "Completed" gallery to look back on.
- Steam achievements for puzzle completions and lifetime pieces placed.
- Theme-aware audio engine (SFX + per-theme music).
- Mobile freemium gate: sizes up to 100 pieces are free; larger sizes unlock via a
  one-time in-app purchase (RevenueCat). Web and desktop are fully unlocked.

## Getting started

```bash
npm install
npm run dev:browser   # web dev server (Vite)
npm run dev           # desktop dev (Electron)
```

Copy `.env.example` to `.env` and fill in RevenueCat keys if testing IAP on a
device (not needed for web/desktop).

## Scripts

| Script | What it does |
|--------|--------------|
| `dev:browser` | Vite dev server (web) |
| `dev` | Electron dev (desktop) |
| `build:web` | Web production build → `dist-web/` |
| `build` | Electron production build → `out/` |
| `sync:mobile` | Build web + `cap sync` into native projects |
| `open:ios` / `open:android` | Open the native project in Xcode / Android Studio |
| `package:win` / `package:mac` / `package:linux` | electron-builder installers → `release/` |

## Project layout

```
src/
├── audio/        audio engine (SFX + music)  — see AUDIO_NOTES.md
├── components/   React screens (MainMenu, SetupScreen, PuzzleGame, …)
├── config/       platform detection, unlock gate, RevenueCat purchases
├── puzzle/       PixiJS puzzle engine + types
├── steam/        Steam achievements (wired; needs App ID — see TODO.md)
├── hooks/        useSettings, etc.
└── utils/        save/load, canvas helpers
electron/         Electron main + preload
resources/        app icons (ico / icns / png)
steam/            SteamPipe VDF build scripts
.github/workflows/ CI: web deploy + per-platform builds + Steam upload
```

## Documentation

- **[TODO.md](./TODO.md)** — outstanding work *inside the app* (audio files,
  achievements, etc.).
- **[STORE_CHECKLIST.md](./STORE_CHECKLIST.md)** — accounts, fees, secrets, and
  per-store steps for shipping to Steam / App Store / Play.
- **[MULTIPLATFORM_PLAN.md](./MULTIPLATFORM_PLAN.md)** — packaging plan and status.
- **[AUDIO_NOTES.md](./AUDIO_NOTES.md)** — audio engine architecture.

## Status

Web auto-deploys to GitHub Pages on push to `main`. Platform build workflows are
`workflow_dispatch`-only until store signing secrets are configured — see
`STORE_CHECKLIST.md`.
