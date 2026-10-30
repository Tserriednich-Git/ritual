# ADR 0001 — Offline-first, no backend

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** Gabriel
- **Related:** [ADR 0002](./0002-expo-sqlite-over-async-storage-or-watermelondb.md) · [architecture](../ARCHITECTURE.md) · [privacy policy](../../legal/PRIVACY_POLICY.md)

## Context

Ritual is a habit tracker in a category where the dominant business model is a subscription funded by engagement loops: cloud accounts, cross-device sync, push notifications from a server, analytics funnels and A/B-tested reminders. That model creates incentives the product does not need — more data collected, more notifications sent, more reasons to open a dashboard rather than do the habit.

I wanted a portfolio app whose privacy posture is not a claim but an architectural fact, because a claim can be undermined by one dependency someone adds in a hurry while an absent server cannot. Two constraints follow immediately from that wish:

1. No server exists to sync with, so the device is the only place data can live.
2. No account exists, so the app must be fully useful on first launch with zero setup.

The dataset is also genuinely small: a handful of habits (the validation layer caps active habits at 24) and one short row per check-in per day. Multi-gigabyte sync arguments do not apply. The interesting engineering question was never "how do we sync"; it was "how do we keep the numbers correct locally" — which is why the domain layer is pure and why civil dates are the storage model.

## Decision

**Ship Ritual with no backend of any kind, permanently.** Specifically:

- No server, no API, no database beyond the on-device SQLite file. No BaaS (Firebase, Supabase, Appwrite, Airtable) and no "temporary" cloud table.
- No accounts, no sign-in, no third-party authentication, no anonymous user ids.
- No analytics, no telemetry, no crash reporting, no ads, no attribution or marketing SDKs. Not even diagnostics leave the device.
- No network calls from app code, and no dependency that would need to make them.
- Notifications are scheduled **locally** with `expo-notifications` triggers. No APNs/FCM registration tokens, no push certificates for remote payloads, no notification service extension.
- Data portability, not data sync: CSV and JSON export written to a location the user chooses, and JSON import that reads a file the user selects.
- Deletion is uninstall. There is no server-side record to erase, so "delete my data" is a user action rather than a support ticket.
- Preferences (theme, reminder times) live in the same sandbox and are therefore also offline-only.

## Consequences

### Positive

- **Privacy declarations are trivially true.** The App Store label is "Data Not Collected" and the Play Data Safety form is all "No" — not because the forms were gamed, but because there is nothing to declare. There is no SDK audit surface, no data-broker relationship, and no policy drift risk when a dependency updates its collection behaviour.
- **Zero infrastructure cost and zero operational on-call.** Nothing to host, patch, monitor, scale or back up. No outage can make the app useless. No credentials to leak, and no secrets in the bundle.
- **Works in Airplane Mode by construction.** Correct behaviour on a plane, in a basement, in a country with a flaky connection, or after the developer stops paying for a service. Airplane-mode testing is a real, cheap acceptance criterion.
- **Latency and determinism.** Every operation is a local read/write; there is no loading spinner waiting on a round trip, and no offline-queue/replay logic to test.
- **Smaller attack surface and review burden.** No authentication flow, no session storage, no TLS pinning decisions, no rate limiting, no GDPR data-processing-agreement chain with vendors. The threat model in [`SECURITY.md`](../../SECURITY.md) fits on one page.
- **A defensible portfolio story.** "No backend" is a design opinion with trade-offs attached, which is more interesting in review than a CRUD app bolted to a starter template.
- **Longevity.** The app cannot be broken by a sunset, an acquired SDK, or an unpaid hosting invoice; it outlives its infrastructure by having none.

### Negative — accepted knowingly

- **No cross-device sync.** Buying a new phone means exporting JSON and importing it. Restoring a habit history across devices is a manual, user-initiated operation, and two devices editing the same data cannot exist by design.
- **No conflict resolution, ever** — which also means no merging two divergent histories by hand.
- **Backup is the user's problem, with a privacy twist.** If OS device backup (iCloud / Google One) is enabled, it may carry the app's sandbox into the user's cloud account — outside anything Ritual controls. If it is disabled, a lost phone means a lost history. Both outcomes must be documented, because the app can neither prevent nor manage them.
- **Local notifications are less reliable than push.** A scheduled trigger can be delayed or dropped by OS battery optimisation, a force-quit, an app reinstall, or a device reboot; reminders can silently stop until the user next opens the app, and there is no server to re-arm them. On Android, a development build (not Expo Go) is needed for `expo-notifications` to behave at all.
- **No remote kill switch or OTA fix without a store release.** There is no analytics to tell me a bug is widespread, no server-side flag to disable a broken feature, and — since I am not adopting EAS Update for this build — a fix means a new store review cycle.
- **No aggregated insight features.** "People who run also meditate" is impossible, and that is intentional; it also removes any path to a network permission later.
- **No user support context.** When someone reports "my streak looks wrong", I have their word and an exported JSON file, not a log. Export-based debugging is the only tool, and it only works if the export feature is excellent.
- **Growth and monetisation are structurally limited.** No email capture, no upsell surface, no cohort data. A future paid tier would require introducing the exact accounts-and-servers layer this ADR rules out — a redesign, not a feature flag.
- **Security through absence, not through strength.** If a device is compromised or its backup is read by an attacker, the habit history is readable to them: there is no server-side access control, no app-level encryption and no passphrase. That residual risk is documented rather than engineered away (see [SECURITY.md](../../SECURITY.md)).

### Neutral / follow-on effects

- The on-device database becomes the whole reliability story, which is why [ADR 0002](./0002-expo-sqlite-over-async-storage-or-watermelondb.md) exists and why migrations are treated as immutable artifacts.
- Derived-from-rows state (§3 of the [architecture doc](../ARCHITECTURE.md)) replaces any notion of a cached server-side counter.
- The CSV/JSON export format becomes a quasi-public API that must stay readable across versions.

## Alternatives considered

| Alternative                                          | Why rejected                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expo + Firebase (Auth + Firestore + Crashlytics)** | The fastest route to sync and to a "real" looking architecture — and the fastest way to make the privacy headline false. Introduces a network permission, a vendor dependency and a compliance surface for a dataset of a few hundred rows.                                                       |
| **Self-hosted API with a phone-as-client model**     | Reintroduces hosting, availability, authentication and GDPR processing duties. Solves a problem (multi-device continuity) that the export/import flow covers adequately for a portfolio product.                                                                                                  |
| **iCloud / Drive document-based sync only**          | Apple-first, awkward on Android, opaque failure modes, and it still makes "no data leaves the device" false. Kept as an OS-backup caveat instead of a feature.                                                                                                                                    |
| **Local-first with CRDT sync layer**                 | Intellectually attractive, wildly disproportionate to the data model, and impossible to test honestly at this scope.                                                                                                                                                                              |
| **Ship offline now, add sync in 1.1 ("phase 2")**    | The honest version of "it depends". Rejected because a sync layer is not additive at that point: identity, timestamps, conflicts and permissions would need to be retrofitted into a schema designed never to need them. Committing to offline-only _now_ is what makes the schema choices clean. |
