# Store Release Checklist

The repo is wired for multi-platform builds (see `MULTIPLATFORM_PLAN.md`). What's
left is mostly **accounts, signing material, store listings, and policy** — work
that can't live in the repo. This file tracks it.

> For outstanding work *inside the app* (audio files, achievements, etc.), see
> [`TODO.md`](./TODO.md).

App ID (permanent once submitted): **`com.coltcallaghan.jigsaw`**
Unlock product ID: **`com.coltcallaghan.jigsaw.unlock_all`**
Unlock entitlement (RevenueCat): **`unlock_all_sizes`**

---

## 0. Cross-cutting (do first)

- [ ] **RevenueCat account** — create project, add the App Store + Play apps,
      define entitlement `unlock_all_sizes` and a non-consumable product
      `com.coltcallaghan.jigsaw.unlock_all`.
- [ ] Put the **public** RevenueCat SDK keys in CI secrets `VITE_RC_IOS_KEY`,
      `VITE_RC_ANDROID_KEY` (and in a local `.env` from `.env.example` for device testing).
- [ ] **Privacy policy URL** — required by both mobile stores even if no data is
      collected. Host a page and note the URL here: `__________`.
- [ ] Decide pricing for the one-time unlock; set it per store.

## 1. Steam (desktop)

Est. cost: **$100** Steam Direct fee (recoupable).

- [ ] Pay Steam Direct fee; create the app → get **App ID** and three **Depot IDs**
      (Windows / Linux / macOS).
- [ ] Fill real IDs into `steam/app_build.vdf` + `steam/depot_*.vdf`.
- [ ] Set repo **variable** `STEAM_APP_ID`.
- [ ] Generate Steam build-account credentials and secrets:
      - `STEAM_USERNAME`
      - `STEAM_CONFIG_VDF` — base64 of a `config.vdf` produced by logging in once
        with `steamcmd` on a trusted machine so Steam Guard is satisfied
        (`steamcmd +login <user> <pass> <guardcode> +quit`, then base64 the
        `config/config.vdf`). This avoids 2FA prompts in CI.
- [ ] Store page assets: capsule images (several sizes), 5+ screenshots, short +
      long description, tags, trailer (optional but recommended).
- [ ] Run **Build Steam (Windows/Linux/macOS)** workflows, then **Steam Upload**.
- [ ] Set the build live on a branch; submit for review.

> Note: macOS Steam build is signed + notarized (needs the Apple secrets in §2).
> Windows ships unsigned (fine for Steam). Steam ships the **unpacked** app, not
> the installer — the workflows already upload `*-unpacked` / `.app`.

## 2. iOS App Store

Est. cost: **$99/yr** Apple Developer Program.

- [ ] Enrol in the Apple Developer Program → get the 10-char **Team ID**.
- [ ] Register the App ID `com.coltcallaghan.jigsaw` in the Developer portal.
- [ ] Create a Distribution certificate + App Store provisioning profile.
- [ ] App Store Connect: create the app record; add the IAP product
      `com.coltcallaghan.jigsaw.unlock_all` (non-consumable); link it in RevenueCat.
- [ ] CI secrets:
      - `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`
      - `APPSTORE_ISSUER_ID`, `APPSTORE_KEY_ID`, `APPSTORE_PRIVATE_KEY`
      - `APPLE_TEAM_ID`
- [ ] Listing: 1024px icon, screenshots for each required device size, description,
      keywords, age rating, privacy questionnaire.
- [ ] Run **Build iOS** (it seeds `ExportOptions.plist` from `build/ExportOptions.plist`
      using `APPLE_TEAM_ID`); upload to TestFlight, then submit.

## 3. Google Play

Est. cost: **$25** one-time.

- [ ] Create a Play Console account; create the app.
- [ ] Generate an upload **keystore**; store as CI secrets:
      `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
      `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
      (Recommended: enrol in Play App Signing so Google manages the release key.)
- [ ] Play Console: create the IAP product `com.coltcallaghan.jigsaw.unlock_all`
      (managed product / non-consumable); link in RevenueCat.
- [ ] Listing: feature graphic, icon, screenshots, description, content rating,
      **Data safety** form, target audience.
- [ ] Run **Build Android** (produces a signed **AAB**); upload to internal testing,
      then promote to production.

## 4. After secrets exist

- [ ] Change the platform workflows from `workflow_dispatch:` to also trigger on
      `push: tags` (e.g. `v*`) so a tag cuts a release across platforms.
- [ ] Remove this note once tag triggers are live.

---

## Secret/var inventory (single source of truth)

| Name | Type | Used by | Platform |
|------|------|---------|----------|
| `VITE_RC_IOS_KEY` | secret | build-ios | iOS IAP |
| `VITE_RC_ANDROID_KEY` | secret | build-android | Android IAP |
| `APPLE_TEAM_ID` | secret | build-ios, build-steam-mac | Apple |
| `IOS_CERTIFICATE_P12_BASE64` | secret | build-ios | Apple |
| `IOS_CERTIFICATE_PASSWORD` | secret | build-ios | Apple |
| `APPSTORE_ISSUER_ID` | secret | build-ios | Apple |
| `APPSTORE_KEY_ID` | secret | build-ios | Apple |
| `APPSTORE_PRIVATE_KEY` | secret | build-ios | Apple |
| `MAC_CERTIFICATE_P12_BASE64` | secret | build-steam-mac | Apple |
| `MAC_CERTIFICATE_PASSWORD` | secret | build-steam-mac | Apple |
| `APPLE_ID` | secret | build-steam-mac | Apple notarize |
| `APPLE_APP_SPECIFIC_PASSWORD` | secret | build-steam-mac | Apple notarize |
| `ANDROID_KEYSTORE_BASE64` | secret | build-android | Android |
| `ANDROID_KEYSTORE_PASSWORD` | secret | build-android | Android |
| `ANDROID_KEY_ALIAS` | secret | build-android | Android |
| `ANDROID_KEY_PASSWORD` | secret | build-android | Android |
| `STEAM_USERNAME` | secret | steam-upload | Steam |
| `STEAM_CONFIG_VDF` | secret | steam-upload | Steam |
| `STEAM_APP_ID` | variable | steam-upload | Steam |
