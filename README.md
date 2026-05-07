# rift

> Experiment and testing monorepo for exploring [Vike](https://vike.dev/), micro-frontends (MFE), SSR/hydration strategies, and [StencilJS](https://stenciljs.com/) web components.

Domain theme: **League of Legends** — champions, abilities, tier lists, skins, and player profiles.

## What's being explored

| Topic                       | How                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| SSR & selective hydration   | Vike `+config.ts` per-page SSR toggles                                                   |
| Micro-frontends             | HTTP composition — shell fetches SSR fragments from independent MFE servers              |
| MFE isolation               | Each MFE runs its own Hono+Vike server; owns its React runtime, routes, and client bundle |
| Web components in React SSR | StencilJS `lol-*` components with React output target                                    |
| Atomic state management     | Jotai atoms co-located with features                                                     |
| URL-synced filter state     | Tier list filters persisted in search params                                             |

## Architecture

> Three user-facing servers: the **shell** (Vike + Auth.js), two **horizontal
> MFEs** (each a standalone Vike + Hono server), and a separate **API**.
> The shell composes MFE content at request time via HTTP — no Module
> Federation, no shared runtime coupling. See
> [architecture-plan.md](./architecture-plan.md) for the full design rationale.

```
┌─────────────────────────────────────┐       ┌──────────────────┐
│  apps/shell  (Vike + Hono)  :3000   │       │  apps/api  :3100 │
│  • Auth.js + Vike SSR               │──────▶│  Hono + Drizzle  │
│  • /champions/* → <MfeSlot>         │       │  SQLite          │
│  • /tier-list/* → <MfeSlot>         │       └──────────────────┘
└──────────┬────────────────────────┬─┘
           │  GET /fragment?route=  │  (SSR fetch, server-side)
           │  <script src=mfe.js>   │  (client hydration)
           ▼                        ▼
┌─────────────────────┐   ┌───────────────────────┐
│  mfe-champions :3011│   │  mfe-tier-list  :3012  │
│  Hono + Vike        │   │  Hono + Vike           │
│  GET /fragment      │   │  GET /fragment         │
│  GET /mfe.js        │   │  GET /mfe.js           │
└─────────────────────┘   └───────────────────────┘
```

### How it works

The shell's `+data.ts` for each MFE page calls `fetchMfeFragment(src, route)`,
which hits `GET /fragment?route=<mfe-sub-path>` on the MFE server. The
response is `{ html: string, data: unknown }`:

- **`html`** — fully-rendered React HTML (via `renderToPipeableStream`).
  Inlined into `<MfeSlot>` during SSR so the user sees content on first paint.
- **`data`** — serializable page data forwarded to the client App for
  hydration — no double-fetch on load.

On the client, `<MfeSlot>` injects `<script type="module" src="${src}/mfe.js">`
(or `${src}/src/client-entry.ts` in dev). The MFE bundle registers
`globalThis.__mfe_mount__<origin>` which `MfeSlot` polls and calls to
`hydrateRoot` / `createRoot` the MFE's App into the container.

Each MFE owns its own React runtime — there is no shared-singleton requirement
and no bundle coupling between the shell and MFE client builds.

### Two execution modes

| Mode  | How MFEs are loaded                                                                             |
| ----- | ----------------------------------------------------------------------------------------------- |
| **Dev** | Shell fetches SSR HTML from MFE Vike dev servers (`:3011`, `:3012`). Client bundle is served as `src/client-entry.ts` by the Vike dev server — full HMR and source maps work. |
| **Prod** | Shell fetches SSR HTML from MFE prod servers. Client bundle is a pre-built `dist/client/mfe.js`, served by the MFE's Hono server at `GET /mfe.js`. |

## Apps

| App             | Port    | Role                                                                                                        |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `shell`         | `:3000` | User-facing server. Hosts all shell routes (`/`, `/login`, `/player/*`), composes MFE fragments via HTTP   |
| `api`           | `:3100` | Standalone Hono backend (SQLite via Drizzle) — domain data only                                            |
| `mfe-champions` | `:3011` | Independent Vike+Hono server. Owns `/champions/*` pages; exposes `GET /fragment` and `GET /mfe.js`         |
| `mfe-tier-list` | `:3012` | Independent Vike+Hono server. Owns `/tier-list/*` pages; exposes `GET /fragment` and `GET /mfe.js`         |
| `mfe-player`    | —       | Vertical MFE (Stencil-based). Rendered directly in shell via `@stencil/ssr` + Declarative Shadow DOM       |

> **Shared library for MFE composition**: `libs/mfe-fragment` exports
> `MfeSlot` (React component) and `fetchMfeFragment` (server-side fetch helper)
> used by the shell's `+data.ts` / `+Page.tsx` files.

## Shared Libraries

| Lib                  | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `libs/ui`            | StencilJS web components (`lol-*` prefix). Leaf node — no monorepo deps   |
| `libs/styles`        | Shared CSS tokens + base component styles consumed by every app           |
| `libs/champion`      | TypeScript types + Valibot schemas for champion domain. No framework code |
| `libs/player`        | TypeScript types + Valibot schemas for player domain. Depends on champion |
| `libs/data-access`   | React hooks + typed API client. Depends on champion + player libs         |
| `libs/auth`          | Shared Auth.js config + Hono session middleware (used by shell + api)     |
| `libs/mfe-fragment`  | `MfeSlot` React component + `fetchMfeFragment` server helper — the glue between shell and MFE servers |
| `libs/storybook`     | Storybook stories for `libs/ui` components                                |

## Tech Stack

[Vike](https://vike.dev/) · [React 19](https://react.dev/) · [StencilJS](https://stenciljs.com/) · [Tailwind CSS v4](https://tailwindcss.com/) · [shadcn/ui](https://ui.shadcn.com/) · [Hono](https://hono.dev/) · [Drizzle ORM](https://orm.drizzle.team/) + SQLite · [Jotai](https://jotai.org/) · [Valibot](https://valibot.dev/) · [Vitest](https://vitest.dev/) · [Playwright](https://playwright.dev/) · [Storybook 10](https://storybook.js.org/) · [NX](https://nx.dev/) · [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) · [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) · TypeScript 6

---

## Getting Started

### Prerequisites

- Node.js ≥ 24.14
- pnpm ≥ 9

```bash
pnpm install
```

### Seed the database

The API uses SQLite (file at `apps/api/data/rift.db`) and ships with seed data
for champions, abilities, skins, tier entries, and a single demo player with
match history. **Run this once before starting dev**:

```bash
pnpm nx run api:db:push   # create / migrate the SQLite schema
pnpm nx run api:db:seed   # populate champions, tiers, demo player + matches
```

Re-run `api:db:seed` any time you change the seed sources in
[libs/champion/src/seed.ts](libs/champion/src/seed.ts) or
[apps/api/src/db/seed.ts](apps/api/src/db/seed.ts) — it clears and repopulates
all tables.

### Dev

In dev, each MFE runs its own Vike dev server. The shell fetches SSR fragments
from the MFE servers and injects their `src/client-entry.ts` for the client
bundle (Vite serves it with full HMR and source maps):

```bash
pnpm dev                  # shell + api + mfe-champions + mfe-tier-list in parallel
# or individually:
pnpm dev:shell            # http://localhost:3000
pnpm dev:api              # http://localhost:3100
pnpm nx run mfe-champions:dev   # http://localhost:3011
pnpm nx run mfe-tier-list:dev   # http://localhost:3012
```

Edits to MFE source files hot-reload on the MFE dev server and are picked
up by the shell on the next fragment fetch or Vike SPA navigation.

### Prod

Each horizontal MFE must build its client bundle before the shell can serve
it. The `mfe.js` bundle is built separately by `vite.client.config.ts`:

```bash
pnpm nx run mfe-champions:build:client   # produces dist/client/mfe.js
pnpm nx run mfe-tier-list:build:client

pnpm preview              # build all + serve shell (:3000) + api (:3100) + MFEs
# or individually:
pnpm preview:shell        # node ./dist/server/index.mjs
pnpm preview:api          # tsx src/index.ts
```

Both `pnpm dev` and `pnpm preview` first run `pnpm kill-ports` (which
shells out to [scripts/kill-ports.sh](scripts/kill-ports.sh)) to free any
orphaned listeners on `:3000`–`:3012` and `:3100`–`:3112` left behind by a
previous session. You can also run it directly:

```bash
pnpm kill-ports           # free :3000–:3012 (shell + MFEs) and :3100–:3112 (api)
```

Override MFE locations with env vars:

```bash
MFE_CHAMPIONS_URL=https://mfe-champions.example.com  # fragment + mfe.js base URL
MFE_TIER_LIST_URL=https://mfe-tier-list.example.com
```

### Storybook (UI component explorer)

Storybook browses the `libs/ui` StencilJS web components. The `libs/ui` build
must run first since Storybook reads the compiled output.

```bash
pnpm nx run ui:build
pnpm storybook            # http://localhost:6006
```

### Build, test, lint

```bash
pnpm build                # build all projects (respects NX dependency order)
pnpm test                 # run all unit tests
pnpm lint                 # lint all projects
pnpm fmt                  # format all files
pnpm fmt:check            # check formatting (used in CI)

pnpm nx graph             # open interactive project dependency graph
pnpm nx:reset             # clear NX cache (use when builds behave unexpectedly)
```

---

## Authentication

Auth.js is wired with a Credentials-only provider (no external IdP). Sign in
at `/login` with the demo account `rift-demo` / `demo`. The API middleware
([apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts)) injects a
mock session for the seeded demo player on every request, so `/player/*`
routes resolve to that player without cross-origin session sharing.

The wiring is in place via [libs/auth](libs/auth):

- The shell mounts `authjsHandler` at `/api/auth/**` and
  `authjsSessionMiddleware` to expose the session as `pageContext.session`.
- Sign in via `/login` (custom page) with the demo credentials
  `rift-demo` / `demo`.

Next step (out of scope for this PR): replace the api's mock session with
real verification — e.g. the shell mints a short-lived JWT that the api
verifies on each request.

---

## Domain Model

| Entity             | Key Fields                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ |
| `Champion`         | id, name, roles, difficulty (1–10), stats, splashArtUrl, lore                        |
| `ChampionAbility`  | id, slot (Q/W/E/R/P), name, description, cooldown, championId                        |
| `ChampionTier`     | id, championId, tier (S/A/B/C/D), role, patch, winRate, pickRate                     |
| `ChampionSkin`     | id, championId, name, rpPrice, splashArtUrl, rarity                                  |
| `Player`           | id, summonerName, accountId, profileIconId, summonerLevel, subjectId                 |
| `PlayerChampion`   | playerId, championId, masteryLevel, masteryPoints, owned                             |
| `PlayerMatchEntry` | id, playerId, championId, role, kills, deaths, assists, win, gameDuration, matchDate |

Types and Valibot schemas live in [libs/champion/src](libs/champion/src) and
[libs/player/src](libs/player/src).

## Contributing

See [AGENTS.md](./AGENTS.md) for architecture decisions, conventions, and AI
agent instructions, and [architecture-plan.md](./architecture-plan.md) for the
full MFE rework RFC.
