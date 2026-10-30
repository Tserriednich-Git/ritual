# ADR 0002 — `expo-sqlite` over AsyncStorage or WatermelonDB

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** Gabriel
- **Related:** [ADR 0001](./0001-offline-first-no-backend.md) · [architecture](../ARCHITECTURE.md)

## Context

With no backend ([ADR 0001](./0001-offline-first-no-backend.md)), the on-device store is the entire persistence story, so its choice is load-bearing in three ways: correctness of the numbers users see, integrity of data that cannot be re-fetched from anywhere, and the honest cost of writing migrations.

What actually needs to be stored is small and relational:

- **24 active habits maximum** (`ACTIVE_HABIT_LIMIT` in [`src/domain/types.ts`](../../src/domain/types.ts)), each with a name, optional description, colour/icon token, a frequency rule, an optional reminder time, a position and timestamps.
- **One completion row per habit per day** — realistically a few hundred rows per heavy habit per year, bounded by the fact that the unique key is `(habit_id, local_date)`. Total data volume for an enthusiastic user is tens of thousands of rows at most.
- **A handful of preferences.**

The access patterns, though small, are genuinely query-shaped rather than blob-shaped:

| Query                                 | Shape                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| Today's list                          | active habits, ordered by `position`, joined against "is there a completion for today?" |
| Streak / longest                      | completions for one habit over a date **range**, in order                               |
| Consistency % (trailing 28 days)      | count of completions in a window vs. days the rule made due                             |
| Heatmap (≈18 weeks)                   | all completions between two dates, bucketed by day                                      |
| Weekday breakdown (trailing 12 weeks) | completions bucketed by weekday within a window                                         |
| Archive                               | update one row's `archived_at`, keeping its history for stats                           |
| Export                                | full scan of both tables, ordered                                                       |

Note the words _range_, _window_, _join_, _bucket_, _unique_. Those are relational requirements expressed in the app's own domain language.

## Decision

**Use `expo-sqlite` as the only persistence mechanism, behind a hand-written repository module in `src/db`.**

Concretely:

- One SQLite file inside the app's private sandbox, opened once at startup, accessed exclusively through `src/db`. Screens and store actions never write SQL.
- Schema managed by **versioned, forward-only migrations** tracked with SQLite's `PRAGMA user_version`, each applied in a transaction (see §6 of the [architecture doc](../ARCHITECTURE.md)).
- **Integrity constraints live in SQL**: `PRIMARY KEY` on ids, `UNIQUE (habit_id, local_date)` on completions, `ON DELETE CASCADE` for hard deletes, `CHECK` constraints where they are cheap. Idempotence of a double tap is a schema property, not a code path.
- **All statements that involve values are parameterised** (`runAsync` with `?` placeholders). `execAsync` is reserved for static DDL and pragmas with no interpolation — see the injection row in [`SECURITY.md`](../../SECURITY.md).
- Row→domain mapping happens in `src/db`; the domain layer never sees column names.
- Queries are bounded and indexed rather than "load everything": `idx_completions_habit_date` on `(habit_id, local_date)` backs `listCompletionDates(db, habitId)`, and `listAllCompletionDates` returns a `Map<habitId, string[]>` in one pass for the Today/Progress hydration, which is the cheapest shape for a dataset this small.
- No ORM, no query builder, no reactive layer: at this scale, a few dozen lines of typed SQL plus a mapper are cheaper to review than a framework.

## Consequences

### Positive

- **The maths the product is about becomes a query, not a loop over a parsed blob.** Range filters and grouping are native to SQLite, and they match the domain functions (`scheduledDays`, `weekKeysBetween`, `expectedCompletions`) one-to-one.
- **Correctness is enforceable at the storage layer.** A unique index makes duplicate check-ins impossible even under a re-render race or a quick double tap; a foreign key makes orphan history impossible. No key-value store offers that.
- **Predictable performance at any plausible size.** A date-range read on an indexed column is fast whether the user has 50 or 50,000 completions, so no optimisation is deferred into a future rewrite.
- **Real migrations.** Numbered, transactional, reviewable SQL is a better artifact than a hand-rolled "schema version + ad-hoc repair function" over a JSON blob, and it is the part of an offline app a reviewer can actually audit.
- **No second source of truth.** Preferences and entities both live in SQLite, so there is no key-value mirror that can disagree with the database after a crash.
- **Standard, inspectable data.** A `.db` file is a well-understood artifact: it can be dumped, opened in a tool for debugging, and used to write the JSON/CSV exporters honestly.
- **First-party and test-friendly.** `expo-sqlite` is a recommended Expo module with a config plugin, so it survives prebuild and works in a development build; the domain logic it feeds is tested without any database at all.

### Negative

- **More ceremony than a key-value set.** Migrations, a mapper, typed row interfaces and an open-connection lifecycle: three files where `setItem('habits', json)` would be one. Accepted as the cost of integrity.
- **Async API discipline.** Every call is a promise, so ordering bugs (read-before-write after a tap) become possible in exactly the way they don't with a synchronous KV write. Mitigated by the store owning hydration and by the repository being the only caller.
- **No type checking of SQL by the compiler.** A typo in a column name is a runtime error; the mitigation is a thin repository surface (one place to test) and the fact that every query is exercised by a test or by a screen covered in manual QA.
- **Migration mistakes are unrecoverable for the user.** Because there is no server copy to re-fetch from, a bad migration can destroy history permanently. Mitigations: forward-only immutable migrations, transactions, no destructive migrations in released versions, nullable/defaulted column additions, and the export feature as an escape hatch. This risk is _higher_ than it would be with a backend, and it is the direct price of [ADR 0001](./0001-offline-first-no-backend.md).
- **SQLite opens a native dependency into the app.** Expo Go does not cover it, so notification- and database-dependent testing needs a development build.
- **Migration tests are worth writing but easy to skip.** No `user_version` rollback path exists by design; down-migrations are deliberately out of scope.

### Neutral / follow-on effects

- `PRAGMA user_version` becomes the release-notes-adjacent artifact: every shipped schema change needs a numbered entry that never gets edited.
- JSON import must validate against the current schema rather than trusting an exported file's shape, since SQLite constraints will reject bad rows loudly.

## Alternatives considered

| Alternative                                                                  | Why rejected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`@react-native-async-storage/async-storage` (or `expo`-side KV)**          | It is a string key → string value store. Range queries mean loading and parsing the entire history on every Progress-screen render; "unique per habit per day" becomes a convention enforced in application code, and duplicate check-ins become a real possibility. Schema evolution becomes a bespoke JSON-version migration written by hand, with no transaction and no constraint checking. Right for a session flag, wrong for the entity store the app's numbers depend on.                                                                       |
| **MMKV (`react-native-mmkv`)**                                               | Much faster than AsyncStorage and synchronous, which is attractive — but it is still key-value: no joins, no range scans, no uniqueness constraints, no `CHECK`s, and no migration tooling. Its strengths (large numbers of small hot reads, crypto-backed variants) are not the bottleneck here; the bottleneck is query shape, which MMKV does not address. Also a third-party native module for a problem the platform already solves.                                                                                                               |
| **WatermelonDB**                                                             | Purpose-built for large collections and lazy synchronisation with a server. Ritual has hundreds of rows and _no server_, so the sync engine, the observable collections, the per-table adapters and the app-side schema definitions would be machinery driven empty. Its complexity is exactly what a reviewer would ask me to justify, and I could not. If the dataset ever became "many years of minute-level logs", it would be the first candidate to revisit.                                                                                      |
| **SQLite behind an ORM/query-builder wrapper (Drizzle, Kysely and similar)** | A typed query layer would remove the one real downside of raw SQL (compiler-blind strings) at the cost of a build-time dependency and, in some setups, a schema-to-code step. With roughly a dozen queries, a hand-written repository is easier to read and does not add a layer that could drift from the Expo module it wraps. Revisit if the query count doubles. (Note: `expo-drizzle-studio` is a developer inspection tool for Expo's SQLite files, not an application-side query layer — useful for debugging, not an alternative architecture.) |
| **Realm / `expo` file-based JSON store**                                     | Realm brings a heavy native dependency and its own migration model for a dataset that SQLite handles in a few kilobytes. A JSON file store reintroduces every AsyncStorage problem plus lost-update corruption on crash, because writes are whole-file rewrites rather than constrained row inserts.                                                                                                                                                                                                                                                    |
| **SQLite + app-level encryption (e.g. SQLCipher-style)**                     | Would raise the bar against a copied database file, at the price of a key that itself must be stored somewhere on the same device — the classic "who protects the protector" problem. Given the OS sandbox plus device encryption already in force, and a product that deliberately collects nothing, this buys little: documented as an accepted residual risk in [SECURITY.md](../../SECURITY.md) rather than rejected on technical grounds.                                                                                                          |
