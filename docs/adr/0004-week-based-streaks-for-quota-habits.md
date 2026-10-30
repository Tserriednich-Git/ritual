# ADR 0004 — Week-based streaks for weekly-quota habits, plus a grace rule

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** Gabriel
- **Related:** [`src/domain/streak.ts`](../../src/domain/streak.ts) · [`src/domain/frequency.ts`](../../src/domain/frequency.ts) · [architecture §4](../ARCHITECTURE.md#4-why-the-streak-maths-is-pure-and-framework-free)

## Context

Ritual supports three frequency models ([`src/domain/types.ts`](../../src/domain/types.ts)):

```ts
type Frequency =
  | { kind: 'every_day' }
  | { kind: 'times_per_week'; target: number } // 1–7, validated
  | { kind: 'specific_days'; days: Weekday[] }; // e.g. Mon, Wed, Fri
```

A streak has to mean something coherent for all three. The naive definition — "consecutive days with a check-in" — works for `every_day` and mostly works for `specific_days`, and fails completely for `times_per_week`. Walk a 3×-per-week habit through a normal fortnight:

```text
Mon Tue Wed Thu Fri Sat Sun | Mon Tue Wed Thu Fri Sat Sun
 ✓       ✓       ·   ·   ·  |  ·       ✓   ·       ✓   ·
        (3 check-ins: week target met)
```

Under day-consecutive counting the streak is **1**, and it breaks on the very first day the user was not required to do anything. The rule itself makes almost every day "not due": a habit that asks for three sessions per week is satisfied by a pattern with gaps in it. Penalising the gaps is penalising the design of the feature.

Worse, the incentive it creates is actively harmful: to keep a day-streak alive, the user must check in **every single day**, which converts a weekly quota into a daily obligation. The app would then be teaching the opposite of what the user chose.

Two more observations shape the decision:

1. **Any habit can look broken on the day you measure it.** A `specific_days` habit scheduled Mon/Wed/Fri has an unsatisfied _today_ on a Tuesday. A `times_per_week` habit that will reach its target on Sunday has an unsatisfied _current week_ on Wednesday. Freezing the streak on either would be wrong, and it would be wrong on most days of the week — so the app would need to be right about "is the period still open?" and not about "did the user fail?".
2. **Streaks are the emotional core of the product.** A number that resets for a reason the user cannot see is not a metric, it is a complaint. The rule has to be explainable in one sentence on the Progress screen.

## Decision

**Streaks are counted over consecutive _due periods_, and the period unit depends on the frequency model. The newest period is always in grace.**

### 1. Period = day, except for weekly quotas

`computeStreak` returns a `Streak` carrying its own unit ([`src/domain/streak.ts`](../../src/domain/streak.ts)):

```ts
type StreakUnit = 'day' | 'week';
type Streak = { unit: StreakUnit; current: number; longest: number };
```

| Frequency        | Period series                                                  | Satisfied when                                                            | Streak of 6 reads as             |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------- |
| `every_day`      | every calendar day from the habit's start date                 | that day is in the completion set                                         | "6 days"                         |
| `specific_days`  | only the weekdays the rule schedules (via `scheduledDays`)     | that scheduled day is in the completion set                               | "6 days" (of the scheduled kind) |
| `times_per_week` | ISO-8601 week keys from start to today (via `weekKeysBetween`) | the number of completions whose `weekKey` equals that key is **≥ target** | **"6 weeks"**                    |

For `times_per_week`, unscheduled-gap days simply do not exist as periods: the week is the atom. Any day inside the week is a legitimate place to hit the quota, which is why `isScheduledOn` returns `true` for every day for that model — the obligation is weekly, not daily.

### 2. The grace rule

`currentRun` walks the period list backwards from the newest period and takes a `gracePeriod` argument: the period the user is **still inside** — today for day-unit habits, `weekKey(today)` for week-unit habits.

- A satisfied period extends the run.
- An unsatisfied period **that is the last element of the list and equals `gracePeriod`** is skipped, not fatal: the loop continues to the previous period.
- Any other unsatisfied period terminates the scan.

Consequences of that exact shape:

- An unchecked **today** does not break a daily streak. Streaks survive a normal Tuesday evening.
- An in-progress **week** that has not reached its quota yet does not break a weekly streak, so a 3×-per-week habit with one check-in so far keeps showing the streak earned last week.
- Grace applies **only** to the newest period. Once Monday arrives, the previous week is closed: if its quota was missed, the streak ends there. The rule defers judgement by one period; it does not waive it.
- `isSatisfiedToday` is deliberately separate from the streak: it answers "does the row show as done?" (for a weekly habit, "has this week's quota been met?"), which is not the same question as "is the streak alive?".

### 3. Longest is clamped

`computeHabitStats` returns `longestStreak: Math.max(streak.longest, streak.current)` ([`src/domain/stats.ts`](../../src/domain/stats.ts)), so the historical maximum can never display below the live streak — an invariant that matters most for weekly habits, where the newest period is often incomplete.

### 4. The UI must render the unit, always

`streakLabel` emits "6 days" or "6 weeks" and the Progress screen shows the unit; a bare number for a weekly habit is treated as a bug, not a simplification.

## Consequences

### Positive

- **The number matches the promise.** A habit that asks for three sessions a week is graded on weeks, which is what the user agreed to. Nothing in the app can make a weekly habit silently become a daily one.
- **No punishment for the design of the frequency model.** Gaps that the rule itself creates cannot kill a streak, which removes the "why did it reset on Thursday?" class of complaints entirely.
- **Explainable in one sentence:** "a week counts as done when you hit the target; the week you are in right now can't break it yet."
- **One engine, three models.** Day and week streaks share `currentRun` and `longestRun`; the only differences are the period series and the satisfaction predicate. That is ~30 lines of branching rather than three near-duplicate algorithms.
- **Deterministic and unit-testable.** The whole rule set lives in a pure function taking `(frequency, completions, startISO, today)`, so "in-progress week keeps the streak", "closed week that missed its quota breaks it", and "an ISO week straddling New Year" are each one small test with an injected clock — no mocks, no clock faking, no database.
- **Consistency % stays honest alongside it.** `expectedCompletions` splits a 28-day window into whole weeks plus a remainder, and the remainder contributes at most `target` (`wholeWeeks * target + min(remainder, target)`), so a weekly habit's 28-day consistency is "check-ins ÷ what four weeks asked for" and cannot demand 28 daily check-ins.
- **Travel and DST safety for free.** Weekly units are computed from stored civil dates and ISO week keys, never from instants, so a streak does not shift when the user flies across zones (see [architecture §5](../ARCHITECTURE.md#5-the-date-model-civil-dates-not-instants)).

### Negative

- **"Streak" now means two different things.** Six days and six weeks are not comparable, so a leaderboard of streaks — or any future cross-habit ranking — would be meaningless without normalising by unit. The type carries the unit precisely to make the ambiguity visible.
- **Weekly numbers look small.** Someone who has kept a 3×-per-week habit for two months sees "8 weeks", not "56 days", and might read that as a weaker achievement. Mitigated by wording (the unit is always shown), not by maths.
- **A missed week is not discovered for up to seven days.** Because the in-progress week is in grace, the user can drift through a week and see the streak collapse at the rollover rather than at the moment they gave up. A "quota progress this week: 2 of 3" affordance is the honest mitigation and is on the roadmap.
- **Week-start semantics are split today, and that split is a known debt.** Weeks for streak purposes are Monday-based ISO weeks (`startOfWeekISO(iso, weekStartsOn = 1)` and `weekKey`), and the ISO year is pinned by the week's Thursday, so `2027-01-01` can belong to `2026-W53`. A stored `weekStartsOn` preference (0 = Sunday, 1 = Monday) exists and drives how the detail screen's week strip is _drawn_, but it does not yet move the streak period boundary. Correct, but a first-of-the-year streak question is likely enough that the tests must cover it — and changing the accounting week is a behaviour change that re-assigns which completions fall in which period, so it is not a cosmetic setting.
- **The heatmap looks different for weekly habits.** Since every day is technically "allowed" for a quota habit, the contribution grid shows due-on-every-day and marks only the days actually checked. A weekly habit's grid is sparser by design and can read as low consistency at a glance; the Progress screen pairs it with the week-level number to compensate.
- **One check-in per day only.** The unique `(habit_id, local_date)` constraint means a "5 × 10 minutes today" habit cannot record five separate sessions; a weekly quota is satisfied by distinct days. Deliberate for a habit tracker, but it is a real modelling limit.
- **Grace can mask a genuinely lost streak for a day.** A user who intends to skip forever will see a "live" streak until the period closes. Accepted: the alternative is worse (resetting everyone nightly).

### Neutral / follow-on effects

- Streak history across a **frequency change** (daily → 3×/week) changes the unit mid-history. The engine derives everything from the habit's _current_ frequency and its completion set, so an edit can move a number. Editing a long-lived habit's frequency is therefore a UX decision to make deliberately (confirm prompt), not a silent form field.
- Any new frequency model must answer "what is a period?" before it can be scheduled. That question is now the extension point of the streak engine.
- Export/JSON includes completion dates only — never streak values — so importing into a future build with different streak rules recomputes rather than trusts. That is intentional and worth protecting in review.

## Alternatives considered

| Alternative                                                    | Why rejected                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day-consecutive streaks for everything**                     | The baseline habit apps ship. It grades a weekly quota against a rule the user never chose, resets for gaps the schedule mandates, and pushes users to check in daily to protect a number. Fundamentally wrong for `times_per_week`.                                                                                                                                                                                      |
| **Goal-based streaks ("N of M days in the last M days")**      | A common and defensible compromise: a rolling window, "3 of the last 7". Rejected for the streak display because a window metric does not produce a stable, monotone "consecutive periods" number the user can grow — the value can silently drop as the window slides, which is confusing for the headline figure. Retained where it fits better: **consistency % is exactly this shape** over a trailing 28-day window. |
| **Grace as a count of allowed skips ("skip 1 day per week")**  | Feels generous, and invites the app to become a negotiation: users hoard skips, and the streak's meaning becomes "days plus favours". The chosen rule grants grace only to a period that is _still open_, which needs no bookkeeping and no explanation of a currency.                                                                                                                                                    |
| **Storing a `current_streak` column updated on each check-in** | Cheap to read, and the first thing to drift: edits to history, imports, archive/restore, frequency changes and day-boundary rollovers all require an increment/decrement path that will eventually be wrong. Recomputing from completion rows is O(small) and cannot lie.                                                                                                                                                 |
| **Week-based streaks for `specific_days` too**                 | Superficially symmetric, and wrong in practice: a Mon/Wed/Fri habit has a definite obligation _per day_, so day-granularity is meaningful and the user's misses are specific. Weekly aggregation would hide "you skipped Wednesday twice" behind "last week was fine".                                                                                                                                                    |
| **Midnight rollover that resets nightly**                      | The standard behaviour of most trackers, and the source of nightly anxiety ("did I check in before the day changed?"). Deferring judgement until the period closes removes the race entirely — and is one reason the app stores civil dates instead of instants.                                                                                                                                                          |
| **A separate "weekly consistency" metric instead of a streak** | Honest but unbranded: users understand streaks, and consistency already exists as its own number in this app. Two near-identical indicators on one screen would compete for attention without adding information.                                                                                                                                                                                                         |
