<!-- markdownlint-disable-file MD041 -->
<!--
A pull request template has no document title of its own; GitHub supplies the
heading from the PR title.

Thanks for contributing to Ritual. Fill in what applies; delete the rest.
The pull request title should follow Conventional Commits — it becomes the
squash-merge message. See CONTRIBUTING.md for the full standard.
-->

## What does this change?

<!-- One paragraph. Behaviour, not implementation detail. -->

## Why

<!-- Link the issue if there is one: `Closes #123` / `Related #123`. -->

## Type of change

- [ ] `feat` — new user-visible functionality
- [ ] `fix` — bug fix
- [ ] `refactor` — no behaviour change
- [ ] `perf` — measurable improvement
- [ ] `test` — tests only
- [ ] `docs` — documentation only
- [ ] `build` / `ci` / `chore` — tooling, dependencies, workflows

## Checklist

### Local gates

- [ ] `npm run check` passes locally (lint + typecheck + tests)
- [ ] `npm run test:coverage` passes the configured coverage threshold
- [ ] `npm run format` and `npm run format:check` are clean for the files I touched
- [ ] `npm run doctor` reports no new problems
- [ ] Markdown files pass the rules in `.markdownlint.json`

### Boundaries (see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md))

- [ ] No new import of React / React Native / `expo-*` / `@react-navigation/*` inside `src/domain`
- [ ] No SQL outside `src/db`, and every value-bearing statement is parameterised (`execAsync` only for static DDL)
- [ ] Screens talk to the store, never to the repository directly
- [ ] No derived number is persisted (streaks, consistency, heatmap cells stay computed)

### Migrations (if `src/db` changed)

- [ ] Appended a new numbered migration — **no shipped migration was edited**
- [ ] Forward-only, transactional, and non-destructive to existing user data
- [ ] A test migrates from `version - 1` to `version`
- [ ] Row mappers and the JSON export/import version updated in the same PR

### Evidence

- [ ] UI change: screenshots or a short recording attached, before/after, light **and** dark
- [ ] Domain change: tests added or updated, covering the rule's edge cases (grace period, week/year boundary, impossible dates, partial ranges)
- [ ] Notification behaviour change: verified in a **development build**, not Expo Go
- [ ] New dependency: justified below, and it does not add a network permission

### Docs and legal — required when behaviour changed

- [ ] [CHANGELOG.md](../CHANGELOG.md) has an entry under `Unreleased`
- [ ] [README.md](../README.md) (and [README.es.md](../README.es.md)) updated if a feature, script or the privacy story changed
- [ ] [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) updated if a layer boundary or data flow moved
- [ ] An ADR added or amended if this is an architectural decision
- [ ] [legal/PRIVACY_POLICY.md](../legal/PRIVACY_POLICY.md), [legal/DATA_SAFETY.md](../legal/DATA_SAFETY.md) and [legal/APP_STORE_CHECKLIST.md](../legal/APP_STORE_CHECKLIST.md) updated if the app now collects, transmits, stores or declares anything differently
- [ ] [SECURITY.md](../SECURITY.md) threat-model table updated if a new surface was introduced (permission, scheme handler, SDK, file format)

> **The privacy headline.** If this PR makes "no data leaves the device" false in any way, say so explicitly in the description. A PR that quietly weakens that claim will be closed.

## Additional notes

<!-- Trade-offs, follow-ups, things you'd defend in review. -->
