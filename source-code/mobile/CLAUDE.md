@AGENTS.md

# Mobile app — implementation notes

This app is built with Expo SDK 57 + expo-router (file-based routing, TypeScript). Read this
before touching mobile code — it captures decisions and gotchas that aren't obvious from the
code alone. Update this section whenever a session does something architecturally significant
(new pattern, new gotcha, new dependency choice) — don't let it drift out of date.

## Current state (as of 2026-07-07)

Shared navigation shell (login, `(auth)`/`(app)` route groups, bottom tabs) plus four real
workflows — **Route Management**, **Pickup Management**, **Weight entry/verification**, and
**Payment calculation** — are built and fully tested (unit + service + screen levels). Dashboard
cards for "Today's Route"/"Start Route" (collector), "Manage Routes" (factory admin), "Route
Dashboard" (factory officer), "Create Pickup Request" (estate owner), "Pickup Requests"
(collector), "Enter Weight & Capture Photo"/"Manual Collection Entry" (collector), "Receive &
Re-weigh Tea"/"Assign Tea Grade" (receiving officer), "Monthly Payment Calculation" (factory
admin), and "View Payment Statements" (estate owner) now navigate to real screens instead of
"Coming soon". The backend now has auth + routes + pickup-requests + collection-records +
payments APIs (see root `Claude.md`), but the mobile app still runs against local data — the
`http/` service implementations haven't been written yet. An offline upload queue (`sync_queue`
table + `evidenceSyncService`) now covers weight-evidence photo capture — see below.

Pickup Management, Weight entry, and Payment calculation all follow the exact Route Management
pattern below:
- Pickup: `src/domain/pickupStatus.ts`, `src/services/local/pickupService.ts`,
  `src/features/pickup/`, `src/app/(app)/pickup/` — auto-assignment finds the route stop whose
  route is `active` with `route_date = today` for the estate; one-active-request-per-estate-per-day
  is enforced by a partial unique index plus an app-level check.
- Weight entry/verification: `src/domain/collectionRecord.ts` (weight validation, owner-confirm
  and receive guards, `isWeightMismatch` with a 2 kg default threshold),
  `src/services/local/collectionService.ts` (create/confirmOwner/listForCollector/
  listPendingReceiving/receiveAtFactory — receiving completes the linked pickup request and
  auto-inserts a `weight_mismatch` complaint), screens in `src/features/collection/`
  (`WeightEntryScreen` for the collector incl. the on-device "Owner Confirm" step,
  `ReceivingScreen` for the receiving officer with Super/Normal grade buttons), route in
  `src/app/(app)/collection/`. Photo evidence is stubbed (`evidence_url` nullable) until the
  offline queue/Cloudinary work.
- Offline queue (evidence upload only): `src/domain/evidenceSync.ts` (`EvidenceStatus` =
  `'none' | 'queued_offline' | 'uploaded'`, `canCaptureEvidence`/`resolveCaptureOutcome`/
  `canRetryUpload`), `src/services/local/evidenceSyncService.ts`
  (`createLocalEvidenceSyncService(dbProvider, { isOnline, uploader })` — same DI pattern as
  every other service, plus two extra injected deps so tests can fake connectivity and the
  uploader; `captureEvidence` uploads immediately when online or inserts a `sync_queue` row of
  `entity_type = 'collection_evidence'` when offline; `flushQueue` retries all pending rows for
  that entity type, incrementing `attempts`/`last_error` on failure and leaving them `pending`
  for the next flush). `src/services/sync/connectivitySync.ts` wires
  `@react-native-community/netinfo`'s `addEventListener` to call `flushQueue()` on an
  offline→online transition — started once from `src/app/(app)/_layout.tsx`'s root effect. Not
  unit tested itself (thin native-module wiring); the DI-tested logic in
  `evidenceSyncService.test.ts` is what's actually verified. The production uploader
  (`localEvidenceSyncService`'s `uploader` dep) is a stub returning a fake
  `https://stub-evidence.local/...` URL — swap for real Cloudinary once credentials exist; the
  queue/retry mechanism itself is real, not stubbed. Scoped deliberately to evidence upload only:
  every other mobile write (routes/pickup/collection/payments) is a plain local SQLite write
  that always succeeds regardless of connectivity, so it doesn't need queuing — the app doesn't
  call the backend API from the device at all yet.
- Payment calculation: `src/domain/payment.ts` (`validatePaymentRates`,
  `calculateMonthlyPayment` — gross = super/normal weight × rate, net = gross minus transport +
  fertilizer + advance deductions + the per-transaction `bankTransferFee`, `DEFAULT_BANK_TRANSFER_FEE`
  = Rs 3), `src/services/local/paymentService.ts` (`generateForMonth` aggregates graded received
  weight for an owner+factory+month via a join across `tea_receiving_records` →
  `tea_collection_records` → `estates`, excludes `self_delivered` rows from the transport-weight
  sum, rejects duplicates and zero-weight months; `finalize`/`listForOwner`/`listAll`), screens in
  `src/features/payments/` (`GeneratePaymentScreen` for factory admins,
  `PaymentStatementsScreen` for estate owners), route in `src/app/(app)/payments/`.

### Route Management (first real feature — reference this as the pattern for the next ones)

- `src/domain/routeStatus.ts` — pure state-machine functions (`canStartRoute`, `canSetDelayed`,
  `canSetCancelled`, `canCompleteRoute`), zero DB dependency, fully unit-tested.
- `src/db/asyncDb.ts` — `AsyncDb` interface: the minimal subset of `expo-sqlite`'s async API that
  services depend on. `src/db/schema.ts` holds the actual `CREATE TABLE` DDL as a function taking
  an `AsyncDb`, shared between the real app (`src/db/index.ts`, via `expo-sqlite`) and tests.
- `src/db/testUtils/inMemoryDb.ts` — test-only `AsyncDb` backed by `better-sqlite3` (a real SQL
  engine, not a hand-rolled fake). **Why**: `expo-sqlite`'s native module doesn't run under Jest
  at all (`NativeDatabase is not a constructor`), so SQLite-backed services are tested via
  dependency injection — `createLocalRouteService(dbProvider: () => Promise<AsyncDb>)` — with the
  in-memory db injected in tests and the real `getDb()` wired in production
  (`export const localRouteService = createLocalRouteService(getDb)`). Apply this same DI pattern
  to any new SQLite-backed service.
- Screens (`src/features/routes/`) mock `@/services` and `expo-router` entirely rather than using
  DI — this matches the existing screen convention (import the singleton service directly).

## Architecture

- `src/app/` — expo-router routes only (thin: each file just renders a component from
  `src/features/`). `(auth)` group = unauthenticated stack, `(app)` group = authenticated tab
  shell. Both group layouts redirect (`<Redirect>`) based on `useAuthStore().user`.
- `src/features/<domain>/` — screen-level components (e.g. `auth/LoginScreen.tsx`,
  `dashboard/DashboardScreen.tsx`). Route files import from here.
- `src/components/` — shared presentational primitives (`Button`, `Card`, `TextField`,
  `ScreenContainer`, `ThemedText`, `ThemedView`, `EmptyState`). Build new screens out of these.
- `src/services/` — the data-access boundary. `types.ts` defines interfaces (e.g. `AuthService`);
  `local/` holds the current SQLite-backed implementation; `index.ts` exports whichever
  implementation is active. **When the backend API exists, add an `http/` implementation and
  swap it in `index.ts` — don't change screens or the store.**
  `src/store/` — zustand stores (e.g. `authStore.ts`), persisted via `secureStorage.ts`.
- `src/db/` — local-first SQLite (via `expo-sqlite`). Lazily opened/seeded through `getDb()`.
- `src/constants/theme.ts` — all design tokens (colors, fonts, spacing, radius). No raw hex/px
  values in components — use these tokens.

## Gotchas (hard-won — don't re-break these)

- **Use expo-sqlite's async API only** (`openDatabaseAsync`, `execAsync`, `getFirstAsync`,
  `getAllAsync`, `runAsync`). Never the `*Sync` variants — they require `SharedArrayBuffer` via a
  blocking Atomics wait, which isn't available on web and causes a hard-to-diagnose
  "Sync operation timeout" crash.
- **`app.json`'s `web.output` must stay `"single"`** (client-only SPA), not `"static"`. Static
  output triggers server-side prerendering that executes native-only modules (SecureStore,
  SQLite) in a headless Node context with no `window` — this crashes the entire dev server, not
  just the affected screen.
- `src/store/secureStorage.ts` branches on `Platform.OS === 'web'` to use `localStorage` instead
  of `expo-secure-store` (which has no working web implementation). Keep that branch if you touch
  persisted storage.
- `metro.config.js` (repo root of this package) adds `'wasm'` to `resolver.assetExts` — required
  for expo-sqlite's web build to resolve its wa-sqlite `.wasm` asset. Don't remove it.
- Don't add COOP/COEP header middleware to `metro.config.js` "to fix SharedArrayBuffer" — it's
  unnecessary once you're on the async SQLite API, and it actively breaks future cross-origin
  image loading (e.g. Cloudinary photos) via `require-corp`.
- `@react-native-community/netinfo` was added 2026-07-07 for the offline evidence-upload queue's
  connectivity detection (`src/services/sync/connectivitySync.ts`). It's only imported from that
  file and the production `localEvidenceSyncService` singleton — never import it directly into a
  screen or a unit-tested service; inject an `isOnline: () => Promise<boolean>` function instead
  (see `evidenceSyncService.test.ts`) so the logic stays fake-able in Jest.

## Testing gotchas (jest-expo + pnpm + React 19, set up 2026-07-07 — hard-won, don't re-break)

- `package.json`'s `"jest"` config uses `"preset": "jest-expo"` plus a `moduleNameMapper` for the
  `@/` alias (`"^@/(.*)$": "<rootDir>/src/$1"`) — Metro reads the tsconfig `paths` alias
  automatically but **Jest does not**, so without this every `@/`-aliased import fails to resolve.
- **`@babel/runtime` must be a direct dependency**, not just transitive. pnpm's strict
  `node_modules` isolation means babel's transform-runtime helpers (used by `jest-expo`'s babel
  preset) can't resolve `@babel/runtime` unless it's hoisted as a top-level dependency of this
  package — without it, every test file fails with
  `Cannot find module '@babel/runtime/helpers/interopRequireDefault'`.
- **`test-renderer` (not `react-test-renderer`) must be a direct devDependency.**
  `@testing-library/react-native@14`'s peer dependency is the new community `test-renderer`
  package (React 19 deprecated `react-test-renderer`). Under pnpm, this peer can be present in the
  store but not hoisted/symlinked at the top level unless declared directly — when missing, RTL
  fails *silently*: `render()` doesn't throw, but the returned object has no query methods
  (`Object.keys(result)` is `[]`), and the `screen` singleton throws
  `` `render` function has not been called `` on every query. If you ever see that error, check
  this dependency first.
- `tsconfig.json` needs `"types": ["jest"]` in `compilerOptions` — otherwise `tsc --noEmit` can't
  resolve `describe`/`test`/`expect` even with `@types/jest` installed (an expo/tsconfig.base +
  `moduleResolution: "bundler"` quirk, not a real absence of type defs).
- **`screen` queries (`getByText`, etc.) only attach correctly when called inside `waitFor(...)`**
  in this environment — calling them synchronously right after a bare `render()` hits the
  not-yet-attached stub and throws the same "render function has not been called" error, even
  though `render()` itself succeeded. Always wrap assertions in `await waitFor(() => expect(...))`,
  even for content that "should" already be there synchronously.
- Auto-cleanup between tests isn't reliably registered — add `afterEach(() => cleanup())`
  (imported from `@testing-library/react-native`) explicitly in every screen test file, or a test
  later in the file can see stale output from an earlier one.
- After firing an event that changes what's rendered (e.g. revealing a new field), `await
  waitFor(...)` for that new element *before* querying/interacting with it — don't chain
  `fireEvent` calls back-to-back assuming synchronous re-render.
- `package.json`'s jest config sets `"maxWorkers": 1`. Without it, the full suite is **flaky**:
  individual test files pass reliably in isolation, but running everything together
  intermittently fails with the same "render function has not been called" /
  "Unable to find an element" symptoms as above, non-deterministically (confirmed by re-running
  the same unchanged suite back-to-back — same code, different pass/fail). Root cause is the
  `screen` singleton's act-environment binding racing across parallel Jest workers. Serial
  execution (`maxWorkers: 1`, equivalent to `--runInBand`) was 100% stable across repeated runs;
  don't remove it to "speed up CI" without re-verifying stability first.

## Design system

Chosen via the ui-ux-pro-max skill for a professional agri-logistics app used outdoors by
non-technical field workers: Agriculture/Farm Tech palette (`#15803D` primary green, `#A16207`
harvest gold accent, WCAG-checked) + Plus Jakarta Sans typography (single-family, strong Dynamic
Type/Android scaling support). High-contrast, large touch targets (44pt min), no emoji icons —
`@expo/vector-icons` (Ionicons) only.

## Demo accounts (until the backend exists)

`src/db/index.ts` seeds 8 demo users, one per role, all with password `password123`. The login
screen lists them as tappable cards that autofill credentials — this is intentional scaffolding,
remove it once real authentication against the backend exists.
