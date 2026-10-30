# ADR 0003 — React Navigation instead of Expo Router

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** Gabriel
- **Related:** [architecture §9](../ARCHITECTURE.md#9-navigation) · [ADR 0001](./0001-offline-first-no-backend.md)

## Context

**First, the honest part: Expo Router is the default recommendation for new Expo apps, and the generic Expo agent guidance in this repository says so too.** This ADR is therefore a deliberate trade against the documented default, not an expression of ignorance about it — which is why [`AGENTS.md`](../../AGENTS.md) carries an explicit exception for this project, so that a future contributor or agent does not "helpfully" migrate the navigation tree. If you are reading this to decide whether to switch, assume the default and require a reason like the ones below to depart from it.

Ritual's navigation is genuinely small and genuinely unusual for a router-first app:

- **Three bottom tabs** — Today, Progress, Settings.
- **One native-stack screen layer above the tabs** — `HabitEditor` for create and edit (`{ habitId?: string }`) and `HabitDetail` for one habit's history (`{ habitId: string }`). That is the entire graph: three tabs plus two stacked screens.
- **Deep-linking is not a product requirement.** The app has no web target it cares about, no shareable content URLs, no email links, no server-side redirects; the `ritual://` scheme exists mainly as a config artifact whose abuse we discuss in [SECURITY.md](../../SECURITY.md).
- **No authentication gate and no permission-gated redirect graph** — there is no account to gate on ([ADR 0001](./0001-offline-first-no-backend.md)). The only first-run state is a single preference flag that seeds three starter habits exactly once; nothing redirects anywhere, so there is no "send the user to sign-in after action X" logic for a router's layout-based guards to own.
- **Testability of the screen contract matters to me.** I want to render a screen with a known param and assert on it, and to assert that an action changed navigation state — without involving a filesystem-to-route mapping.

The trade available is roughly: file-based routing with URL-as-state, automatic deep linking and nested layouts (Expo Router) versus explicit, imperative navigators with a single hand-written param list (React Navigation).

## Decision

**Use React Navigation directly for the 1.0 build of Ritual.**

- `@react-navigation/native` provides the container; `@react-navigation/bottom-tabs` provides the three tabs; `@react-navigation/native-stack` provides the modal-ish HabitEditor stack on top. Native primitives back the stacks through `react-native-screens`, and layout uses `react-native-safe-area-context`.
- **Navigation configuration lives in `src/app/navigation`**: `TabsParamList` and `RootStackParamList` in `types.ts`, the navigator trees in `RootNavigator.tsx`, and `RootStackScreenProps` / `TabsScreenProps` composites for screens that need explicit props. A `declare global { namespace ReactNavigation { interface RootParamList } }` augmentation makes plain `useNavigation()` typed without a wrapper hook. Screen components are otherwise navigation-agnostic — they receive navigation through those typed hooks, not through route-file conventions.
- **Route params are the only public navigation contract.** `HabitEditor` takes `{ habitId?: string }` — absent means "create", present means "edit"; `HabitDetail` requires `{ habitId: string }`. Adding a route means editing the param list first, so a type error, not a runtime surprise, is the reviewer's feedback mechanism.
- **No string-literal `navigate('Whatever')` calls.** Types are enforced through the param lists; untyped navigation is a review comment.
- **The `ritual://` scheme stays declared in [`app.json`](../../app.json)** because the config asks for it, but no route handler is registered beyond what the app needs, and no untrusted input is accepted from a URL.
- **Screen components stay plain exports** so `@testing-library/react-native` can render them with a purpose-built navigation prop rather than requiring the whole route tree to exist.

## Consequences

### Positive

- **Explicit beats implicit for a portfolio review.** The whole navigation graph fits in one readable file; a reviewer (or a future me) does not have to reconstruct nested layouts, route groups, `(tabs)` folders and index-route resolution from a directory listing.
- **Fewer moving parts at runtime.** No filesystem watcher, no route-manifest generation step, no build-time route map to keep in sync with a Metro cache. One dependency chain, documented at [reactnavigation.org](https://reactnavigation.org), which behaves identically in a bare React Native project — so the knowledge transfers without an Expo-specific layer to unlearn.
- **Better unit-test ergonomics.** A screen can be rendered inside a one-line test navigator with a chosen param, and navigation assertions are ordinary state assertions. There is no route-file layout to reproduce in the test harness, and no need to mock a router singleton whose behaviour depends on which directory the test file happens to sit in.
- **Smaller blast radius when something goes wrong.** With file-based routing, a renamed folder silently renames a public URL and breaks deep links; here, a rename is a compile error at every call site. For an app whose only "public URL" is a scheme nobody links to, the implicitness buys nothing.
- **No web/URL semantics to reason about.** Ritual does not want `Link`/`href` semantics, static-route export, or a `router.push` that has to behave differently on the web than on the device; the target is iOS and Android only.
- **Predictable upgrade surface.** Navigation v7's tab/stack APIs are stable and documented across two platforms; a router-level regression would not take my app's shell down with it.

### Negative

- **Boilerplate I own.** Every route is registered by hand in a param list and in a navigator. There is no automatic "screen = file" mapping, no co-located `+api` handlers, no built-in static routes or typed generated links — a whole category of Expo Router conveniences is traded away, and adding screens is a two-file change instead of a one-file change.
- **Deliberate divergence from the project's own guidance and from the current Expo default.** A contributor who follows `AGENTS.md` will expect `src/app/*` route files and must read this ADR before submitting a router-shaped PR. `src/app/navigation` looks superficially like the Expo Router convention, which is a genuine readability hazard; the [architecture doc](../ARCHITECTURE.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md) both call this out so nobody "fixes" it by accident.
- **Deep linking is manual if it ever becomes necessary.** Registering link handling later means writing configuration React Navigation gives me for free today via a router; the migration is cheap for `ritual://` but non-trivial if I ever want universal web links.
- **Shared-state-per-screen patterns are DIY.** No layout-level loader or route-based data binding; hydration lives in the store, which is where I want it, but I own that discipline instead of inheriting it.
- **Re-review cost on migration.** Should Expo Router become clearly better for this app (more screens, real deep links, a shared detail URL), the rewrite is mechanical but touches every screen file, so this decision has a real switching cost that should be recorded rather than quietly reversed.

### Neutral / follow-on effects

- The dependency rule gets a second beneficiary: because screens are navigation-agnostic, `src/domain` remains the only place rules live, and navigation stays a thin shell with nothing worth testing beyond wiring.
- The tab/stack split becomes a documentation promise: Progress and Settings are tabs because they are peer destinations; the editor is a stack screen because it is task-modal. A future PR should justify any move against that reasoning rather than by taste.

## Alternatives considered

| Alternative                                                             | Why rejected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expo Router (the default)**                                           | Strongest fit for URL-centric apps, multi-platform targets, tab groups with typed generated links and co-located API routes. Ritual has none of those needs; adopting it would mean accepting filesystem-derived routes and a build-time route layer whose value only appears in dimensions this app deliberately does not have. Rejected on scope, not on quality. If Ritual ever gains shareable content, a web target or a multi-step gated flow, this ADR should be reopened — that is the trigger condition. |
| **Expo Router for tabs, React Navigation stacks inside routes**         | The pragmatic hybrid, and honestly the cheapest to defend: routes as files with an explicit stack inside a tab. Rejected because it pays the cost of _both_ layers while keeping only one of the benefits, and because the hybrid still leaves me with router-generated artifacts to reason about when a test needs a screen in isolation.                                                                                                                                                                        |
| **React Navigation with `expo-router`'s typed links via manual config** | Not a real option; typed generated links come from the router's route manifest, so there is nothing to keep without adopting the router.                                                                                                                                                                                                                                                                                                                                                                          |
| **React Navigation v6**                                                 | Newer than my training data and older than the project's pins; `package.json` carries v7 (`@react-navigation/*` ^7.x) with `react-native-screens` ~4.30, which is the combination Expo SDK 58 recommends. Choosing v6 would be an unforced compatibility problem.                                                                                                                                                                                                                                                 |
| **Redux-based navigation integration**                                  | Navigation state mirrored into a global store for time-travel/debugging. Unnecessary: navigation here is two screens deep, and `zustand` already holds the app state it would need to coexist with.                                                                                                                                                                                                                                                                                                               |
