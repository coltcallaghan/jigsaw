# Audio assets

Drop royalty-free audio files here. The audio engine (`src/audio/`) loads them
by path; **any missing file is silently skipped**, so the game runs fine with a
partial or empty set — add files incrementally.

## File layout (exact names matter)

```
public/audio/
├── sfx/
│   ├── piece_snap.mp3        short click — piece locks into solved position
│   ├── piece_group.mp3       lighter click — two loose pieces connect
│   ├── piece_pickup.mp3      subtle whoosh on drag start
│   ├── puzzle_complete.mp3   celebratory fanfare
│   ├── tray_add.mp3          soft pop — piece stashed to tray
│   └── tray_retrieve.mp3     soft pop — piece pulled back from tray
└── music/
    ├── cartoon.mp3           playful / bouncy (looping)
    ├── modern.mp3            minimal / lo-fi (looping)
    ├── dark.mp3              atmospheric / ambient (looping)
    └── arcade.mp3            chiptune / 8-bit (looping)
```

`.mp3` is assumed (broadest browser support). To use `.ogg`/`.wav`, update the
paths in `src/audio/sounds.ts`.

## Where to get them (CC0 / no-attribution only)

These sources require **no attribution** and allow commercial/public use, so no
credits file is needed:

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
Music loops: aim for < 1–2 MB each (trim to a clean loop, ~96–128 kbps mp3).
SFX: < 50 KB each. These ship in the web bundle and affect load time.
