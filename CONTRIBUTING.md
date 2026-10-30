# Contributing to Ritual

Thanks for reading this before opening a pull request. Ritual is a small, offline-only app, so the review bar is about **boundaries and correctness**, not volume.

Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). Security issues: [SECURITY.md](./SECURITY.md) — never a public issue.

---

## 1. Development environment

| Requirement          | Value                                         | Check                            |
| -------------------- | --------------------------------------------- | -------------------------------- |
| Node.js              | **22** (pinned in [`.nvmrc`](./.nvmrc))       | `node --version`                 |
| Package manager      | npm (a `package-lock.json` is committed)      | `npm --version`                  |
| Expo SDK             | 58 (`expo@~58.0.21`)                          | `npm run doctor`                 |
| React Native / React | 0.88.1 / 19.3.0, New Architecture, Hermes     | [package.json](./package.json)   |
| TypeScript           | ~6.0.3, `strict` + `noUncheckedIndexedAccess` | [tsconfig.json](./tsconfig.json) |
| A device or emulator | iOS or Android, on the SDK 58 defaults        | needed for reminders             |

```bash
nvm use                 # honours .nvmrc
npm ci                  # exact lockfile install
npx expo start          # dev server + QR
```

Install `nvm` (or `fnm`/`volta`) if you do not have a Node version manager; do not edit `.nvmrc` in a feature PR.

### Expo Go versus a development build

| You want to work on                                    | Expo Go is enough | You need a dev build     |
| ------------------------------------------------------ | ----------------- | ------------------------ |
| Domain logic, streaks, stats, validation, tests        | yes               | —                        |
| Layout, navigation, theme, plain UI components         | yes               | —                        |
| **Reminders / `expo-notifications`**                   | **no**            | yes (Android especially) |
| `expo-sqlite` behaviour against the real native module | no                | yes                      |
| Anything after adding a library with native code       | no                | yes                      |

Build a dev client:

```bash
npm run prebuild        # generates android/ and ios/ (both git-ignored)
npx expo run:android    # or: npx expo run:ios
# cloud alternative:
npx eas-cli@latest build --profile development --platform android
```

`android/` and `ios/` are **never** edited by hand and never committed. Native behaviour is configured in [`app.json`](./app.json) and config plugins — if you find yourself wanting to patch a generated file, open an issue first.

### Environment variables

Copy [`.env.example`](./.env.example) to `.env` for local tooling. The app has **no** server secrets; these values exist only for build/CI tooling, and `.env` is git-ignored. Do not add a secret to the repository, and do not commit a real EAS project id in place of the placeholder without saying so in the PR description.

## 2. Before you commit

```bash
npm run check                       # lint + typecheck + tests
npm run test:coverage               # enforced coverage threshold
npm run format                      # prettier over ts/js/json/md/yml
npm run doctor                      # expo-doctor, dependency & config sanity
npx --yes markdownlint-cli2 "**/*.md" "#node_modules" "#dist" "#coverage"
```

[`.markdownlint.json`](./.markdownlint.json) at the repo root holds the markdown style this repository follows. The deliberate choices:

- **`MD013` (line length) is off.** Long prose tables are normal here — the store and data-safety tables would be unreadable if wrapped at 80 characters. Prettier owns wrapping for code; nobody wraps markdown tables.
- **`MD033` (inline HTML) is off**, because the README's commented-out screenshot slots and badge markup need `<img>`/HTML comments.
- **`MD024` allows duplicate headings across sibling sections**, so every ADR can repeat `Context` / `Decision` / `Consequences`.
- Everything else is the `default: true` rule set: one `#` per file, no skipped heading levels, fenced code blocks with a language hint, `-` for bullets, 2-space nested list indent, `---` horizontal rules, blank lines around tables, headings/lists/code consistently spaced.

Run it locally on the docs bundle before a PR that touches markdown (it is not yet a CI step — `npm run check` covers code only):

```bash
npx --yes markdownlint-cli2 "**/*.md" "#node_modules" "#dist" "#coverage"
```

If you change `.markdownlint.json`, justify it in the PR body — it changes every other file.

## 3. Branches and commits

- **Branch naming:** `<type>/<short-slug>` — `fix/weekly-streak-grace`, `feat/export-csv`, `docs/adr-0005`, `chore/deps-october`.
- **Base:** `main`. Keep one logical change per branch; rebase rather than merge when `main` moves.
- **Commits follow Conventional Commits** (the `type(scope): summary` form described below).

```text
<type>(<scope>): <imperative summary, ≤ 72 chars>

<body: what and why, not how — wrap at ~72 chars>
```

| Type       | Use it for                                     |
| ---------- | ---------------------------------------------- |
| `feat`     | a new user-visible capability                  |
| `fix`      | a bug fix, incl. streak/date maths corrections |
| `docs`     | README, `docs/`, ADRs, `legal/`, comments      |
| `test`     | tests only, no behaviour change                |
| `refactor` | structure change with identical behaviour      |
| `perf`     | measurable speed/memory improvement            |
| `build`    | bundler, TypeScript, EAS, dependency plumbing  |
| `ci`       | GitHub Actions workflows                       |
| `chore`    | housekeeping that fits none of the above       |

Scopes in this repo: `domain`, `db`, `store`, `notifications`, `theme`, `ui`, `components`, `today`, `progress`, `detail`, `settings`, `editor`, `navigation`, `app`, `docs`, `legal`, `deps`.

Examples:

```text
fix(domain): keep in-progress week from breaking a quota streak
feat(settings): export all habits as CSV
docs(adr): record react-navigation choice
chore(deps): bump expo-notifications to ~58.1.7
```

`feat!:` or a `BREAKING CHANGE:` footer marks anything that changes the export/JSON format, the SQLite schema, a navigation route contract or a public function signature in `src/domain`.

## 4. Layout and the dependency rule

The full picture is in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md); the part that gets PRs rejected is one line:

> **`src/domain` must not import React, React Native, `expo-*` or `@react-navigation/*`.** Everything else imports downward, never upward.

```text
src/app/navigation  src/features/*  src/components/*  src/theme
                     -> src/store (useRitualStore + selectors)
                          -> src/db (repositories, migrations, backup)  -> src/domain (pure TS)
                          -> src/notifications (reminders)             -> src/domain
```

- Screens never talk to SQLite; they call store actions and read selectors.
- `src/db` is the only module that writes SQL.
- Derived numbers (streaks, consistency, heatmap cells) are computed, never stored.

## 5. Adding a screen

1. **Decide where it belongs.** Peer destination → bottom tab; task-modal → the native stack above the tabs. Justify the choice in the PR.
2. **Add the route to the typed param list first** — `src/app/navigation/types.ts` (`TabsParamList` or `RootStackParamList`). Params are the navigation contract; no untyped `navigate('string')`.
3. **Register the screen** in `src/app/navigation/RootNavigator.tsx`.
4. **Create the feature folder** `src/features/<feature>/` with the screen, its local components, and a `__tests__/` folder. Existing features are `today`, `progress`, `detail`, `settings` and `editor`.
5. **Read data through selectors and act through store actions.** The store is `src/store/useRitualStore.ts`, screen-side subscriptions go through `src/store/useSnapshot.ts`, and derived views live in `src/store/selectors.ts`. If the screen needs a number, derive it in `src/domain` and expose it via a selector; do not compute rules in JSX.
6. **Style with `src/theme` tokens (`theme.ts`, `palette.ts`) and `src/components/ui` primitives;** app-aware composites (`HabitRow`, `Heatmap`, `MiniBars`, `WeekStrip`) sit in `src/components/`. Every screen is wrapped by `src/components/ui/Screen.tsx`. No hard-coded hex colours or ad-hoc spacing scales; if a primitive is missing, that is a separate PR.
7. **Test at least the happy path plus one empty/error state** with `@testing-library/react-native`, rendering the screen inside a minimal test navigator with explicit params.

> **Navigation note for contributors coming from the Expo docs:** [`AGENTS.md`](./AGENTS.md) describes Expo Router as the default for new Expo apps, and `src/app/` here might look like a Router directory. It is not — Ritual uses React Navigation on purpose. Read [ADR 0003](./docs/adr/0003-react-navigation-over-expo-router.md) before "correcting" the structure; a router-based PR will not be merged without discussion.

## 6. Adding a migration

Migrations live in [`src/db/migrations.ts`](./src/db/migrations.ts); `src/db/schema.ts` owns `DATABASE_NAME`, `DATABASE_VERSION` and the static `SCHEMA_SQL`.

**Never edit a migration that has shipped.** Append a new one and raise `DATABASE_VERSION` to match. A user upgrading from 1.0 must reach exactly the same schema as a user upgrading one release at a time, and rewriting an already-applied step is how live installs get corrupted.

```ts
// src/db/migrations.ts — append; never modify an earlier entry
export type Migration = { version: number; sql: string };

export const MIGRATIONS: Migration[] = [
  { version: 1, sql: SCHEMA_SQL }, // shipped
  { version: 2, sql: ADD_HABIT_NOTES_SQL }, // <- yours, with DATABASE_VERSION = 2
];
```

`runMigrations` reads `PRAGMA user_version`, enables `journal_mode = WAL` and `foreign_keys = ON` outside the transaction (pragmas cannot run inside one) and applies each pending entry with `withTransactionAsync`, setting `user_version` in the same transaction. `withExclusiveTransactionAsync` is deliberately unused: it exists only on native, and one connection per app never contends with another writer.

Rules:

1. Forward-only; no down-migrations.
2. One version number per PR per schema change; if two PRs collide on a version, the later one rebases and takes the new number.
3. Each entry is a static SQL string. `execAsync` is used for that DDL only; anything carrying a value goes through `runAsync` with `?` placeholders.
4. **No destructive migration in a released app.** `DROP TABLE`/`DROP COLUMN` that discards user history requires a data-preservation path and a `BREAKING CHANGE` note. Archiving stays a soft delete (`archived_at`).
5. Column additions are nullable or defaulted; prefer `ALTER TABLE ... ADD COLUMN` over table rebuilds.
6. Constraints over convention: if a new column needs uniqueness, add the index in the same migration. The schema already leans on `UNIQUE (habit_id, local_date)`, `REFERENCES ... ON DELETE CASCADE` and `CHECK` constraints — keep that pattern.
7. Update `src/db/mapping.ts`, the row types in `src/db/types.ts`, and the backup schema/version in `src/domain/backup.ts` in the same PR, and add a test that migrates from `version - 1` to `version`.
8. If the change affects the store's data shape, mention it in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) §6 and in [CHANGELOG.md](./CHANGELOG.md) under `Unreleased`.

## 7. Testing expectations

| Change                     | Required tests                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any `src/domain` behaviour | Unit tests in a co-located `__tests__/` folder, using the injected `today`/clock parameters rather than mocking `Date`. Cover the edge cases named in the ADRs (grace period, ISO week at a year boundary, partial ranges, impossible dates). |
| A bug fix                  | A failing test first, in the PR, that the fix turns green.                                                                                                                                                                                    |
| New screen or interaction  | Component test for the happy path plus empty and error states.                                                                                                                                                                                |
| Migration                  | Test that the schema migrates and that existing rows survive.                                                                                                                                                                                 |
| Refactor                   | No new tests, but the existing suite must stay green without edits to assertions.                                                                                                                                                             |

> [!IMPORTANT]
> **The suite is real and it is the contract.** `npm test` runs 133 tests across 11 co-located `__tests__/` files, and `npm run check` is green in CI. If a change makes a test red, the question is which of the two is wrong — the code or the expectation documented in the ADR — not how to make the red go away. Do not delete or weaken an assertion to unblock a feature; if the rule itself genuinely changed, say so in the PR and update the ADR, the README and the test together.

`jest.config.js` collects coverage from the pure logic that is asserted on — `src/domain/**/*.ts`, `src/store/selectors.ts`, `src/db/mapping.ts`, `src/utils/id.ts` and `src/components/HabitRow.tsx` — and enforces a **global threshold** on that set: 90% statements, lines and functions, 80% branches. Screens, theme files and the navigation shell are excluded on purpose; they are verified on a device, and folding them into the report would only dilute the number. Do not lower a threshold to make CI green, and do not widen `collectCoverageFrom` to hide an untested file — write the test. Tests must not hit the network or require a device.

## 8. Pull requests

Use the template at [.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md). In short:

- **Title** in Conventional Commit style; it becomes the squash-merge message.
- **One logical change.** Mixed "refactor + feature + formatting" PRs get closed with a request to split.
- **Screenshots or a short recording for any UI change** — before/after, both light and dark if the change is visible in either, on at least one platform. Paste into the PR body; store-ready frames go in `docs/screenshots/` only when they are submission assets.
- **Tests for any domain change**, and a description of _why_ the rule is right when you touch streak/date maths — a reviewer cannot tell from the diff alone whether a "6 weeks" change is a fix or a regression.
- **Docs and legal updated when behaviour changes.** If you add collection of anything, a network call, a new SDK, a permission, a data field or a notification behaviour, you must update, in the same PR: [README.md](./README.md) (privacy model + features), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [legal/PRIVACY_POLICY.md](./legal/PRIVACY_POLICY.md), [legal/DATA_SAFETY.md](./legal/DATA_SAFETY.md) and the store checklist where the declaration changes. A PR that makes the "no data leaves the device" claim false without touching those files will not be merged.
- **CHANGELOG.md**: add a line under `Unreleased` with the right Keep a Changelog subgroup (`Added`, `Changed`, `Fixed`, `Removed`).
- **No new runtime dependency** without an accompanying ADR (or a section in an existing one) explaining the trade-off, and without checking that it does not add a network permission.
- **Formatting stays mechanical.** Run `npm run format` and let prettier own style; do not reformat files your change does not touch.
- CI must be green: lint, typecheck, tests with coverage, `expo-doctor` — see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## 9. Good first issues

Issues labelled `good first issue` follow a fixed shape so they can be picked up without asking follow-up questions:

```markdown
**Title:** docs: add a weekday-label helper test for a leap year
**Area:** src/domain (date helpers) | UI polish | docs | tests
**What to do** — one or two sentences naming the exact file and the observable
outcome, e.g. "add `__tests__/date.test.ts` cases asserting that
`weekdayLabel('2028-02-29')` returns the short local name for Tuesday".
**Why it matters** — one sentence tying it to a product rule or a doc claim.
**Acceptance criteria** — a checklist: the new test file/section exists;
`npm test` passes locally; `npm run check` passes; CHANGELOG `Unreleased`
updated if behaviour (not just tests) changed.
**Pointers** — the file(s) to open, plus the ADR or architecture section that
explains the rule.
**Scope guard** — what NOT to touch in this issue (usually: "no schema change",
"no dependency", "do not reformat unrelated files").
```

Typical first-PR material: extra domain test cases, copy fixes, a missing accessibility label on a UI primitive, an ADR link in a stale doc, a README script-table correction. Not typical: migrations, dependency bumps, theme rewrites, navigation restructuring.

## 10. Getting help

- Open a discussion or an issue: `https://github.com/Tserriednich-Git/ritual/issues` (use the templates).
- Docs worth reading before asking: [README.md](./README.md) · [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · [docs/adr/](./docs/adr) · [docs/RELEASE_PROCESS.md](./docs/RELEASE_PROCESS.md)
- Reference material: [Expo docs](https://docs.expo.dev) · [React Navigation](https://reactnavigation.org)

---

Related: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) · [SECURITY.md](./SECURITY.md) · [CHANGELOG.md](./CHANGELOG.md) · [Spanish README](./README.es.md)
