# Screenshot manifest

This folder holds the device-frame images the README and the store listings use.
The four `ios-*.png` files are committed and live in both READMEs; the four
`android-*.png` files are not, and their README rows stay commented out until
somebody captures them on an Android emulator or device.

**To activate a slot:** drop the PNG in this folder, then uncomment its line in the `## Screenshots` table of [`README.md`](../../README.md) and [`README.es.md`](../../README.es.md) — both use the same filenames.

## What the committed iOS set actually is

`ios-today.png`, `ios-progress.png`, `ios-editor.png` and `ios-settings.png` are
the shipping component tree — same screens, same store, same SQLite schema and
first-run seed — rendered by the React Native **web** target at 430 × 932 pt and
captured headlessly at 3× (1290 × 2796, the iPhone 16 Pro size below).

Three caveats, so nobody is surprised later:

1. **The data is a fixture.** The three seeded habits with 41 back-dated
   check-ins between them — 20 on Read, 12 on Move, 9 on Water — written by the
   capture harness. A fresh install shows the empty states. The streak and
   consistency numbers in these images are real calculations over that fixture,
   not hand-placed text.
2. **There is no status bar.** A browser cannot draw one, so the top inset is
   empty background. Store review expects the OS chrome.
3. **These do not satisfy the store capture rule.** Rule 1 below asks for a
   development or production build on a device; a web render of the same code is
   honest for a README and not honest enough for App Store Connect. Re-capture on
   a simulator before submitting.

The harness that produced them was a scratch entry file (`tools/preview/…`), not
a committed tool, so re-capturing means rebuilding it. Three things it had to get
right, and the reason each one is there: override `SafeAreaInsetsContext` and
`SafeAreaFrameContext` with a phone's insets, because `env(safe-area-inset-*)` is
always `0` in a desktop browser and the layout collapses without it; back-date
`habits.created_at`, because `computeStreak` filters completions to the habit's
own lifetime and every seeded check-in is older than the install; and block the
dev server's own entry from loading, because it opens the same OPFS file and the
web SQLite worker needs the exclusive access handle.

## Files the README expects

| Filename               | Screen                                                 | Shown as                               |
| ---------------------- | ------------------------------------------------------ | -------------------------------------- |
| `ios-today.png`        | Today — habit rows with one-tap check-in, streak chips | README row 1, column 1 — **committed** |
| `ios-progress.png`     | Progress — consistency %, streaks                      | README row 1, column 2 — **committed** |
| `ios-editor.png`       | Habit editor — frequency model picker                  | README row 1, column 3 — **committed** |
| `ios-settings.png`     | Settings — theme, export/import, reminders             | README row 1, column 4 — **committed** |
| `android-today.png`    | Same Today screen, Android chrome                      | README row 2, column 1                 |
| `android-progress.png` | Same Progress screen, Android chrome                   | README row 2, column 2                 |
| `android-editor.png`   | Same editor, Android chrome                            | README row 2, column 3                 |
| `android-settings.png` | Same Settings, Android chrome                          | README row 2, column 4                 |

Capture these at the display scale below and keep the README set to **one screen per image, real UI, no marketing text overlay**.

## Device frames and pixel sizes

Portrait unless noted. Sizes are the raw screenshot dimensions (device pixels), not the @1x point size.

### iPhone (for the README and, where marked, App Store Connect)

| Device                      | Portrait size          | Used for                                                               |
| --------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| iPhone 16 Pro               | **1290 × 2796** (6.3") | README `ios-*.png`; a good universal frame                             |
| iPhone 16 Pro Max           | **1320 × 2868** (6.9") | App Store Connect — the iPhone set currently requested                 |
| iPhone 15 Pro Max / 16 Plus | 1290 × 2796            | Accepted as the 6.7" set historically                                  |
| iPad Pro 13" (M4)           | 2064 × 2752            | App Store Connect iPad set — required while `supportsTablet` is `true` |
| iPad Pro 12.9"              | 2048 × 2732            | Older iPad set, still accepted                                         |
| iPhone SE (3rd gen)         | 750 × 1334             | Optional; only if you want the small-display set                       |

### Android (README and Play)

| Device                          | Portrait size                         | Used for                                      |
| ------------------------------- | ------------------------------------- | --------------------------------------------- |
| Pixel 9                         | **1080 × 2400**                       | README `android-*.png`                        |
| Pixel 9 Pro                     | 1280 × 2856                           | Optional higher-density alternative           |
| Generic phone, Play requirement | 1080 × 1920 or 1080 × 2400, 16:9/9:16 | Play phone screenshots (minimum 2 images)     |
| 7" tablet                       | 1200 × 1600 or 1600 × 2560            | Play 7" set, only if you keep tablet support  |
| 10" tablet                      | 1600 × 2560 or 1920 × 1200            | Play 10" set, only if you keep tablet support |

### Store graphics

| Asset                | Size        | Notes                                          |
| -------------------- | ----------- | ---------------------------------------------- |
| App Store icon       | 1024 × 1024 | No alpha, no transparency                      |
| Play launcher icon   | 512 × 512   | 32-bit PNG with alpha, ≤ 1 MB                  |
| Play feature graphic | 1024 × 500  | JPEG or PNG; keep text out of the outer margin |

## Capture rules

```bash
# iOS simulator
xcrun simctl io booted screenshot ritual-today.png

# Android emulator / device
adb exec-out screencap -p > ritual-today.png
```

1. Capture real UI from a **development or production build**, never a mockup or a Figma export — both stores reject representative-but-fake screens.
2. Use the same seeded demo data in every shot: three or four habits with visible streaks, one weekly-quota habit showing a "weeks" label, and a heatmap with some history. A flat, empty app makes a poor first impression and does not show the product.
3. Light theme for the README set, so the images stay legible on a white background; add one dark-theme pair (`ios-progress-dark.png`, `android-progress-dark.png`) only if you intend to show it.
4. Neutral status bar: full battery, `9:41`, no carrier name that reads oddly.
5. Hide any personal habit names or notes. Notes are capped at 140 characters but still end up in a public repo — use placeholder copy.
6. Keep file sizes sane: PNG is fine; under ~1.5 MB per image so the repository stays cloneable.
7. Name files exactly as in the tables above; the README slots and the checklist both reference them.

<!--
  Store-ready shots often come out of a device-frame mockup tool. Put the raw
  captures in screenshotsRaw/ (git-ignored) and commit only the final frames here.
-->

## Checklist before a submission

- [ ] App Store Connect: iPhone set uploaded at the currently required size, iPad set uploaded or `supportsTablet` turned off in [`app.json`](../../app.json).
- [ ] Play Console: at least two phone screenshots, plus tablet sets if those form factors are not restricted.
- [ ] Play: launcher icon (512 × 512) and feature graphic (1024 × 500) uploaded.
- [ ] README tables have their image lines uncommented and every referenced file exists in this folder.
- [ ] Nothing in a screenshot exposes a personal name, note or habit that is not obviously placeholder copy.

---

Related: [legal/APP_STORE_CHECKLIST.md §4](../../legal/APP_STORE_CHECKLIST.md) · [README.md](../../README.md)
