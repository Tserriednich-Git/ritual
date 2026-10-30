# App Store & Play Store submission checklist — Ritual

> **Disclaimer:** This document is a template for a portfolio project and is not legal advice. Console UIs, required screenshot sizes and questionnaire wording change; verify each item against App Store Connect and Play Console at submission time and update this file when they differ.

**Bundle id / application id (both platforms):** `dev.gabrielritual.app`
**Version under review:** 1.0.0 (`app.json` → `expo.version`, `package.json` → `version`)
**Build profiles:** `development`, `preview`, `production` ([`eas.json`](../eas.json))
**Scheme:** `ritual` (`ritual://`)

> EAS CLI is normally invoked as `npx eas-cli@latest <command>` (or a globally installed `eas`). Both forms are used below; prefer the pinned `npx eas-cli@latest` form in CI.

---

## 1. One-time account and project setup

### Apple App Store Connect

- [ ] Apple Developer Program membership active (annual renewal date noted).
- [ ] App created with name **Ritual**, primary language, SKU e.g. `ritual-ios-1`, and bundle id **`dev.gabrielritual.app`** (must match `app.json` → `expo.ios.bundleIdentifier`; the bundle id cannot be changed after creation).
- [ ] `expo.extra.eas.projectId` in [`app.json`](../app.json) replaced with the real EAS project id from `npx eas-cli@latest init` (currently the placeholder `REPLACE_WITH_EAS_PROJECT_ID`).
- [ ] App Store Connect API key generated and uploaded to EAS (`npx eas-cli@latest secret:create` or the credentials wizard) for submission.
- [ ] Distribution certificate + App Store provisioning profile created/managed by EAS (`npx eas-cli@latest credentials`).
- [ ] Keychain/Apple ID terms updated, paid agreements up to date (a missing paid agreement blocks builds silently).
- [ ] `ascAppId` in [`eas.json`](../eas.json) → `submit.production.ios.ascAppId` replaced with the real numeric App Store Connect app id (currently `REPLACE_WITH_APP_STORE_CONNECT_APP_ID`).

### Google Play Console

- [ ] Developer account created, identity verification complete, $25 fee paid (one-time, per current policy).
- [ ] Closed testing requirements satisfied before the first upload; **Google requires a minimum number of opted-in testers for closed/internal tracks on new personal accounts** — check the current requirement before you count on a date.
- [ ] App created with **Package name `dev.gabrielritual.app`** (matches `app.json` → `expo.android.package`; locked after first APK/AAB).
- [ ] Play App Signing accepted (Google-managed key) or your own key understood and backed up.
- [ ] Upload key generated, stored outside the repo, and referenced via keystore credentials in EAS.
- [ ] Service-account JSON for submission placed at the path in [`eas.json`](../eas.json) → `submit.production.android.serviceAccountKeyPath` (`./google-service-account.json`) — **never committed** (already git-ignored pattern: secrets are excluded by [`.gitignore`](../.gitignore)); `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` is documented in [`.env.example`](../.env.example).
- [ ] Store presence / "App status" section started: privacy policy URL field filled with `<your-public-privacy-url>`.

## 2. Privacy, entitlements and manifests

- [ ] iOS `ITSAppUsesNonExemptEncryption` = `false` present in the built `Info.plist`. It is set in [`app.json`](../app.json) → `expo.ios.infoPlist`, so no manual plist edit is needed.
- [ ] Export compliance question answered for the build (equivalent to the `false` above) so TestFlight/App Review does not stall on a missing answer.
- [ ] Apple privacy "Nutrition Labels" answered exactly as [DATA_SAFETY.md §3](./DATA_SAFETY.md#3-apple-app-privacy--nutrition-labels): **Data Not Collected**.
- [ ] Play **Data safety** form answered per [DATA_SAFETY.md §2](./DATA_SAFETY.md#2-google-play-data-safety-form): no collection, no sharing, no ads, no analytics, deletion by uninstall.
- [ ] Confirm no `PrivacyInfo.xcprivacy` privacy manifest is required for the SDKs actually linked. Expo modules ship their own manifests; since the app declares no data collection, there is nothing to add for Ritual itself beyond what the pods/frameworks provide. Re-check after any dependency change.
- [ ] No tracking / ATT usage, therefore no `NSUserTrackingUsageDescription` and no IDFA — confirm the key is **absent** from `Info.plist`.
- [ ] No `NSLocationWhenInUseUsageDescription`, camera, microphone, contacts, calendar or photo-library keys in `Info.plist`; no corresponding Android permissions in the prebuilt manifest.
- [ ] Notification permission string / channel configured through the `expo-notifications` config plugin only ([`app.json`](../app.json) → plugins, accent colour `#7C5CFF`).
- [ ] **In-app policy/terms links point at the real hosted pages.** `src/features/settings/SettingsScreen.tsx` currently opens `https://example.com/ritual/privacy` and `https://example.com/ritual/terms` via `Linking.openURL` — replace both with the live URLs before submitting. App Review taps these links, and a placeholder domain is a rejection risk.
- [ ] Hosted privacy policy URL is live, mentions zero collection, and matches the shipped build.
- [ ] Hosted terms page (optional but cheap) pointing at [TERMS_OF_SERVICE.md](./TERMS_OF_SERVICE.md).

## 3. Build and sign

Run the gates first, from a clean checkout:

```bash
npm ci
npm run check          # lint + typecheck + tests
npm run doctor         # expo-doctor config/dependency audit
npm run prebuild       # regenerate android/ and ios/
```

Production builds (local machine, not CI — no EAS tokens are assumed in the workflow files):

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

- [ ] iOS production `.ipa` builds and installs on a real device (not only the simulator).
- [ ] Android production `.aab` builds; also produce an `.apk` from the `preview` profile for internal testing.
- [ ] New Architecture runtime verified working end-to-end on both platforms (navigation, SQLite, notifications). It is the Expo SDK 58 default and is not toggled in `app.json`; if a build ever lands on the old architecture, stop and fix the config rather than the checklist.
- [ ] App launches with the correct splash and icon on each device class; adaptive icon monochrome layer visible in Android launcher theming.
- [ ] Version and build number incremented per [RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md); iOS build number and Android `versionCode` are unique per upload.
- [ ] Archive/ART upload succeeds without a missing-permission warning email from Google.
- [ ] Deployment targets reviewed against what the generated project actually declares — `app.json` pins none, so Expo's SDK 58 defaults apply: read the `IPHONEOS_DEPLOYMENT_TARGET` in the prebuilt `ios/` project and `minSdkVersion` in `android/build.gradle` after `npm run prebuild`, and confirm the store listings match. Android edge-to-edge is likewise the SDK default (no `edgeToEdgeEnabled` key); `predictiveBackGestureEnabled: false` is set explicitly and should be verified visually on Android 15/16 devices.
- [ ] Release-signature checks pass locally: no dev-client menu, no `EXPO_DEV` paths, `APP_ENV=production` behaviour.

## 4. Screenshots per store requirement

<!--
  Source images live in docs/screenshots/ — see docs/screenshots/README.md
  for filenames, device frames and the exact per-platform sizes.
-->

### App Store Connect (portrait sets; sizes as of the current console wording)

- [ ] 6.9" iPhone (iPhone 16 Pro Max) — **1320 × 2868** (accepted as the single required iPhone set; a 6.7" **1290 × 2796** set has historically been accepted in its place — confirm in the console).
- [ ] 13" iPad (iPad Pro 13"/M4) — **2064 × 2752** (or 12.9" **2048 × 2732**), required because `supportsTablet` is `true`. If you do not want to shoot iPad, set `supportsTablet: false` in [`app.json`](../app.json) instead of leaving the slot empty.
- [ ] Optional: iPhone SE / smaller display and 6.5" sets — only if you want the scaled variants; not required by the current console.
- [ ] 1.5" Apple Watch / CarPlay / TV sets — **not required**, the app does not target them.
- [ ] App Icon for the store listing: 1024 × 1024, no alpha channel, no transparency.
- [ ] Screenshots show real UI, in the language of each listing, and no status-bar time/battery that looks fake.
- [ ] Preview video optional; skip for 1.0.0.

### Play Console

- [ ] Phone screenshots: at least **2**, 16:9 or 9:16, minimum 1080 px on the short edge (use **1080 × 2400** from a Pixel 9; Play typically scales down), JPEG or PNG, under the per-file size limit.
- [ ] 7" tablet screenshots — required only if you declare tablet support. Ritual supports tablets by default on Play; provide **1200 × 1600** or **1600 × 2560** sets, or restrict the form factor.
- [ ] 10" tablet screenshots — same rule as above.
- [ ] Launcher icon: 512 × 512, 32-bit PNG with alpha, max 1 MB.
- [ ] Feature graphic: **1024 × 500**, JPEG or PNG, no text near the edges.
- [ ] Optional promo/teaser video (YouTube link) — skip for 1.0.0.
- [ ] Data-layer and console screenshots consistent: no other app's branding, no "coming soon" claims.

## 5. Listing metadata

- [ ] Name ≤ 30 characters (Apple) and ≤ 30 characters (Play): `Ritual — Habit Tracker with Streaks` fits Apple; verify Play's shorter effective display.
- [ ] Subtitle / short description ≤ 30 characters focused on function, not superlatives ("Offline habit tracker with streaks").
- [ ] Long description covering: frequency models, week-based streaks, grace rule, offline guarantee, export/import, **and the "not a medical device / not health advice" sentence** — keep it identical in spirit to [TERMS_OF_SERVICE.md §5](./TERMS_OF_SERVICE.md#5-not-a-medical-device-and-not-health-advice).
- [ ] Keywords field (Apple, 100 characters): no competitor brand names, no "free", no store names.
- [ ] Category: **Productivity** (primary), Lifestyle (secondary) — and the equivalent Play category.
- [ ] Contact info for reviewers: name + `<support@example.com>`, real phone if the console demands it.
- [ ] Demo video / marketing URL: not required; leave blank rather than pointing at a placeholder.
- [ ] Pricing: free, no in-app purchases, no subscription — confirm the IAP configuration shows none, since a mismatch with the listing is a common rejection.
- [ ] Copyright line: `Copyright (c) 2026 Gabriel`.
- [ ] Support URL and privacy policy URL both resolve to hosted pages.
- [ ] Localization entries: at least English; add Spanish only when the app UI is actually localised (see the roadmap).
- [ ] "What's new" text mirrors the [Unreleased → 1.0.0](../CHANGELOG.md) section, in user language.

## 6. Ratings and questionnaires

- [ ] **Apple age rating**: answer **No** to all content questions (cartoon/violence, realistic violence, sexual content or nudity, profanity or crude humor, terrorism/martial arts, alcohol/tobacco/drugs references, mature/suggestive themes, gambling, weapons, health/medical treatment information _that is a treatment claim_). Declare **no** unrestricted web access, **no** user-generated content sharing with others, **no** chat/forums, **no** third-party analytics, and **no** location sharing. Expected result: **4+** (hedge: verify — adding UGC or in-app purchases changes the outcome and may require 12+/17+).
- [ ] Apple "Data Not Collected" label confirmed in the App Privacy summary screen, including the "Does not collect data from children under 13" implication — declare the app is not directed at children.
- [ ] **Play content rating (IARC)**: answer "No" to violent, sexual, profane, controlled-substances, gambling and hate-speech questions; "No" to users creating content visible to others; note that the app can display emoji chosen by the user in local notes only. Expected band: **Everyone** / 3 (hedge: re-run the questionnaire after any feature that surfaces content to other users).
- [ ] Play "Target audience" declarations: do **not** mark the app as appealing to children under 13 unless you are prepared to meet the Families policy (which would require a consent flow Ritual does not implement).
- [ ] Play "Ads" declaration: **No ads**.
- [ ] Play "In-app purchases": **None**.
- [ ] Play "App access": declare no restricted access; there is no login.

## 7. Reviewer notes to paste into the submission

Both consoles give a free-text field for the reviewer. Paste something close to this (keep it factual, no marketing):

```text
Ritual is a fully offline habit tracker. There is no account, no sign-in and
no demo/login credentials — the app is usable immediately on first launch.

Network: the app makes no network requests. It has no backend, no analytics,
no ads and no crash reporting. If your testing device is in Airplane Mode, the
app behaves identically; you can verify this with a network monitor.

How to test the core flow:
1. On first launch the app seeds three example habits ("Move for 20 minutes",
   "Read 10 pages", "Water refill") with NO check-ins recorded, so the streak
   counters start at zero. They are ordinary habits: edit or delete them freely.
   The app is fully usable without ever creating one.
2. Today tab -> "+" to create a habit. Pick a frequency model: "Every day",
   "N times per week" (a weekly quota), or specific weekdays.
3. Tap the circle on a habit row to check in for today; add an optional note.
4. Progress tab: streak, consistency % over a trailing 28-day window,
   contribution-style heatmap and weekday breakdown are derived from those
   check-ins. Tapping a habit opens its detail screen, which shows the current
   week as a strip of day cells plus the streak history.
5. A "times per week" habit counts streaks in WEEKS: a streak of 6 means six
   weeks on target, not six days. Today (or the current in-progress week)
   being unchecked does not break a streak by design.
6. Settings tab: theme (light/dark/system), a Monday/Sunday week-start display
   preference, "Preview a reminder" (schedules one local notification about
   five seconds later, only when you tap it), CSV/JSON export, JSON import with
   a merge/replace choice, an archived-habits list with Restore, and "Erase
   all local data" (deletes every habit and check-in on this device after a
   confirmation).

Reminders: the notification permission prompt appears only when you turn the
"Reminders" switch on in Settings, or when you set a reminder time for a habit
in the editor. Nothing is requested at launch and reminders are off by default.
Reminders are scheduled locally on the device (no push service, no server
payload), so the device must be powered on and the app must have been opened at
least once after the setting changed. Android battery optimisation may delay a
local notification; whitelist the app if a reminder appears late during testing.

Data: everything is stored in an SQLite file in the app's private sandbox.
Uninstalling deletes it, and "Erase all local data" in Settings deletes it while
keeping the app installed. Export/Import exists in Settings for data portability.

Known limitations in 1.0.0: no cloud sync, no cross-device continuity, no
passcode lock inside the app (the device passcode is the only gate).
```

- [ ] Reviewer contact details filled and reachable.
- [ ] If a TestFlight phased release or Play internal track is used first, note it in the release comments.

## 8. Common utility-app rejection reasons — and how this repo avoids them

| Rejection reason (typical guidance)                                      | Why apps trip on it                                                 | How Ritual avoids it                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4.2 / functionality: minimal functionality or a "thin" app**           | Template CRUD with no real purpose                                  | Streaks with two period units, the grace rule, derived stats, heatmap and local reminders are substantive functionality; the pitch page in the listing states what it does rather than what it will do.                                                                                   |
| **5.1.1 / data collection & privacy mismatch**                           | Privacy labels disagree with SDK behaviour                          | Zero collection is a _design_ fact, not a declaration to maintain: no SDK to misreport. §2 diffs the built `Info.plist`/manifest against the declarations, so the labels cannot drift.                                                                                                    |
| **Missing or unreachable privacy policy**                                | Placeholder URL, or policy promises features that do not exist      | Hosted `<your-public-privacy-url>` derived from [legal/PRIVACY_POLICY.md](./PRIVACY_POLICY.md); every claim in it is checkable against the code.                                                                                                                                          |
| **2.5.4 / use of unapproved APIs or a hidden dev client**                | Shipping an Expo Go/dev-client build, or a debug menu in release    | §3 verifies a `production` profile build with no dev-client entry point; `APP_ENV=production` is set in [`eas.json`](../eas.json).                                                                                                                                                        |
| **Spam / repetitive or misleading name & metadata**                      | Keyword stuffing, "best #1" claims, name that implies another brand | Metadata rules in §5: functional subtitle, no competitor marks, no superlatives, "free" excluded from keywords.                                                                                                                                                                           |
| **Health claims without support (both stores, and 4.3/5.1.3 in spirit)** | Habit, fitness or mood apps implying treatment, cure or diagnosis   | Explicit not-a-medical-device disclaimer in the listing, in [TERMS_OF_SERVICE.md §5](./TERMS_OF_SERVICE.md#5-not-a-medical-device-and-not-health-advice) and in [DATA_SAFETY.md §2](./DATA_SAFETY.md#2-google-play-data-safety-form), plus declaring Health & Fitness as "Not collected". |
| **Broken on first launch / crashes**                                     | Stale build number, unsigned bits, platform-specific crash          | §3 install-on-real-device step, plus the CI gate (`npm run check`, `expo-doctor`) in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).                                                                                                                                           |
| **In-app purchase / subscription mismatch**                              | Listing says one thing, IAP configuration says another              | No IAP at all; §5 asserts the configuration is empty.                                                                                                                                                                                                                                     |
| **Notification spam or notifications without user request**              | Reminder apps notify before opt-in                                  | Permission is requested only when the user enables a reminder for a specific habit; default is off.                                                                                                                                                                                       |
| **Requires network/Wi-Fi but has none, or vice versa**                   | Silent failure offline                                              | The app is offline by construction; the reviewer note states it so the tester does not report "nothing loads" as a bug.                                                                                                                                                                   |
| **Screenshots that misrepresent the app**                                | Mockups, device frames with fake UI                                 | §4 requires real UI captures at the exact sizes; the placeholder block in the README is commented out until real images exist.                                                                                                                                                            |
| **Accessibility / Arabic-script or iPad issues**                         | Unsupported form factor shipped as-is                               | iPad set either provided or `supportsTablet` turned off (§4).                                                                                                                                                                                                                             |

## 9. Final sign-off

- [ ] `npm run check` and `npm run doctor` green on the commit being tagged.
- [ ] [CHANGELOG.md](../CHANGELOG.md) entry for the release exists and moves `Unreleased` content into a dated version block.
- [ ] Version bump applied per [docs/RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md).
- [ ] Legal documents' placeholders resolved: `<support@example.com>`, `<your-username>`, `<your-public-privacy-url>`, `<your-jurisdiction>`, `2026-XX-XX`.
- [ ] Backup of signing artefacts, keystore and store credentials outside the repo.
- [ ] Rollback plan read (§ "Rollback" in [docs/RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md)).

---

Related: [DATA_SAFETY.md](./DATA_SAFETY.md) · [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) · [TERMS_OF_SERVICE.md](./TERMS_OF_SERVICE.md) · [docs/RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md) · [docs/screenshots/README.md](../docs/screenshots/README.md)
