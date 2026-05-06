# rift — MFE Architecture Rework Plan

> Status: **Proposal / RFC**. Supersedes the original `setup-plan.md` Phase 2.
> Goal: rework the current "N independent Vike apps with their own servers and
> hardcoded `<a href>` cross-app links" into a true micro-frontend architecture
> with **one shell server**, **shared bundles for horizontal MFEs**, **SSR +
> hydration end-to-end**, and **one vertical MFE on a different stack** as a
> showcase.

---

## 1. Goals & Non-Goals

### Goals

1. **One frontend server.** Only `apps/shell` runs the user-facing
   Node/Hono process. Per-MFE `+server.ts` / `server/hono.ts` files are
   removed. The shell server only does Auth.js + Vike SSR — it does **not**
   own any business REST endpoints.
2. **Standalone API.** A separate `apps/api` (`@rift/api`) is the only
   business-data backend. All MFEs (server-side via Vike `+data` and
   client-side via React/Stencil) consume it over HTTP. The frontend server
   does not proxy or re-implement these endpoints.
3. **Consistent header/auth in shell.** Header, nav, Auth.js session, and
   the `user` object are owned by the shell and exposed to MFEs via
   `pageContext` (SSR) and a small client-side context API (CSR). The API
   independently verifies the session for protected endpoints.
4. **SSR + hydration** for every MFE (horizontal and vertical).
5. **Horizontal MFEs (`mfe-champions`, `mfe-tier-list`)**: same stack
   (Vite + React 19 + vike-react), share React/vike/jotai/`@rift/*` chunks,
   navigate between each other and shell **without full reload**.
6. **Vertical MFE (`mfe-player`)**: different stack (StencilJS + custom
   element). Full-page reload across the vertical boundary is acceptable.
7. **Routes own themselves.** Each horizontal MFE owns its sub-routes; shell
   only declares the namespace entry (`/champions/*`, `/tier-list/*`,
   `/player/*`).
8. **Independently deployable.** Each MFE produces its own remote bundle
   that can be republished without rebuilding the shell. The API deploys on
   its own cadence too.
9. **Performance first**: shared chunks, link prefetch, streamed HTML, no
   double-shipping of React.

### Non-Goals

- Multi-region deployment / edge runtimes (out of scope for this plan).
- A custom MFE registry — we'll use static URLs / env-driven manifests.
- Replacing Vike. The shell stays Vike-first.
- Replacing Auth.js.

---

## 2. Library Evaluation

### `@module-federation/vite` (recommended)

- Active (1.15.x, Nov 2025), official Vite plugin from the Module Federation
  team, used in production by Vue/React/Nuxt/TanStack examples.
- Supports **shared singletons** (React, vike-react, jotai, `@rift/*`) so a
  remote does not re-bundle the host's React.
- Has explicit SSR support (recent fixes: "fix up SSR flow" PR #452) — remotes
  can be loaded server-side via the federation runtime.
- Plays well with Vite's dev server (hot-reload across host+remote).
- Native API is minimal: a single `federation({ name, exposes, remotes,
  shared })` plugin per app.
- Integrates cleanly with `vike` plugin (both are vite plugins).

### OpenComponents

- Mature, battle-tested (OpenTable / Skyscanner). Registry + HTTP composition
  model: components are deployed to a server that returns rendered HTML +
  hydration JS.
- Strong fit for very large orgs with many independent teams using mixed
  stacks, because it's transport-agnostic (any framework, any backend).
- **Poor fit here** because:
  - Requires running and maintaining a registry (extra ops, conflicts with the
    "one server" goal).
  - SSR is HTTP-call-per-component, which adds latency per request.
  - Sharing a React/Vike runtime across components is not a first-class
    concern — every component tends to ship its own runtime.
  - Less Vite-native; would force us to leave the Vite/Vike dev DX.
- **Verdict:** keep on the radar for the Stencil vertical (it's actually a
  good fit for "drop a component anywhere on any page"), but **don't adopt
  for the React horizontal MFEs**.

### Other considered options

- **Native ESM + import maps** — too low-level, no shared-deps story.
- **`vite-plugin-federation` (originalcopy)** — unmaintained, superseded by
  `@module-federation/vite`.
- **Single-spa** — adds another orchestration layer on top of MF without
  giving us much we don't already get from Vike + MF.

### Decision

| Concern               | Pick                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Horizontal MFE bundle | **`@module-federation/vite`** with `shared: { singleton: true }`                                                       |
| Vertical MFE delivery | Stencil **`dist-custom-elements`** + **`dist-hydrate-script`** + React wrapper, SSR via **`@stencil/ssr`** Vite plugin |
| Server                | **Hono** in shell, mounting per-MFE routers as packages                                                                |
| Cross-MFE auth        | **Auth.js in shell**, `passToClient: ["user"]` via Vike                                                                |
| Cross-MFE navigation  | **Vike Client Routing** + MF-loaded remote pages                                                                       |

---

## 3. Target Architecture

```
        +-------------------------------------------------+
        |                  apps/shell                     |
        |  Node/Hono - only the FRONTEND server           |
        |  +-------------------------------------------+  |
        |  | Auth.js (/api/auth/**)                    |  |
        |  | Vike middleware (catch-all SSR)           |  |
        |  | NO business REST endpoints                |  |
        |  +-------------------------------------------+  |
        |  Vike pages -> MF remotes + Stencil host        |
        +--------+----------------+-------------------+---+
                 |                |                   |
            MF remote        MF remote        Stencil bundle
                 |                |                   |
        +--------v------+ +-------v-------+ +---------v----+
        | mfe-champions | | mfe-tier-list | |  mfe-player  |
        | (horizontal)  | | (horizontal)  | |  (vertical)  |
        | NO server.    | | NO server.    | | NO server.   |
        +-------+-------+ +-------+-------+ +------+-------+
                |                 |                |
                +--------+--------+----------------+
                         v
              fetch() / hc<ApiType>()  (cookie / Bearer)
                         |
                +--------v------------------------------+
                |              apps/api                 |
                |  Hono on Node - the only backend      |
                |  - GET /champions, /champions/:id     |
                |  - GET /tier-list                     |
                |  - GET /player/me*       (guarded)    |
                |  - Auth.js session verify (libs/auth) |
                |  SQLite (better-sqlite3) + Drizzle    |
                |  Seeded from libs/champion + player   |
                +---------------------------------------+
```

### What "horizontal" means here

- Same runtime: React 19 + vike-react + jotai.
- Built with `@module-federation/vite` as **remotes**.
- Pages and `+data` loaders are exposed as remote modules.
- Router stays Vike (one router across the whole app); page modules are loaded
  on demand via MF.
- Bundle savings: React, react-dom, vike, vike-react, jotai, `@rift/champion`,
  `@rift/player`, `@rift/data-access`, `@rift/ui` (the React wrappers) are all
  declared as `shared: { singleton: true }`. They live in the shell bundle and
  the remotes import them at runtime.

### What "vertical" means here

- Different stack: StencilJS web component, no React inside the component
  itself. The component is consumed from a thin React wrapper (generated by
  `@stencil/react-output-target`) so Vike's React renderer can mount it.
- Built three artifacts (one Stencil build, three output targets):
  1. **`dist-custom-elements`** — the actual `<rift-player-app>` custom
     element + lazy-loadable child components. Browser-side runtime.
  2. **`dist-hydrate-script`** — a Node-only `hydrate` module that exports
     `renderToString`, `hydrateDocument`, `streamToString`,
     `createWindowFromHtml`. Used during SSR.
  3. **React output target** — a thin wrapper component (`<RiftPlayerApp />`)
     that defines the custom element on mount and forwards props.
- Shell `pages/player/+route.ts` claims `/player/*`. `pages/player/+Page.tsx`
  renders `<RiftPlayerApp currentPath={...} user={...} />`. Inside the
  Stencil app, a small hand-rolled router reacts to `currentPath` prop
  changes and emits a `routechange` custom event the shell listens to in
  order to call Vike's `navigate()` (so the URL stays in sync without a
  full reload).
- **SSR**: enabled by adding the **`@stencil/ssr`** plugin to the shell's
  `vite.config.ts`, pointed at `@rift/mfe-player/react` (the wrapper) and
  `@rift/mfe-player/hydrate` (the hydrate module). At build/SSR time the
  plugin AST-rewrites the wrapper to render a Declarative Shadow DOM string
  with all child Stencil components serialized. No `@stencil/core/internal/*`
  imports needed.
- **Hydration**: the browser bundle (`dist-custom-elements` loader) is
  loaded as a `<script type="module">`. When the custom element registers,
  Stencil picks up the existing Declarative Shadow DOM and hydrates without
  re-rendering.
- **Acceptable trade-off**: deep-linking into `/player/*` ships extra Stencil
  runtime (~10 KB gz) on top of the React shell. Intra-player navigation
  stays inside the custom element and never round-trips Vike. Cross-vertical
  navigation (e.g. `/player` → `/champions`) goes through Vike client
  routing — no full reload needed since the shell hosts both.

---

## 4. Server Architecture

### Today
- 4 separate `+server.ts` files, 4 Hono apps, 4 ports (3000/3001/3002/3003).
- `mfe-player` and `shell` both define their own Auth.js setup.
- Business endpoints (`/api/champions`, `/api/tier-list`) live in each MFE's
  Hono app, mixed with Vike SSR.

### Target

Two independent Node processes:

| Process      | Responsibilities                                           |
| ------------ | ---------------------------------------------------------- |
| `apps/shell` | Auth.js (`/api/auth/**`) + Vike SSR. **No business REST.** |
| `apps/api`   | All business endpoints. SQLite + Drizzle. Auth-aware.      |

MFEs (`apps/mfe-*`) have **no servers at all** — they ship pure remote
bundles (and, for the vertical, a custom-element bundle).

Shell `apps/shell/server/hono.ts` becomes minimal:

```ts
const app = new Hono();
vike(app, [
  authjsSessionMiddleware,
  authjsHandler,
]);
```

No MFE routers, no business REST mounted.

### Why a separate API process

- Real architectures separate frontend SSR from backend data — this plan
  reflects that for demonstration value.
- Lets the API be deployed, scaled, and rebooted on its own cadence.
- MFEs consume the API the **same way** from server (Vike `+data`) and
  client (React effects / Stencil components) — one URL, one client.
- Makes the auth boundary explicit: the API independently verifies the
  caller's session for every request.

### Auth flow

- **Browser ↔ shell**: Auth.js (Credentials provider) sets a session cookie on
  the shell origin. Shell middleware populates `pageContext.session` /
  `pageContext.user`. `passToClient: ["user"]` ships the sanitized user to
  every MFE.
- **Browser ↔ API**: same-origin in dev (Vite proxies `/api/*` → API),
  cross-origin in prod (CORS + cookie). API verifies the session itself
  using the shared `libs/auth` config.
- **Shell SSR → API**: Vike `+data` forwards the incoming `Cookie` header
  on the API client so the API sees the same session.
- **Per-MFE `+guard.ts`** still works (uses `pageContext.user`).
- **Vertical MFE**: receives `user` as a JSON-serialized prop; `fetch()`
  calls go to the API and rely on the same session cookie.

---

## 4b. The API App (`apps/api`, `@rift/api`)

### Goals
- Demonstrate a clean Vike/MFE → real backend integration.
- Stay small, modern, easy to read.
- Persistent local DB seeded from `libs/champion` + `libs/player`.
- Guard player-specific routes; reject unauthenticated calls.

### Stack

| Concern          | Pick                                                        |
| ---------------- | ----------------------------------------------------------- |
| HTTP framework   | **Hono** on `@hono/node-server`                             |
| Runtime          | Node 22 LTS                                                 |
| Database         | **SQLite** via `better-sqlite3` (`apps/api/data/rift.db`)   |
| ORM / migrations | **Drizzle ORM** + `drizzle-kit`                             |
| Validation       | **Valibot** — reuse `libs/champion` + `libs/player` schemas |
| Auth verify      | `@auth/core` `getSession()` from shared `libs/auth`         |
| Logging          | `hono/logger`                                               |
| Testing          | Vitest against `app.fetch`                                  |

SQLite + Drizzle: one file, no docker, identical on dev & CI; Drizzle is
modern, type-safe, no codegen step. Migrations: `drizzle-kit push` for dev,
generated SQL for prod.

### Structure

```
apps/api/
  package.json          # @rift/api
  drizzle.config.ts
  src/
    index.ts            # bootstrap
    app.ts              # Hono composition (exports ApiType for hc<>)
    db/
      client.ts         # better-sqlite3 + drizzle()
      schema.ts         # tables mirror Valibot schemas
      seed.ts           # idempotent seed from @rift/champion + @rift/player
    middleware/
      auth.ts           # readSession / requireUser
      cors.ts
    routes/
      champions.ts
      tier-list.ts
      player.ts         # mounted under requireUser
      health.ts
  data/                 # gitignored runtime DB
  test/
  project.json          # NX targets: build, dev, test, db:push, db:seed
```

### Endpoints (v1)

| Method | Path                         | Auth      | Returns                           |
| ------ | ---------------------------- | --------- | --------------------------------- |
| GET    | `/health`                    | none      | `{ status: "ok" }`                |
| GET    | `/champions`                 | none      | `Champion[]`                      |
| GET    | `/champions/:id`             | none      | `Champion & { abilities, skins }` |
| GET    | `/tier-list?tier&role&patch` | none      | `EnrichedTierEntry[]`             |
| GET    | `/player/me`                 | **guard** | `Player`                          |
| GET    | `/player/me/champions`       | **guard** | `PlayerChampion[]`                |
| GET    | `/player/me/matches`         | **guard** | `PlayerMatchEntry[]`              |

Responses are validated against the Valibot schemas in `libs/champion` /
`libs/player` before being sent (catches DB-vs-contract drift in dev).

### Database

Drizzle tables mirror the Valibot schemas 1:1: champions, championAbilities,
championSkins, championTiers, players (with `subjectId` unique linking to
Auth.js identity), playerChampions, playerMatches.

### Seeding

`pnpm nx run api:db:seed`:
1. Runs migrations (idempotent).
2. Upserts `SEED_CHAMPIONS / ABILITIES / SKINS / TIERS` from `@rift/champion`.
3. Creates a demo Player with a fixed `subjectId` so `mfe-player` works
   end-to-end with the demo Credentials login.

`dev` chains `db:push && db:seed && tsx watch src/index.ts`.

### Auth on the API

```ts
// apps/api/src/middleware/auth.ts
import { getSession } from "@auth/core";
import { authjsConfig } from "@rift/auth";

export const readSession: MiddlewareHandler = async (c, next) => {
  c.set("session", await getSession(c.req.raw, authjsConfig));
  await next();
};

export const requireUser: MiddlewareHandler = async (c, next) => {
  if (!c.get("session")?.user) return c.json({ error: "unauthorized" }, 401);
  await next();
};
```

```ts
// apps/api/src/app.ts
const app = new Hono()
  .use("*", logger())
  .use("*", cors({ origin: [SHELL_ORIGIN], credentials: true }))
  .use("*", readSession)
  .route("/champions", championsRoutes)
  .route("/tier-list", tierListRoutes)
  .route(
    "/player",
    new Hono().use("*", requireUser).route("/me", playerRoutes),
  );

export type ApiType = typeof app;
```

### Frontend consumption

`libs/data-access` exposes a single `createApiClient(baseUrl, init?)` using
Hono RPC and the type-only `ApiType` import:

```ts
// libs/data-access/src/api.ts
import { hc } from "hono/client";
import type { ApiType } from "@rift/api"; // type-only, no runtime dep

export const createApiClient = (baseUrl: string, init?: RequestInit) =>
  hc<ApiType>(baseUrl, { fetch: (i, r) => fetch(i, { ...init, ...r }) });
```

```ts
// apps/mfe-champions/src/pages/champions/+data.ts
import { RIFT_API_URL } from "../../env";

export async function data(pageContext: PageContextServer) {
  const api = createApiClient(RIFT_API_URL, {
    headers: { cookie: pageContext.headers?.cookie ?? "" },
  });
  const res = await api.champions.$get();
  return { champions: await res.json() };
}
```

### Dev / prod URL wiring

| Env       | Shell            | API              | Browser hits           | Vike SSR hits           |
| --------- | ---------------- | ---------------- | ---------------------- | ----------------------- |
| local dev | `localhost:3000` | `localhost:3100` | `/api/*` (Vite proxy)  | `http://localhost:3100` |
| prod      | `app.rift.dev`   | `api.rift.dev`   | `https://api.rift.dev` | `https://api.rift.dev`  |

Vite dev proxy keeps the browser same-origin in dev (no CORS); SSR calls
the API directly.

### Type sharing without runtime coupling

`apps/api` exports `type ApiType = typeof app` so `libs/data-access` gets
RPC-style type inference via `hc<ApiType>()` without bundling API code into
the frontend (standard Hono RPC pattern).

---

## 5. Routing Strategy

### Shell-owned routes (filesystem)

```
apps/shell/pages/
  +Layout.tsx            ← header, auth UI, <Link prefetch> nav
  +config.ts             ← passToClient: ["user"], extends [vikeReact]
  index/+Page.tsx        ← home
  _error/+Page.tsx       ← 404 / error
  champions/+route.ts    ← claims /champions/*  (delegates to remote)
  champions/+Page.tsx    ← thin wrapper that lazy-loads remote
  champions/+data.ts     ← thin wrapper that calls remote's loader
  tier-list/+route.ts    ← claims /tier-list/*  (delegates to remote)
  tier-list/+Page.tsx
  tier-list/+data.ts
  player/+route.ts       ← claims /player/*     (renders Stencil host)
  player/+Page.tsx       ← mounts <rift-player-app>
```

### Remote routing (horizontal MFE)

Each horizontal MFE exposes a small **route table** instead of trying to
emulate filesystem routing across the federation boundary:

```ts
// apps/mfe-champions/src/exposes/routes.ts
export const routes = [
  { match: "/",        Page: ChampionsList,  data: listData },
  { match: "/:id",     Page: ChampionDetail, data: detailData },
] as const;
```

Shell's `pages/champions/+route.ts`:

```ts
import { routes } from "remote-champions/routes"; // MF remote import

export default async (pageContext) => {
  const sub = pageContext.urlPathname.replace(/^\/champions/, "") || "/";
  const match = matchRoute(routes, sub);
  if (!match) return false;
  return { routeParams: match.params, pageContext: { remote: "champions", subPath: sub } };
};
```

Shell's `pages/champions/+Page.tsx`:

```tsx
const ChampionsApp = lazy(() => import("remote-champions/App"));
export default function Page() {
  return <ChampionsApp />; // routes resolved internally using pageContext.subPath
}
```

Shell's `pages/champions/+data.ts` simply forwards to the remote loader so
Vike's data system stays uniform:

```ts
import { resolveData } from "remote-champions/routes";
export const data = (ctx: PageContextServer) => resolveData(ctx);
```

Why this shape:

- Vike continues to drive routing, data, head tags, and SSR. No second
  router gets involved on horizontal MFEs.
- Cross-MFE links (`/tier-list` → `/champions/ahri`) use Vike's Client
  Routing and `<Link>` — **no full page reload**.
- Sub-route navigation inside a horizontal MFE (`/champions` →
  `/champions/ahri`) is also Vike client routing, since each sub-route is
  re-resolved through the shell's `+route.ts`.

### Remote routing (vertical MFE)

Shell `pages/player/+route.ts`: `/player/*` catch-all.

```tsx
// pages/player/+Page.tsx
export default function Page() {
  const { user } = usePageContext();
  return <rift-player-app user={JSON.stringify(user)} />;
}
```

`<rift-player-app>` is the Stencil component; internally it uses its own
sub-router. Navigating **within** the player UI does not round-trip Vike;
navigating **out of** `/player/*` triggers a Vike navigation.

---

## 6. Bundle Sharing

### Shared singletons (Module Federation `shared` config)

In every horizontal app:

```ts
shared: {
  react:                 { singleton: true, requiredVersion: "^19.0.0" },
  "react-dom":           { singleton: true, requiredVersion: "^19.0.0" },
  "vike":                { singleton: true },
  "vike-react":          { singleton: true },
  "jotai":               { singleton: true },
  "@rift/champion":      { singleton: true },
  "@rift/player":        { singleton: true },
  "@rift/data-access":   { singleton: true },
  "@rift/ui":            { singleton: true },
  "@rift/ui/react":      { singleton: true },
}
```

### CSS / Tailwind v4

Tailwind v4 is CSS-first (`@theme`, `@source`, `@layer`) and **cannot** be
"emitted once and used everywhere" because each app's utility CSS is built
by scanning its own source files. Solution: split into **3 layers** so only
one of them is per-MFE.

| Layer                                                     | Owned by      | Loaded                          | Contents                                                               |
| --------------------------------------------------------- | ------------- | ------------------------------- | ---------------------------------------------------------------------- |
| 1. Design tokens (`@theme`) + reset + reusable components | `libs/styles` | Shell `+Layout.tsx`, **once**   | CSS variables, base/preflight, named classes (`.btn`, `.card`, …)      |
| 2. `lol-*` web-component CSS                              | `libs/ui`     | With the component (Shadow DOM) | Scoped — zero leakage                                                  |
| 3. Per-MFE utility classes                                | each MFE      | With the MFE remote bundle      | Only the utilities **that MFE actually uses** (Tailwind v4 JIT output) |

Key points:

- **Tokens become CSS variables** (`--color-primary`, `--radius-md`, …). Once
  emitted on `:root` by layer 1, every MFE's utilities (`bg-primary`,
  `rounded-md`) resolve against them — no duplication of token values.
- **Reusable component classes** (`.btn`, `.card`) live in
  `libs/styles/src/components.css` under `@layer components` and ship in
  layer 1 only.
- **Per-MFE utilities are tiny** (~3–8 KB gz each); duplicate
  `.flex { display: flex }` across two MFE bundles is harmless.
- **Stencil component CSS** is Shadow-DOM-scoped, fully isolated.
- **Do NOT** point shell's `@source` at MFE source paths — that recouples
  deploys. Each MFE owns its own `@source` block.

Layout shape:

```css
/* libs/styles/src/index.css — imported ONCE by shell */
@import "tailwindcss";
@source "./components.css";  /* shell scans only its own + libs/styles */

@theme {
  --color-primary: oklch(...);
  --radius-md: 0.5rem;
  /* …design tokens… */
}

@layer base {
  /* preflight overrides, font-face, etc. */
}

@layer components {
  .btn { @apply inline-flex items-center px-4 py-2 rounded-md ...; }
  .card { @apply rounded-md bg-card text-card-foreground shadow ...; }
}
```

```css
/* apps/mfe-champions/src/styles.css — ships with the MFE bundle */
@import "tailwindcss";
@source "./pages";
@source "./components";
/* No @theme block — inherits CSS variables from shell */
/* No component classes — already provided by shell */
```

### Expected payload (rough)

| Asset                        | Today     | After     |
| ---------------------------- | --------- | --------- |
| React + ReactDOM (per MFE)   | ~45 KB×3  | ~45 KB×1  |
| vike-react runtime (per MFE) | ~20 KB×3  | ~20 KB×1  |
| `@rift/champion` (per MFE)   | ~6 KB×3   | ~6 KB×1   |
| Per-MFE app code             | unchanged | unchanged |

---

## 7. Independent Deployability

- Each horizontal MFE builds to `dist/` containing a `remoteEntry.js` and
  `mf-manifest.json`. Deploy these to any static host (S3 + CloudFront, etc.)
  behind a stable URL, e.g.:
  - `https://cdn.rift.dev/mfe-champions/<gitsha>/remoteEntry.js`
  - `https://cdn.rift.dev/mfe-tier-list/<gitsha>/remoteEntry.js`
- The shell reads remote URLs from env at boot:

  ```ts
  federation({
    name: "shell",
    remotes: {
      "remote-champions": { type: "module", entry: `${MFE_CHAMPIONS_URL}/mf-manifest.json`, name: "mfe_champions" },
      "remote-tier-list": { type: "module", entry: `${MFE_TIER_LIST_URL}/mf-manifest.json`, name: "mfe_tier_list" },
    },
    shared: { /* see §6 */ },
  });
  ```

- A new MFE version is rolled out by:
  1. Building & uploading the remote bundle.
  2. Updating the shell's `MFE_CHAMPIONS_URL` env var (no shell rebuild).
  3. Optional: zero-downtime by atomically swapping the URL.

- Server-side: each MFE's Hono router lives in its package. Updating the API
  **does** require a shell deploy (because we chose "one server"). Trade-off
  acknowledged — see §10.

- Vertical MFE: deploy `rift-player.js` + `rift-player.css` to CDN. Shell
  `+Head` hook references them via env var.

---

## 8. SSR + Hydration Story

- Shell's Vike server calls `renderPage(pageContextInit)` for every URL.
- For shell-owned routes: ordinary Vike SSR.
- For `/champions/*` and `/tier-list/*`:
  - Vike runs the shell's `+route.ts`, which imports `remote-champions/routes`
    via `@module-federation/vite`'s **server-side runtime** (works because MF
    has SSR support; remote modules are fetched and cached server-side).
  - `+data.ts` runs the remote's loader server-side and returns serializable
    data.
  - `+Page.tsx` renders the remote's `App` component to HTML.
  - Hydration boot: the shell's HTML includes `<script>` tags for the remote
    entry; the client MF runtime resolves them and React hydrates seamlessly.
- For `/player/*`:
  - Build-time: shell's Vite config includes the **`@stencil/ssr`** plugin
    pointed at `@rift/mfe-player/react` (the React wrapper) and
    `@rift/mfe-player/hydrate` (the hydrate module from
    `dist-hydrate-script`). The plugin AST-rewrites uses of the wrapper into
    a pre-serialized Declarative Shadow DOM at SSR.
  - Runtime: HTML ships with the DSD already inline (no extra server call
    per request), plus a `<script type="module">` for
    `@rift/mfe-player/dist-custom-elements/loader`. Stencil registers the
    custom element on `connectedCallback` and adopts the existing DSD
    without re-rendering.
  - Dynamic props (e.g. logged-in `user`) are handled by the `@stencil/ssr`
    plugin via runtime serialization.
  - For props/state that depend on per-request data the `@stencil/ssr`
    plugin can't statically resolve, fall back to manual SSR via
    `renderToString(html, { serializeShadowRoot: 'declarative-shadow-dom' })`
    from a `+onRenderHtml.ts` hook.

### Streaming

- Keep `vike-react`'s built-in HTML streaming. Remote module loading is
  awaited before the relevant Suspense boundary resolves; the shell shell
  (header, layout) streams immediately.

---

## 9. Phased Implementation

> Each phase is independently shippable and verifiable. Stop at any phase if
> ROI of the next is unclear.

### Phase A — Stand up `apps/api` + remove API from MFEs

Outcome: a working `@rift/api` process with persistent DB; MFEs fetch from
it instead of their own routers.

- A.1. `libs/auth` lib (extract Auth.js config from shell + mfe-player).
- A.2. `apps/api` scaffold: Hono + `@hono/node-server` + better-sqlite3 +
  Drizzle + Vitest; `project.json` with `dev`, `build`, `test`, `db:push`,
  `db:seed` targets.
- A.3. Drizzle schema mirroring Valibot types; `db:push` + `db:seed`.
- A.4. Endpoints from §4b table; Valibot response validation.
- A.5. `apps/api` consumes `libs/auth` for `readSession` / `requireUser`.
- A.6. `libs/data-access` rewritten on top of `hc<ApiType>()`; old per-MFE
  fetch hooks removed.
- A.7. Each MFE's `+data.ts` and React hooks switched to the new client.
- A.8. Add Vite dev proxy `/api/*` → `localhost:3100` in shell + each MFE.
- A.9. Verify: `pnpm nx run api:dev` + shell — full app works against API.

### Phase B — Consolidate the frontend server

Outcome: only `apps/shell` runs Node for the frontend; all MFE servers gone.

- B.1. Delete `+server.ts` and `server/hono.ts` from every MFE.
- B.2. Delete each MFE's now-orphaned `server/<mfe>-handler.ts`.
- B.3. Shell's header (`+Layout.tsx`) becomes canonical, uses `<Link>`.
- B.4. Each MFE's local header markup deleted; `+Layout.tsx` becomes a
  pass-through.
- B.5. `libs/styles/` with Tailwind tokens + base CSS (per §6).
- B.6. Update root `dev` script: only `nx run shell:dev` + `nx run api:dev`.
- B.7. Verify: hit `/`, `/champions`, `/tier-list`, `/player` against
  shell:3000; API at 3100; Auth flows still work.

> At this point we already have TWO processes (shell + api), consistent
> header, shared auth. Navigation between top-level routes still works
> because they're all served from the same Vike instance — but each MFE's
> pages still live in `apps/<mfe>/pages/`. We migrate those next.

### Phase C — Pull horizontal MFE pages into the shell's Vike app

Outcome: the shell is the sole Vike app for horizontal MFEs. Pages physically
live in their own packages and are imported.

- C.0. Move `apps/mfe-champions/pages/**` into
  `apps/mfe-champions/src/pages/**`. Add `"./pages": "./src/pages/index.ts"`
  to package exports (a manifest of page configs).
- C.0a. Repeat for `mfe-tier-list`.
- C.0b. Add a Vike custom config in shell that consumes those page manifests
  via filesystem routing replacement.
- C.0c. Verify: navigation between champions and tier-list uses Vike Client
  Routing — no full reload.

### Phase D — Introduce Module Federation for horizontal MFEs

> **Implementation note (April 2026):** Phase D is split into two sub-phases.
> **D-A** lands first as a low-risk client-only setup; **D-B** is the harder
> SSR-dynamic flow that we'll attempt only once D-A is stable.

#### Phase D-A — Client-only Module Federation

Outcome: horizontal MFEs are independently buildable & deployable for the
**client** bundle. Shell SSR continues to import MFE pages in-tree (via the
package `exports` map wired up in Phase C) so the rendered HTML is unchanged
from a user's perspective. Redeploying an MFE updates only the post-hydration
JavaScript — a new SSR-only field still requires a shell rebuild.

- ✅ D-A.1. Add `@module-federation/vite` to shell + horizontal MFE
  `vite.config.ts`. (Catalog entry added; per-MFE `vite.config.ts` created.)
- ✅ D-A.2. Restore a minimal `vite.config.ts` per horizontal MFE that **builds
  only** (no Vike, no app entrypoint) and emits `remoteEntry.js` exposing
  the page modules. Each MFE has a tiny `index.html` + `src/main.tsx`
  smoke-test entry (Vite needs an HTML entry; `vite preview` renders it
  in isolation).
- ✅ D-A.3. Configure each horizontal MFE as a `remote` with `exposes` for its
  page surface (`./pages/champions-list`, `./pages/champion-detail`,
  `./pages/tier-list`). Both `mfe-champions` and `mfe-tier-list` now emit
  `dist/remoteEntry.js` + `dist/mf-manifest.json` via `pnpm nx run X:build`.
- ✅ D-A.4. Configure shell as `host` with `shared: { singleton: true }` for
  the list in §6. Done in `apps/shell/vite.config.ts` — `remotes` references
  each MFE manifest URL; `shared` mirrors the per-MFE singletons. Build
  passes for all 10 projects.
- ✅ D-A.6. Add an env-driven manifest (`MFE_*_URL`) for prod; default to
  local dev URLs. Done at the top of `apps/shell/vite.config.ts` and matches
  each MFE's `server.origin`.

> **Sub-phase status (D-A.1–A.4 + A.6 done):** Shell + both MFE remotes
> build green; shell is registered as MF host with the two remotes wired.
> Notes:
> - The MF DTS plugin is disabled everywhere (`dts: false`) — see the
>   cleanup notes; it conflicted with TS 6 and was leaking `.d.ts` files
>   into `libs/*/src/` on every build.
> - Shell `+Page.tsx` files still statically re-export the in-tree page
>   modules from `@rift/mfe-*/pages/*` (Phase C wiring). Until D-A.5
>   lands, the host's MF `remotes` block is **inactive at runtime** — no
>   code in the shell yet imports via the remote name. The plumbing is in
>   place so D-A.5 only needs the import-site swap.

- D-A.5. Use Vike's `Page: () => import("...")` lazy form in the shell's
  `+config.ts` so the client build resolves the import via MF runtime while
  SSR continues to use the in-tree workspace alias. Use Vite
  `optimizeDeps.exclude` so dev mode hot-reload still works.

> **D-A.5 risk note:** This is the SSR/client dual-resolution step. The
> client must rewrite `import("mfe-champions/pages/...")` into the MF
> runtime, but the SSR build must keep resolving the same string to the
> in-tree `@rift/mfe-champions/pages/...` workspace package — otherwise
> the SSR build will try to fetch a remote that may not be reachable at
> build time, and any new SSR-only field still requires a shell rebuild
> anyway (that's D-B's job). The cleanest path is Vite's per-environment
> `resolve.alias` (different aliases for the `ssr` vs `client`
> environments) plus a `Page: () => import()` form in `+config.ts`.

- D-A.7. Verify (dev): edit a champions page, see HMR in the shell.
- D-A.8. Verify (prod): build both apps separately, deploy mfe-champions to
  a test URL, point shell at it, redeploy only the MFE → client-side change
  visible without shell rebuild.

#### Phase D-B — SSR-dynamic Module Federation (`mfe-ssr-dynamic`)

Outcome: both shell SSR (Node) **and** the client load remotes at runtime.
A new SSR-rendered field in an MFE page becomes visible without a shell
rebuild. This is the genuine "independently deployable" target.

- D-B.1. Adopt `@module-federation/vite` v1.15+ SSR flow (the plugin's
  Node-side `remoteEntry` loader). Confirm the version targets we use
  support `Hono` and a Node 24 runtime.
- D-B.2. Each horizontal MFE's `vite.config.ts` emits **two** outputs: a
  browser `remoteEntry.js` (consumed by shell client bundle) and a Node
  `remoteEntry.cjs`/`remoteEntry.mjs` (consumed by the shell server).
- D-B.3. Shell server (`apps/shell/server/hono.ts` or a small bootstrap
  module) calls the MF runtime `init({ remotes: [...] })` once on cold
  start, registering each MFE's Node `remoteEntry`.
- D-B.4. Shell `+Page.tsx` re-exports become **single-source dynamic
  imports** (`Page: () => import("mfe-champions/pages/champions-list")`)
  that resolve via MF runtime in both Node and browser.
- D-B.5. Add a manifest fetcher: shell server pulls `mf-manifest.json` from
  each `MFE_*_URL` on startup (with a cache-bust on SIGHUP) so version
  pinning is explicit and rollbacks are an env-var redeploy.
- D-B.6. Add a smoke check that fails the shell health probe if any
  `MFE_*_URL` is unreachable at boot — fail-fast beats serving partial HTML.
- D-B.7. Verify: redeploy mfe-champions with a new SSR-only DOM node;
  `curl shell/champions` returns the new HTML on the next request without
  redeploying or restarting the shell.
- D-B.8. Document the cache-poisoning risk: a malformed remote `remoteEntry`
  must not be able to crash the shell process. Sandbox the MF init in a
  try/catch with a fallback "MFE unavailable" page.

> **Risk surface for D-B:** module-federation/vite SSR is newer than its
> client flow; expect at least one round of upstream-issue diagnosis. If the
> ROI is unclear, stay on D-A — most of the architectural value (shared
> singletons, independent client deploy) is already there.

### Phase E — Convert mfe-player to vertical (Stencil)

Outcome: a working example of a different-stack MFE.

Status: ✅ Complete. The shell now SSR-renders the Stencil player MFE
as Declarative Shadow DOM (verified: `dist/server/entries/pages_player*.mjs`
contains `<template shadowrootmode="open">` markers), the React wrapper is
the consumed surface in shell pages, and the loader registers custom
elements after hydration via `PlayerHydrator`.

- E.1. ✅ `apps/mfe-player/stencil.config.ts` declares **four** output targets:
  `reactOutputTarget()` (wrapper bound to `hydrateModule`/`clientModule`),
  `dist` (esm + loader), `dist-custom-elements` (auto-define), and
  `dist-hydrate-script` (Node SSR). Package shape mirrors `libs/ui` with an
  added `./hydrate` export.
- E.2. ✅ `<rift-player-app>` shell + `<rift-player-overview>`,
  `<rift-player-champions>`, `<rift-player-matches>` child views. Shell
  has a hand-rolled sub-router (`overview`/`champions`/`matches`) keyed off
  `initialRoute` and emits a `routechange` event.
- E.3. ⚠️ Adjusted: data fetching is mocked inline in `src/data/mock.ts`
  rather than wired to `@rift/data-access`. Reason: the data-access lib
  exposes React hooks; using them inside Stencil JSX would require either
  a parallel non-React fetch helper or a Preact-Signals-style adapter. Mock
  data keeps Phase E focused on the SSR + hydration story; a follow-up
  can add a non-React export to `libs/data-access` and swap.
- E.4. ✅ `apps/shell/vite.config.ts` registers `stencilSSR({ module, from,
  hydrateModule, serializeShadowRoot: 'declarative-shadow-dom' })`. Explicit
  resolve-aliases for `@rift/mfe-player/{react,hydrate,loader,dist/components,*}`
  bypass node `exports` resolution issues for the SSR pipeline.
- E.5. ✅ `pages/player/+Page.tsx` plus `pages/player/champions/+Page.tsx`
  and `pages/player/match-history/+Page.tsx` each render `<RiftPlayerApp />`
  with a literal `initialRoute`. Static-only props are mandated by the
  compiler-based `@stencil/ssr` plugin; user identity is injected
  client-side after hydration (see E.6).
- E.6. ✅ Loader injection via a `PlayerHydrator` component using a
  client-only `useEffect(() => import('@rift/mfe-player/loader'))`. This is
  cleaner than a `<script>` in `+Head.tsx` because the import is
  bundle-managed, hash-busted, and dropped from the SSR bundle.
- E.7. ✅ Build-time verification: every `pages_player*` server entry
  contains `rift-player-app` + DSD `template shadowroot` markers. Runtime
  preview verification deferred — the shell's MF + Vike preview combo has
  a pre-existing manifest-resolution bug that 500s on every route in
  preview (not specific to /player); will be debugged separately as part
  of the deferred Phase D-A.5/A.7 work.

Follow-ups parked for later:

- Wire real data via a non-React export from `@rift/data-access`.
- Fix Vike preview server crash with MF chunks (or skip MF in preview).
- Resolve the 'routechange' → host history sync (currently the event fires
  but no shell-side listener calls `navigate(href)` yet).

### Phase F — Performance polish

- F.1. Audit shared chunks with `mf-stats.json`; ensure no duplicate React.
- F.2. Add `<Link prefetch>` on header nav so MF remote entries are prefetched
  on hover.
- F.3. Add Lighthouse CI checks for LCP/INP per route.
- F.4. Add a tiny "skeleton" while a remote is loading the first time.
- F.5. Consider `vike-react-query` for client-cached subsequent loads.

---

## 10. Trade-offs & Risks

| Trade-off                                                   | Mitigation                                                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| One server means API changes still need a shell deploy.     | Acceptable per requirements; Phase F (future) can split API to a separate Hono                 |
| MF SSR is newer than CSR — edge cases possible.             | Pin `@module-federation/vite` version; add Playwright SSR tests per route                      |
| Vike + MF route-function-as-delegate is non-trivial.        | Encapsulate in a single helper `createRemoteRoute(name)` reused by all MFEs                    |
| Vertical MFE uses different SSR pipeline (Stencil hydrate). | Isolated to `/player/*`; does not affect horizontal MFE rendering                              |
| Tailwind class collisions between shell and remotes.        | Shared preset in `libs/styles`; remotes never re-emit base layer                               |
| Auth.js secret is currently hardcoded.                      | Phase A.2 must migrate to `AUTH_SECRET` env var (via `.env.development` + deployment platform) |
| Cross-MFE state in jotai — singleton requirement.           | `jotai` declared `singleton: true`; shell creates the root Provider                            |
| Stencil hydration cost on `/player/*`.                      | Acceptable for the explicit "vertical" example; opt out of full SSR if needed                  |

---

## 11. Resolved Decisions

1. **`mfe-player` is the Stencil vertical** (not a 4th horizontal). Reuses the
   `libs/ui` Stencil toolchain.
2. **1:1 route prefix per MFE.** `/champions/*` → `mfe-champions`, etc. No
   shared prefix mapping layer.
3. **Hybrid bundle delivery, env-driven:**
   - **Local dev**: same-origin. Shell's Vite dev server proxies
     `/_mfe/<name>/*` to the MFE's local Vite dev process (or, when running
     shell-only, serves the locally-built `dist/`). No CORS needed.
   - **Prod**: CDN with CORS. Shell reads `MFE_*_URL` env vars; remote
     bundles deployed independently.
   - **"Load on the server" option**: the MF runtime already fetches remote
     `mf-manifest.json` from the shell's Node process during SSR (server-side
     federation). The browser then fetches the actual JS chunks from the URL
     in the manifest. So:
       - SSR phase = server fetches manifest from CDN (or localhost in dev),
         caches it in memory.
       - Hydration phase = browser fetches JS chunks directly from CDN
         (parallel to React hydration).
     This is the recommended setup; "server proxies all chunks" is possible
     but loses the CDN edge benefit and is not needed.
4. **Reuse Valibot schemas** at the shell↔remote boundary. Each remote's
   `+data` loader returns Valibot-typed output; shell's wrapper validates on
   the way out (defense-in-depth, since remotes can be deployed independently
   and may drift).
5. **NX scopes**:
   - `scope:shell` — apps/shell
   - `scope:mfe` — apps/mfe-*
   - `scope:lib-domain` — libs/champion, libs/player
   - `scope:lib-shared` — libs/ui, libs/styles, libs/auth, libs/data-access,
     libs/mfe-runtime
   - Allowed edges:
     - `scope:shell` → `scope:mfe` (new — needed for MF host wiring)
     - `scope:shell` / `scope:mfe` → `scope:lib-*`
     - `scope:lib-domain` → `scope:lib-domain` (player → champion only)
     - `scope:lib-shared` may depend on `scope:lib-domain` (data-access does)
     - No cross-MFE imports (`mfe-champions` cannot import `mfe-tier-list`)

---

## 12. Files / Packages Affected

New:
- `apps/api/`               (Hono + Drizzle + SQLite — new package `@rift/api`)
- `libs/auth/`              (shared Auth.js config + middleware + helpers)
- `libs/styles/`            (Tailwind tokens + components.css)
- `libs/mfe-runtime/`       (createRemoteRoute, useUser, <Link>)

Modified:
- `apps/shell/server/hono.ts`   (only auth + Vike; no MFE/API routers)
- `apps/shell/vite.config.ts`   (+ MF host plugin, dev proxy /api → :3100)
- `apps/shell/pages/+Layout.tsx`(canonical header, Vike `<Link>`)
- `apps/shell/pages/{champions,tier-list,player}/{+route.ts,+Page.tsx,+data.ts}`
- `apps/mfe-champions/vite.config.ts`  (+ MF remote plugin, no Vike server)
- `apps/mfe-tier-list/vite.config.ts`  (+ MF remote plugin, no Vike server)
- `apps/mfe-player/stencil.config.ts`  (vertical bundle config)
- `libs/data-access/src/`              (rewritten on top of hc<ApiType>())

Removed:
- `apps/{mfe-champions,mfe-tier-list,mfe-player}/+server.ts`
- `apps/{mfe-champions,mfe-tier-list,mfe-player}/server/`  (entire folders)
- `apps/shell/server/authjs-handler.ts`               (→ libs/auth)
- Per-MFE local header markup in `+Layout.tsx`

---

## 13. Recommendations Summary

0. **Stand up `apps/api` (`@rift/api`) as the only backend** — Hono + SQLite
   (better-sqlite3) + Drizzle + Valibot. Frontend servers carry no business
   REST. MFEs use a single typed `hc<ApiType>()` client from
   `libs/data-access` for both SSR and CSR.
1. **Adopt `@module-federation/vite`** for the two horizontal MFEs. Skip
   OpenComponents — wrong fit for this monorepo's scale and dev model.
2. **Collapse to one Hono server in shell**; mount MFE routers as packages.
3. **Keep Vike as the only router** for the React stack; treat horizontal
   remotes as "page providers" not "apps with their own router".
4. **Use Stencil for the vertical example** (`mfe-player`) — leverages the
   existing `libs/ui` Stencil toolchain and gives a clean
   different-stack story.
5. **Phase A first** (server consolidation + shared header) — biggest
   immediate quality win, no MF complexity yet.
6. **Defer cross-MFE state** until needed; jotai singleton is enough for v1.
