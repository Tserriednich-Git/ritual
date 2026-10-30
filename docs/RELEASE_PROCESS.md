# Release process — Ritual

**Audience:** whoever is pushing a release, including a future version of me who has forgotten the track names.
**Related:** [`eas.json`](../eas.json) · [`app.json`](../app.json) · [CHANGELOG.md](../CHANGELOG.md) · [legal/APP_STORE_CHECKLIST.md](../legal/APP_STORE_CHECKLIST.md) · [`.github/workflows/release.yml`](../.github/workflows/release.yml)

> Builds are run from a maintainer machine, not from CI. The `release.yml` workflow only verifies a tag; the EAS commands below are deliberately manual, because a store submission should have a human checkpoint between "the artifact exists" and "reviewers have it". EAS CLI is shown as `eas ...`; if you do not have it installed globally, use `npx eas-cli@latest ...`.

---

## 0. Which version am I shipping?

| Artifact                                 | Where the version lives                                                                                                         | Notes                                                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Marketing version                        | `app.json` → `expo.version` **and** `package.json` → `version`                                                                  | Keep them identical; both are `1.0.0` today.                                                                                                                                                                 |
| iOS build number / Android `versionCode` | Managed remotely by EAS (`cli.appVersionSource: "remote"`, `build.production.autoIncrement: true` in [`eas.json`](../eas.json)) | Do not hand-edit. A production build bumps it automatically. If it ever must be pinned, `ios.buildNumber` / `android.versionCode` accept a static string — with `autoIncrement` on, prefer leaving them out. |
| Git tag                                  | `vX.Y.Z`, matching the marketing version                                                                                        | The tag is the release identifier.                                                                                                                                                                           |
| Changelog                                | `## [X.Y.Z] - YYYY-MM-DD` in [CHANGELOG.md](../CHANGELOG.md)                                                                    | Written before the tag, not after.                                                                                                                                                                           |

SemVer rules for this app are in [CHANGELOG.md → Versioning notes](../CHANGELOG.md#versioning-notes). The two user-visible compatibility surfaces are the **SQLite schema** and the **JSON/CSV export format**.

## 1. Pre-flight (before anything is built)

```bash
git checkout main
git pull --ff-only
git status --porcelain          # must be empty
npm ci
npm run check                   # lint + typecheck + tests
npm run test:coverage           # enforced coverage threshold
npm run doctor                  # expo-doctor
```

- [ ] Working tree is clean and `main` is up to date with `origin/main`.
- [ ] CI is green on the commit that will be tagged.
- [ ] `EXPO_EXTRA_EAS_PROJECT_ID` / `app.json → extra.eas.projectId` holds a real project id, not `REPLACE_WITH_EAS_PROJECT_ID`.
- [ ] EAS credentials are valid: `npx eas-cli@latest credentials` shows an iOS distribution certificate + App Store profile, and an Android upload keystore.
- [ ] Store-side paperwork is done for the version: [legal/APP_STORE_CHECKLIST.md](../legal/APP_STORE_CHECKLIST.md) §5–§7, and Data safety / App Privacy re-answered if behaviour changed.

## 2. Bump the version

1. Decide the level: **patch** for fixes, **minor** for new user-visible capability, **major** for a schema/export-format change or a breaking navigation/data contract.
2. Edit both files to the same value:

   ```json
   // package.json
   { "version": "1.1.0" }
   ```

   ```json
   // app.json
   { "expo": { "version": "1.1.0" } }
   ```

3. No commit of `android/` or `ios/` — they are generated, and `version`/`versionCode` flow from config at prebuild time.

## 3. Finalise the changelog

```bash
# CHANGELOG.md: rename the Unreleased block and add a new empty one on top
```

```markdown
## [Unreleased]

Nothing queued yet.

## [1.1.0] - 2026-XX-XX

### Added

- ...

### Fixed

- ...
```

- [ ] Every `Unreleased` entry has moved into the dated block.
- [ ] Add the link reference at the bottom of the changelog (`[1.1.0]: https://github.com/<your-username>/ritual/releases/tag/v1.1.0`).
- [ ] "What's new" text for the stores is derived from this block, in user language — no internal terms like "repository", "selector" or "migration".

## 4. Commit and tag

```bash
git add package.json app.json CHANGELOG.md
git commit -m "chore(release): v1.1.0"
git tag -a v1.1.0 -m "Ritual 1.1.0"
git push origin main --follow-tags
```

Pushing the tag triggers [`.github/workflows/release.yml`](../.github/workflows/release.yml), which re-runs lint/typecheck/tests/`expo-doctor` and prints a version-consistency check. It does **not** build anything.

## 5. Build with EAS

```bash
# Preview artifacts for hands-on testing first (Android APK, iOS simulator build)
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Production artifacts for the stores
eas build --platform ios --profile production
eas build --platform android --profile production
```

Notes:

- The `preview` profile in [`eas.json`](../eas.json) produces an **APK** for Android and a **simulator** build for iOS — good for internal distribution, and by definition not uploadable to either store.
- Production builds are signed by EAS-managed credentials. `autoIncrement: true` means each production build raises the build number; do not reuse an old artifact for a new version.
- Record the build URLs in the release notes/draft; they are the only place the artifact lives.
- Wait for both builds to finish before submitting — a failed iOS build with a green Android upload is how a half-release happens.

**Smoke-test the production artifacts on real devices before submitting** (this is the checkpoint CI cannot give you):

- [ ] Fresh install on iOS and Android: onboarding-free, usable immediately, no network requests observed.
- [ ] Upgrade install over the previous version: existing habits, streaks and notes intact, migration applied without a prompt.
- [ ] Create a `3 × / week` habit, check in twice, confirm the streak reads in **weeks** and the in-progress week does not break it.
- [ ] Export CSV and JSON; re-import the JSON on a clean install and compare the numbers.
- [ ] Enable a reminder, then verify it fires on a locked device, and after a reboot.
- [ ] Light and dark theme; heatmap and weekday breakdown scroll without jank on a small device.

## 6. Submit and roll out

### Android (Play Console)

`eas.json` already targets the **internal** track (`submit.production.android.track: "internal"`) and reads the key path `./google-service-account.json` (git-ignored; see [`.env.example`](../.env.example)).

```bash
# 1. internal testing track — your own accounts + a small allowlist
eas submit --platform android --profile production --track internal

# 2. closed testing (beta). Play does not accept an APK: the same production .aab
#    is used, and promotion between tracks happens in the console.
eas submit --platform android --profile production --track internal
#    ... then promote that release to "Closed testing" in Play Console
eas submit --platform android --profile production --track beta

# 3. production, with a staged rollout percentage
eas submit --platform android --profile production --track production
```

- [ ] Internal track: at least the minimum number of opted-in testers the console currently requires, installed and running for the current minimum testing period before a production request.
- [ ] Closed beta: opt-in link shared, release notes filled, the stability "pre-launch report" reviewed (Play generates one for testing tracks), crashes triaged.
- [ ] Production: **staged rollout** (a percentage such as 20%, then manual bumps) so a bad build affects a slice of installs. Halt and roll back from the console if crash-free sessions drop versus the previous release.

### iOS (App Store Connect)

```bash
# upload the EAS-built archive to App Store Connect
eas submit --platform ios --profile production

# repeat for TestFlight builds as needed
```

Then, in App Store Connect:

1. Select the uploaded build for the version; answer the export-compliance question (consistent with `ITSAppUsesNonExemptEncryption = false`) and the encryption/declarations from [legal/DATA_SAFETY.md](../legal/DATA_SAFETY.md) §3.
2. **Internal Testing (TestFlight)** — up to 100 App Store Connect users, no review needed beyond the metadata check. Install on at least one physical device per major iOS version supported.
3. **External Testing (TestFlight)** — up to 10,000 testers via a public link; requires a Beta App Review of the build. Run it for long enough to see the reminders-and-reboot path fail or not.
4. **Submit for Review** — reviewer notes from [legal/APP_STORE_CHECKLIST.md](../legal/APP_STORE_CHECKLIST.md) §7 pasted in; screenshots and privacy labels attached; manual release or a chosen date.
5. **Phased release** — enable Phased Release (Apple typically offers a 7-day staged ramp) so a rejected build cannot reach every user at once; "Release this version" bumps to 100% manually.

## 7. After the release

- [ ] Tag `vX.Y.Z` is public and matches the store version.
- [ ] GitHub release created with the changelog block and links to both EAS builds.
- [ ] CHANGELOG has a fresh `## [Unreleased]` header on top.
- [ ] Store listings' "What's new" matches; screenshots updated if the UI changed.
- [ ] ADRs added for anything that changed an architectural claim, and [SECURITY.md](../SECURITY.md)'s supported-versions table updated.
- [ ] EAS build URLs and store build numbers archived in the release notes (there is no server log to look things up in later).

## 8. Rollback

Ritual has no server, no feature flags and no OTA update channel configured for this build, so "rollback" means **replacing the artifact in the store**, not redeploying code. Plan accordingly: a store release takes hours, not minutes.

| Situation                                                    | What to do                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Play staged rollout, problem observed                        | **Stop the rollout** in the console and reduce the percentage to 0 immediately. Then either promote the previous version again or upload a fix. The staged rollout is the only true fast rollback available on Android.                                                                 |
| Play, already at 100%                                        | Upload a **new** build with a bumped `versionCode` containing the fix; a rebuild of the same version number is not accepted. There is no way to withdraw a released version from devices.                                                                                               |
| Play, in a testing track                                     | Halt the track, remove the release from it, and re-promote the last known-good build.                                                                                                                                                                                                   |
| TestFlight, before review                                    | Just delete the TestFlight build and upload a corrected one — no store review involved.                                                                                                                                                                                                 |
| App Store, pending review                                    | Reject the binary yourself in App Store Connect, fix, re-upload.                                                                                                                                                                                                                        |
| App Store, approved but not released                         | Use **Manual release** and simply do not press "Release this version"; or update the metadata/build for the same version and resubmit.                                                                                                                                                  |
| App Store, live with Phased Release                          | Pause the phased release in the console, then submit a new build. Users already on the affected version stay there until a fix version is available.                                                                                                                                    |
| Data-affecting regression (bad migration, import corruption) | 1) Ship a corrective forward migration, never an edited one. 2) Users whose history is intact should **export JSON immediately** — the export is the only recovery artifact. 3) Tell affected testers to reinstall only after the fix is available, since uninstall deletes their data. |
| Revert the release commit                                    | `git revert` the release commit on `main` and cut a new version number. **Never force-push or delete a published tag** — if a tag is wrong, cut `vX.Y.Z+1` from the corrected state and mark the old release as withdrawn in GitHub.                                                    |

**Contacts and artefacts to keep outside the repo** (they are what makes recovery possible at all): EAS credentials, the Android upload keystore and its passwords, the iOS distribution certificate/profile, the App Store Connect API key, the Play service-account JSON, and a copy of a known-good `app.json`/`eas.json` pair from the last working release.

## 9. Cheat sheet

```bash
npm ci && npm run check && npm run doctor
# bump package.json + app.json, finalise CHANGELOG.md
git commit -am "chore(release): v1.1.0" && git tag -a v1.1.0 -m "Ritual 1.1.0"
git push origin main --follow-tags
eas build --platform ios --profile production
eas build --platform android --profile production
# smoke-test both artifacts on real devices
eas submit --platform ios --profile production
eas submit --platform android --profile production --track internal
# then: TestFlight internal -> external -> review ; Play internal -> closed beta -> production (staged)
```
