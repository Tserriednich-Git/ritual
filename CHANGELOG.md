# Changelog

All notable changes to **Ritual** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html): `MAJOR` for incompatible changes to the data model or the export/import format, `MINOR` for new functionality, `PATCH` for backwards-compatible fixes.

Versions listed are the `version` field in `package.json` and `app.json`, which is also the version tag `vX.Y.Z`.

---

## [Unreleased]

Nothing queued yet. Add entries here under `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated` or `Security` as described in [CONTRIBUTING.md](./CONTRIBUTING.md).

Current roadmap candidates (not commitments) live in the [README roadmap](./README.md#roadmap):

- **Added:** home-screen widget / live activity for today's outstanding habits.
- **Changed:** thread the existing Monday/Sunday week-start preference through
  the weekly-quota maths. Today it only affects how the week strip is _displayed_
  (in `WeekStrip` and the habit detail header); streak and quota maths still use
  Monday-based ISO-8601 week keys, so a Sunday-start preference is cosmetic.
- **Added:** monthly and yearly summary views.
- **Added:** habit templates.
- **Added:** optional passphrase-encrypted export file.
- **Added:** additional localisations beyond English and Spanish documentation.
- **Changed:** accessibility pass on the heatmap (per-cell screen-reader labels).

## [1.0.0] - 2026-10-30

First public release: an offline-first habit tracker with streaks.

### Added

### Product

- Habit **create, edit, archive, unarchive, delete and reorder**, with archiving implemented as a soft delete (`archived_at`) so historical check-ins keep feeding the statistics. Up to 24 active habits.
- **Three frequency models**: every day, _N_ times per week (a weekly quota, target 1–7), and specific weekdays.
- **First-run seeding** of three starter habits with **zero** check-ins, so no streak is presented that the user did not earn.
- **One-tap daily check-in** on the Today tab (tapping again un-checks the day), with an optional short note (capped at 140 characters). Repeated taps are idempotent — one completion per habit per local day, enforced by a SQL unique index.
- **Day-based streaks** for daily and fixed-day habits, and **week-based streaks for weekly-quota habits**: a streak of 6 on a `3 × / week` habit means six weeks on target, not six days. The unit is always shown in the label ("6 days" / "6 weeks").
- **Grace rule**: an unchecked _today_, or an in-progress _current week_, does not break a streak. Only a closed period can end a run, and grace applies solely to the newest period.
- **Longest streak clamped** so it can never display below the live streak.
- **Consistency %** over a trailing 28-day window, computed against the days the frequency actually made the habit due.
- **Contribution-style heatmap** of the recent weeks, with a distinct level for today.
- **Weekday breakdown** over a trailing 12-week window, showing completion rate per weekday.
- **Per-habit detail screen** with a navigable week strip and a Sunday/Monday week-start preference.
- **Local daily reminders** per habit at a chosen `HH:MM`, requested only when the user enables one, plus a "Preview a reminder" action in Settings that fires a single local notification about five seconds later. Off by default.
- **Light, dark and system theme**, following the device setting by default.
- **JSON and CSV export** written into the app's own `exports/` document folder and handed to the OS preview/share sheet; **JSON import** with `merge` or `replace` semantics, validated against the `ritual.backup` v1 schema.
- Three-tab navigation — Today / Progress / Settings — with `HabitEditor` and `HabitDetail` on a native stack above the tabs.

### Architecture and platform

- `src/domain`: a pure TypeScript core (types, civil-date helpers, frequency rules, streak engine, stats, validation, backup-file schema) that imports nothing from React Native, React or Expo.
- `src/db`: `expo-sqlite` repositories (`habitRepository`, `completionRepository`, `preferenceRepository`), `schema.ts` with `CHECK`/`UNIQUE`/`ON DELETE CASCADE` constraints, and forward-only transactional migrations tracked in `PRAGMA user_version`.
- `src/store`: a single `useRitualStore` (`zustand`) holding entities, with every displayed number produced by `selectors.ts` rather than stored.
- `src/notifications`: `reminders.ts` scheduling `expo-notifications` local daily triggers only, including an Android channel (`ritual.reminders`) and a test-notification action.
- `src/components/ui` primitives plus app-aware composites (`HabitRow`, `Heatmap`, `MiniBars`, `WeekStrip`); `src/theme` for colour, spacing, radius and typography tokens. No charting dependency.
- React Navigation v7 (`native`, `native-stack`, `bottom-tabs`) with `TabsParamList`/`RootStackParamList` and a global `ReactNavigation.RootParamList` augmentation, backed by `react-native-screens` and `react-native-safe-area-context`.
- Cold-start sequence centralised in `src/app/providers/AppProviders.tsx` (open → migrate → seed → hydrate) behind `src/app/ErrorBoundary.tsx`.
- React Native's New Architecture and Hermes are the SDK 58 defaults; `scheme: ritual`; splash, Android adaptive icon and `ITSAppUsesNonExemptEncryption = false` configured through `app.json` and the `expo-splash-screen` plugin.

### Quality and project hygiene

- Jest (`jest-expo`) suite: 132 tests across 11 co-located `**/__tests__/**/*.test.{ts,tsx}` files covering the civil-date helpers, frequency rules, streak engine, stats, validation, the backup format, row↔domain mapping, the store selectors, an id utility and the `HabitRow` component. `jest.setup.ts` mocks `expo-notifications` and `expo-device`. Coverage is collected from the asserted-on pure logic with thresholds of 90% statements/lines/functions and 80% branches.
- Deterministic time handling: date-sensitive functions accept an injectable `today`, so no test has to fake the clock.
- Strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`).
- Flat ESLint config from `eslint-config-expo`, Prettier, and an `npm run check` aggregate.
- GitHub Actions CI running lint, typecheck, tests with coverage and `expo-doctor`, with a coverage artifact; a tag-triggered release workflow that documents the EAS build/submit steps without building in CI.
- Documentation bundle: README (English + Spanish), architecture doc, four ADRs, contributing guide, code of conduct, security policy with a threat model, release process, changelog, and a legal folder (privacy policy, terms of service, data-safety mapping, store submission checklist).

### Privacy posture (unchanged since the first line of code)

- No backend, no accounts, no analytics, no ads, no tracking SDKs, no crash reporting, no third-party sign-in and no network use by app code.
- All data lives in a single SQLite file in the app's private sandbox; uninstalling deletes it.
- Reminders are scheduled entirely on the device: no APNs/FCM registration, no tokens, no remote payloads.

### Known limitations in 1.0.0

- No cloud sync and no cross-device continuity; **export and import are the only migration path between devices**.
- No in-app passcode or biometric lock — the device passcode is the only gate, and an OS-level device backup may carry the app's sandbox.
- Reminders need a development build (or a store build) on Android; Expo Go does not provide the native notification module.
- Only one check-in per habit per day can be recorded (`UNIQUE (habit_id, local_date)`).
- Streak values are recomputed from the habit's current frequency rule, so editing a long-lived habit's frequency can change the displayed number.
- The Sunday/Monday week-start preference changes how the week strip is displayed; weekly **streak periods stay Monday-based ISO weeks** until that preference is threaded through `weekKey`.
- Exported files land in the app's own `exports/` folder before the OS share sheet opens, so they persist in the sandbox until deleted or re-exported.
- UI strings and listings are English only; the Spanish document is documentation, not a localised interface.

### Deprecated

- Nothing.

### Removed

- Nothing — this is the initial release. The repository's inherited `LICENSE` text (attributed to 650 Industries/Expo) was replaced with the project's own MIT notice.

### Fixed

- Nothing — initial release.

### Security

- Parameterised SQL statements for every value-bearing query; `execAsync` confined to static DDL.
- No network permission, no push entitlement and no tracking usage strings in the built native projects (verified per the store checklist).
- Threat model and reporting process published in [SECURITY.md](./SECURITY.md).

---

## Versioning notes

- The **export/import JSON shape** and the **SQLite schema** are the two compatibility surfaces users can observe. Changing either in a non-compatible way is a `MAJOR` bump with a migration path, and requires updating [legal/DATA_SAFETY.md](./legal/DATA_SAFETY.md) and the store declarations in the same release.
- Store build numbers (`expo.buildNumber` / `versionCode`) increment independently of the SemVer version and are managed through EAS (`appVersionSource: remote` in [`eas.json`](./eas.json)); see [docs/RELEASE_PROCESS.md](./docs/RELEASE_PROCESS.md).

[Unreleased]: https://github.com/<your-username>/ritual/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/<your-username>/ritual/releases/tag/v1.0.0
