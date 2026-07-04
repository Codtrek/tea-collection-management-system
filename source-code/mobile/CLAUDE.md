@AGENTS.md

# Mobile app — implementation notes

This app is built with Expo SDK 57 + expo-router (file-based routing, TypeScript). Read this
before touching mobile code — it captures decisions and gotchas that aren't obvious from the
code alone. Update this section whenever a session does something architecturally significant
(new pattern, new gotcha, new dependency choice) — don't let it drift out of date.

## Current state (as of 2026-07-04)

Shared navigation shell is built: login screen with role-based auto-redirect, `(auth)`/`(app)`
route groups, bottom tabs (Home/Notifications/Profile), and placeholder per-role dashboards for
all 8 CLAUDE.md roles. No real flows (route management, pickup requests, weight entry, etc.) are
implemented yet — those get built one at a time on top of this shell. The backend has no real API
yet (see root `CLAUDE.md`), so the app currently runs entirely against local data.

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
