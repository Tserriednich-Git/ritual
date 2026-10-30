# Privacy Policy — Ritual

> **Disclaimer:** This document is a template for a portfolio project and is not legal advice. Review it with a qualified lawyer before using it for a production app in any jurisdiction.

**Effective date:** 2026-XX-XX
**Last updated:** 2026-XX-XX
**Application:** Ritual — an offline-first habit tracker with streaks
**Publisher:** Gabriel (`<your-username>`)
**Contact:** `<support@example.com>`

---

## 1. The short version

Ritual does not collect, transmit, sell, share or process any of your personal data. There is no server. There is no account. There is no analytics tool, no advertising identifier, no crash reporter and no tracking SDK. Everything you type into Ritual is written to a database file inside the app's private storage on your device, and it stays there.

The app makes no network requests of its own. The only action that reaches outside the app is a link in Settings that opens this policy and the terms of service in your device's browser — a deliberate tap by you, handled entirely by the browser, which sends no Ritual data with it.

The most complete way to exercise every privacy right you might have is: **export your data from Settings, then uninstall the app.** Nothing is left behind on our side, because there is no "our side".

## 2. What Ritual collects

**Nothing.** No personal data of any kind is collected by the app, by the developer, or by any third party on behalf of either.

Specifically, Ritual does not collect or request:

- names, email addresses, phone numbers or postal addresses;
- account credentials or third-party sign-in (no OAuth, no "Sign in with Apple/Google");
- payment information;
- precise or approximate geolocation;
- contacts, photos, files, calendar or microphone/camera access;
- advertising identifiers (IDFA / GAID);
- device identifiers used for tracking, or a fingerprint derived from device settings;
- analytics events, usage statistics, session data or error/crash reports;
- health, wellness or medical data in any regulated sense — habit labels and notes are text you store on your own device, never transmitted.

## 3. What Ritual stores on your device

The app needs to persist a small amount of information to function. All of it lives in a single SQLite database inside the app's private sandbox directory, which the operating system isolates from other apps.

| Data category     | Examples                                                                                                                               | Why it is needed                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Habit definitions | name, optional description, colour token, icon token, frequency rule (every day / N times per week / specific weekdays), display order | to display and schedule the habit                                                              |
| Reminder settings | optional `HH:MM` time per habit                                                                                                        | to schedule a local notification                                                               |
| Check-ins         | the local calendar date of each completed habit, a timestamp for ordering, and an optional short note (up to 140 characters)           | to compute streaks and statistics                                                              |
| Preferences       | theme selection (light / dark / system), week start (Sunday or Monday), a first-run marker                                             | to render and organise the app the way you chose                                               |
| Exported files    | JSON and CSV copies the app writes into its own `exports/` folder before handing them to the OS preview/share sheet                    | so you can keep or move your own data; these copies remain on the device until you delete them |

On the very first launch the app creates three example habits (a movement, a reading and a water-refill reminder) **with no check-ins at all** — no streak or history is invented for you. They are ordinary habits: edit or delete them like any other.

None of this is personal data _as collected by us_, because we never receive it. It is your data, in your phone, created by you.

## 4. Where the data lives, and the backup caveat

- **Location:** a file in the app's private sandbox on your device. It is not readable by other apps under normal OS guarantees.
- **Deletion:** uninstalling Ritual deletes the sandbox and therefore the database. The app has no server-side record to delete, so uninstalling is a complete erasure performed by you.
- **OS-level backups may carry the sandbox.** This is the one real caveat, and it is worth stating plainly: if you have iOS device backup to iCloud enabled, or Android's built-in backup to your Google account / Google One, the operating system may copy the app's private storage into _your_ backup. That copy is controlled by your OS and cloud-account settings, not by Ritual; Ritual has no ability to read, delete or manage it, and no way to receive it.
  - If you want Ritual's data to be outside any cloud backup, disable device backup for the app (iOS: Settings → your name → iCloud → Show All Apps → turn Ritual off from backup; Android: adjust the Google One / backup settings or exclude the app).
  - On a shared or borrowed device, remember that the app itself has no lock or passcode gate — the device passcode is the only protection.

## 5. Notifications

All notifications in Ritual are **generated locally on your device** by the operating system's own scheduling mechanism (`expo-notifications` scheduled triggers).

- There is no push notification service. No APNs (Apple Push Notification service) or FCM (Firebase Cloud Messaging) token is ever requested, generated or transmitted.
- No remote payload is fetched. No notification content arrives from any server, because there is no server.
- Notification permissions are requested only when you enable a daily reminder for a habit; if you never enable reminders, the app never asks.
- You can revoke the permission at any time in your OS settings. Ritual's reminder scheduling stops working as a result; no other functionality is affected.

## 6. Children's privacy

Because Ritual collects no personal data and transmits nothing, there is no collection of children's personal information to regulate. The design is COPPA-friendly by construction rather than by consent flow: no operator receives data about any user, adult or child.

The same reasoning covers the equivalent regimes elsewhere in the world — the UK age-appropriate design code, GDPR rules on children's data, and state minors' privacy laws. Ritual does not knowingly market to children, and it contains no content, communication, social, advertising or geolocation features that those rules typically target.

## 7. Your rights, and why they are largely moot here

Ritual is designed so that data-subject rights are satisfied by the app's own features rather than by a request to us.

### GDPR (EU/EEA) — Articles 12–22

| Right                                                 | How it works for Ritual                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Art. 12–14 Transparency                               | This document; written in plain language, with no dark patterns.                                                                                     |
| Art. 15 Access                                        | Settings → **Export data** (JSON and CSV) gives you a complete, machine-readable copy of everything the app holds.                                   |
| Art. 16 Rectification                                 | Edit any habit or note in the app; there is no shadow copy elsewhere.                                                                                |
| Art. 17 Erasure ("right to be forgotten")             | Delete a habit or its check-ins inside the app, or uninstall the app to erase everything. We hold nothing to delete, so there is no residual record. |
| Art. 18 Restriction of processing                     | Pause or archive a habit; processing happens only on your device.                                                                                    |
| Art. 20 Data portability                              | The JSON export is the portability mechanism; the JSON import reads it back.                                                                         |
| Art. 21 Objection / Art. 22 automated decision-making | Nothing is profiled, scored or decided about you. Streak maths is arithmetic on dates you entered, producing a number shown only to you.             |

If you still want a written confirmation, email `<support@example.com>`; the honest answer will be that we possess no information about you to confirm or delete.

### CCPA / CPRA (California)

Ritual does not **collect**, **sell** or **share** personal information as those terms are used by the CCPA/CPRA, so there is no data to disclose under the right to know, the right to delete, the right to correct, or the right to opt out of sale/sharing, and no "Do Not Sell My Personal Information" link is required. The rights are exercisable locally: export for access, uninstall for deletion.

## 8. Retention

The app does not retain data in the sense that a service does — it stores it until **you** delete it. There is no retention schedule, no archive, no log and no expiry, because nothing leaves the device. Deleting a habit removes its future scheduling; archiving keeps history for statistics, and uninstalling removes everything.

## 9. Third-party code, SDKs and services

Ritual ships open-source libraries as part of the app bundle. None of them phone home, and none of them collect personal information for their own purposes. As of the versions in `package.json`:

### Runtime dependencies

| Library                                                                                                                                                 | Purpose                                         | Network / tracking behaviour                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| `expo`, `expo-sqlite`                                                                                                                                   | React Native runtime and local database         | local file I/O only; no network                           |
| `expo-notifications`                                                                                                                                    | on-device scheduled reminders                   | local triggers; push registration is not used by this app |
| `expo-constants`, `expo-device`                                                                                                                         | app metadata and "is this a real device" checks | reads device info for UX decisions; does not transmit it  |
| `expo-file-system`                                                                                                                                      | writing export files you choose to save         | local file I/O                                            |
| `expo-status-bar`, `expo-splash-screen`                                                                                                                 | status bar styling and the launch screen        | none                                                      |
| `react`, `react-native`                                                                                                                                 | UI runtime                                      | none                                                      |
| `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context` | navigation and layout                           | none                                                      |
| `zustand`                                                                                                                                               | in-memory state container                       | none                                                      |

**Tooling that never runs on a user's device**: `jest`, `jest-expo`, `@testing-library/react-native`, `babel-preset-expo`, `eslint`, `eslint-config-expo`, `eslint-plugin-react-hooks`, `prettier`, `expo-doctor`, `typescript` and type definitions. All of them are `devDependencies`, and none is imported from app code — they are loaded only by the test runner and the lint/format/build scripts. Metro bundles what the app imports, so nothing in this paragraph reaches a user's phone.

There is no Firebase, no Sentry or other crash reporter, no Adjust/AppsFlyer/Branch, no AdMob, no Facebook/Meta SDK, no Analytics/Segment/Amplitude/Mixpanel, and no payment SDK in this project.

`Linking` is part of React Native core and is used once: the Settings screen opens the hosted privacy-policy and terms pages in your browser. It carries no app data, no identifiers and no parameters built from your habits; it is a plain browser open initiated by you.

Because dependencies can change, this table describes the current release; the authoritative list is always `package.json`, and CI runs `expo-doctor` plus a dependency audit as described in [`../SECURITY.md`](../SECURITY.md).

## 10. Changes to this policy

Any change will be published in this file in the repository, with the "Last updated" date above updated, and — for shipping app releases — summarised in the release notes. We will not email you, because we do not have your email address.

## 11. Governing law

This policy is governed by the laws of `<your-jurisdiction>`, and disputes are subject to the courts of `<your-jurisdiction>`. If you are in the EU/EEA, the UK or another region with mandatory consumer or data-protection rules, those rules continue to apply to you and nothing here is intended to limit them.

## 12. Contact

- Email: `<support@example.com>`
- Repository issues (for bugs, not private security reports): `https://github.com/<your-username>/ritual/issues`
- For suspected vulnerabilities, please follow [`SECURITY.md`](../SECURITY.md) instead of opening a public issue.

---

Previous section: [index](../README.md) · Related: [Terms of Service](./TERMS_OF_SERVICE.md) · [Data safety form guide](./DATA_SAFETY.md) · [Security policy](../SECURITY.md)
