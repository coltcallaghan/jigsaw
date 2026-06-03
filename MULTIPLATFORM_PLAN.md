# Multi-Platform Packaging Plan (corrected)

Reconciled against the actual repo state on `main`. The original 5-step prompt was
directionally sound but contained redundant steps, a regression, a duplicate
deploy workflow, and unflagged prerequisites. This version fixes those.

## Prerequisites (do these FIRST — several steps fail without them)

1. **Icon assets** — create `resources/` with:
   - `icon.ico` (Windows), `icon.icns` (macOS), `icon.png` (512×512, Linux).
   - Without these, every `electron-builder` package command and the Steam CI
     jobs will fail.
2. **Apple Developer account** ($99/yr) — required for iOS build/signing and Mac
   notarization. Without it, `build-ios.yml` and Mac signing cannot run.
3. **GitHub secrets** — the mobile/Steam-Mac CI needs ~15 secrets configured in
   repo Settings → Secrets. List them before enabling those workflows (see Step 5).
   Until configured, those workflows will fail; keep them `workflow_dispatch`-only
   or on a branch until ready.

---

## Step 1 — PixiJS pointer events — ❌ SKIP (already done)

Verified current state:
- No `mousedown/mousemove/mouseup/mouseover/mouseout` listeners exist anywhere in
  `src/` — already migrated to pointer events.
- `PuzzleEngine` init already includes `resolution: window.devicePixelRatio || 1`
  and `autoDensity: true`.
- Interactive pieces already use `eventMode = 'static'`.

⚠️ **Do NOT** apply the original "set `cursor = 'pointer'`" instruction — pieces
intentionally use `cursor = 'grab'` (correct for draggable pieces). Following it
would be a regression.

**Action: none.**

---

## Step 2 — Add Capacitor for iOS and Android — ✅ DO (de-duped)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Jigsaw" "com.jigsaw.app" --web-dir dist-web
npx cap add ios
npx cap add android
```

Create `capacitor.config.ts` in the root:

```ts
import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.jigsaw.app',
  appName: 'Jigsaw',
  webDir: 'dist-web',
  server: { androidScheme: 'https' }
};
export default config;
```

⚠️ **Skip these original sub-steps — already present:**
- `build:web` script — ALREADY EXISTS in package.json (don't re-add).
- `vite.web.config.ts` `outDir: 'dist-web'` — ALREADY SET.
- `.gitignore` already contains `dist-web/` and `release/`.

**Only add to package.json scripts (these are new):**
```json
"build:mobile": "vite build -c vite.web.config.ts",
"sync:mobile": "npm run build:mobile && npx cap sync",
"open:ios": "npx cap open ios",
"open:android": "npx cap open android",
"package:mac": "electron-builder --mac",
"package:linux": "electron-builder --linux"
```
(`build:mobile` duplicates `build:web` intentionally as a mobile-named alias; or
just reuse `build:web` in the CI and drop `build:mobile` entirely.)

**Only add to `.gitignore` (new):**
```
ios/
android/
```

---

## Step 3 — Mobile freemium gate — ⚠️ DO, but fix the limit + wiring

⚠️ **The original `FREE_PIECE_LIMIT = 48` is wrong for this app.** The real piece
counts are: **10, 50, 100, 500, 1000, 2000, 5000, 10000** (named Kids → Master in
`src/components/SetupScreen.tsx`). A limit of 48 would lock everything except
"Kids" (10). Pick a deliberate free tier — e.g. free through **Beginner (100)**:

`src/config/platform.ts`:
```ts
import { Capacitor } from '@capacitor/core';
export const isNative = Capacitor.isNativePlatform();
export const FREE_PIECE_LIMIT = 100; // free: Kids(10), Casual(50), Beginner(100)
```

`src/config/unlock.ts`:
```ts
import { isNative, FREE_PIECE_LIMIT } from './platform';
const KEY = 'jigsaw_unlocked';
export const isUnlocked = () => !isNative || localStorage.getItem(KEY) === 'true';
export const setUnlocked = (v: boolean) => localStorage.setItem(KEY, String(v));
export const isPieceSizeAllowed = (count: number) => isUnlocked() || count <= FREE_PIECE_LIMIT;
```

**Integration point is `src/components/SetupScreen.tsx`** (the `DIFFICULTIES` map at
the top, rendered around line 84). Import `isPieceSizeAllowed`/`isNative`; for any
`d.count` over the limit on native, show a lock badge on that difficulty card and
block selection.

⚠️ Prefer a themed modal over `alert()` — the app has a full theme system and an
`alert()` will look out of place. A simple placeholder is acceptable for now:
```ts
alert('Unlock all puzzle sizes with a one-time purchase. (Coming soon)');
```
but flag it for replacement with a styled upsell card before release.

Note: a real purchase needs an IAP plugin (e.g. `@capacitor-community/in-app-purchases`)
and store product setup — out of scope here; this gate is UI-only for now.

---

## Step 4 — Mac entitlements + electron-builder — ✅ DO (needs icons first)

⚠️ **Blocked on the `resources/` icons from Prerequisites** — package builds fail
without them. The current `build` block lacks mac hardenedRuntime/entitlements and
linux/win icons.

`build/entitlements.mac.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key><true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
  <key>com.apple.security.cs.disable-library-validation</key><true/>
</dict>
</plist>
```

Update the existing `build` block in package.json (it already has appId,
productName, output dir, win.target/icon, linux.target, mac.target — extend it):
```json
"win": { "target": "nsis", "icon": "resources/icon.ico" },
"linux": { "target": "AppImage", "icon": "resources/icon.png" },
"mac": {
  "target": "dmg",
  "icon": "resources/icon.icns",
  "category": "public.app-category.games",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist"
}
```

Create `resources/README.md` documenting that `icon.ico`, `icon.icns`, and
`icon.png` (512×512) must be added before any package build.

---

## Step 5 — GitHub Actions — ⚠️ DO, with one critical fix

### CRITICAL: do NOT add `deploy-web.yml`
A working Pages deploy workflow already exists at **`.github/workflows/deploy.yml`**,
triggering on push to `main`. The original plan's `deploy-web.yml` is a near-duplicate
that is actually *worse* (it omits `ELECTRON_SKIP_BINARY_DOWNLOAD=1`, which our
deploy uses to avoid pulling the Electron binary on CI).

**Options (pick one):**
- **Keep `deploy.yml` as-is and skip `deploy-web.yml` entirely** (recommended), OR
- If you want the rename, **delete `deploy.yml` in the same commit** so you don't
  have two workflows both deploying to the `github-pages` environment on every push
  (they'd race / one fails the environment protection).

### The platform build workflows (Steam win/mac/linux, Android, iOS) — fine as templates
Add these as written, BUT note they will fail until prerequisites exist:
- `build-steam-windows.yml`, `build-steam-linux.yml` — need `resources/` icons.
- `build-steam-mac.yml` — needs icons + secrets: `APPLE_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `MAC_CERTIFICATE_P12_BASE64`,
  `MAC_CERTIFICATE_PASSWORD`.
- `build-android.yml` — needs secrets: `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- `build-ios.yml` — needs Apple Developer account + secrets:
  `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `APPSTORE_ISSUER_ID`,
  `APPSTORE_KEY_ID`, `APPSTORE_PRIVATE_KEY`, `APPLE_TEAM_ID`; plus
  `ios/App/ExportOptions.plist` with the real Team ID.

To avoid red CI noise before secrets exist, give these workflows
`on: workflow_dispatch` only (drop the `push: tags` trigger) until ready, then add
the tag trigger.

⚠️ The CI uses `npm run build:mobile` then `npx cap sync` — `cap sync` requires the
`ios/`/`android/` native projects (Step 2) to be committed OR regenerated in CI.
Since `.gitignore` excludes them, either commit them or run `npx cap add` in CI
before `sync`.

### Node version consistency
Our `deploy.yml` uses `node-version: 20` unquoted; the new workflows use `'20'`.
Both work — just keep it consistent.

---

## Recommended execution order
1. Prerequisites: add `resources/` icons; (optionally) set up Apple/Android signing.
2. Step 2 (Capacitor) — de-duped.
3. Step 4 (Mac/electron-builder) — once icons exist.
4. Step 3 (freemium gate) — with the corrected limit + themed modal.
5. Step 5 (CI) — keep existing `deploy.yml`; add platform workflows as
   `workflow_dispatch`-only until secrets are configured.
