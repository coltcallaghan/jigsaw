# Audio assets

The audio engine (`src/audio/`) loads these by path; **any missing file is
silently skipped**, so the game still runs with a partial/empty set. All 14
files are currently committed — run `npm run check:audio` to verify.

The committed audio is **machine-generated, copyright-free** (see
`scripts/gen-audio.mjs`). To regenerate: `node scripts/gen-audio.mjs` — it
synthesizes the SFX/clicks as `.wav` and the music loops as `.wav`, then
compresses the music to `.m4a` (AAC) via macOS `afconvert`.

## File layout (exact names matter)

```
public/audio/
├── sfx/                          (.wav — tiny, uncompressed is fine)
│   ├── piece_snap.wav            short click — piece locks into solved position
│   ├── piece_group.wav           lighter click — two loose pieces connect
│   ├── piece_pickup.wav          subtle whoosh on drag start
│   ├── puzzle_complete.wav       celebratory fanfare
│   ├── tray_add.wav              soft pop — piece stashed to tray
│   ├── tray_retrieve.wav         soft pop — piece pulled back from tray
│   ├── ui_click_cartoon.wav      per-theme UI click (bright two-tone)
│   ├── ui_click_modern.wav       per-theme UI click (soft clean blip)
│   ├── ui_click_dark.wav         per-theme UI click (low muted thunk)
│   └── ui_click_arcade.wav       per-theme UI click (retro square blip)
└── music/                        (.m4a — AAC, compressed; ~120–195 KB each)
    ├── cartoon.m4a               playful / bouncy (looping)
    ├── modern.m4a                minimal / lo-fi (looping)
    ├── dark.m4a                  atmospheric / ambient (looping)
    └── arcade.m4a                chiptune / 8-bit (looping)
```

Paths are defined in `src/audio/sounds.ts`. Playback is via `HTMLAudioElement`,
so any format the platform's `<audio>` supports works (`.m4a`/AAC and `.mp3` are
universally supported across web / Electron / iOS / Android; `.ogg` is risky on
iOS). To change a format, update the path in `sounds.ts` **and** the expected
extension in `scripts/check-audio.mjs`.

## Replacing the generated audio (optional)

To swap in sourced CC0 / no-attribution audio instead of the generated set:

| Type | Source | Notes |
|------|--------|-------|
| SFX | https://kenney.nl/assets?q=audio | "UI Audio" / "Interface Sounds" CC0 packs |
| SFX | https://pixabay.com/sound-effects/ | Pixabay license, no attribution |
| SFX | https://sfxr.me | Generate retro 8-bit blips (great for arcade) |
| Music | https://pixabay.com/music/ | Pixabay license, no attribution |
| Music | https://freepd.com | CC0 / public domain |

### Theme music search terms
- **cartoon** → "happy", "quirky", "playful", "ukulele"
- **modern** → "lo-fi", "ambient", "minimal"
- **dark** → "ambient dark", "cinematic calm", "drone"
- **arcade** → "chiptune", "8-bit", "retro game"

## Keep file sizes small
Music loops ship in the bundle — keep them compressed (`.m4a`/`.mp3`, ~96–128
kbps; the current loops are ~120–195 KB each). SFX < 50 KB each.
