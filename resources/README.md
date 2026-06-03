# App icons

Icons used by electron-builder when packaging desktop apps.

| File | Platform | Spec |
|------|----------|------|
| `icon.ico`  | Windows | multi-res ICO (16–256px) |
| `icon.icns` | macOS   | iconset (16–1024px) |
| `icon.png`  | Linux   | 512×512 PNG |

## Regenerating (macOS)

All three are derived from `public/favicon.png` (744×744, square). To regenerate:

```bash
SRC=public/favicon.png

# Linux PNG
sips -z 512 512 "$SRC" --out resources/icon.png

# macOS icns
mkdir -p /tmp/icon.iconset
for sz in 16 32 64 128 256 512; do
  sips -z $sz $sz "$SRC" --out /tmp/icon.iconset/icon_${sz}x${sz}.png
  sips -z $((sz*2)) $((sz*2)) "$SRC" --out /tmp/icon.iconset/icon_${sz}x${sz}@2x.png
done
iconutil -c icns /tmp/icon.iconset -o resources/icon.icns
rm -rf /tmp/icon.iconset
```

The `.ico` was built from PNG frames (16/32/48/64/128/256) wrapped in a
PNG-based ICO container. If you have ImageMagick, `magick public/favicon.png
-define icon:auto-resize=256,128,64,48,32,16 resources/icon.ico` is simpler.

Replace `public/favicon.png` with a higher-fidelity square brand mark and rerun
to upgrade icon quality before a real store release.
