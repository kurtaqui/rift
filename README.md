# rift

> Experiment and testing monorepo for exploring [Vike](https://vike.dev/), micro-frontends (MFE), SSR/hydration strategies, and [StencilJS](https://stenciljs.com/) web components.

Domain theme: **League of Legends** — champions, abilities, tier lists, skins, and player profiles.

## What's being explored

| Topic                       | How                                                              |
| --------------------------- | ---------------------------------------------------------------- |
| SSR & selective hydration   | Vike `+config.ts` per-page SSR toggles                           |
| Micro-frontends             | Module Federation (Vite) — one shell host, many remotes          |
| Same-origin MFE delivery    | MFE bundles served by the shell's Hono server, no separate hosts |
| Web components in React SSR | StencilJS `lol-*` components with React output target            |
| Atomic state management     | Jotai atoms co-located with features                             |
| URL-synced filter state     | Tier list filters persisted in search params                     |

## Architecture

> Single user-facing server (the **shell**), a separate **API**, and MFEs that
> are workspace packages in dev / federated remotes in prod. See
> [architecture-plan.md](./architecture-plan.md) for the full RFC.

```
┌────────────────────────────────┐         ┌──────────────────┐
│  apps/shell  (Vike + Hono)     │  HTTP   │  apps/api        │
│  • SSR + hydration             │ ──────▶ │  Hono + Drizzle  │
│  • Auth.js routes              │         │  SQLite          │
│  • Proxies /api/* → API        │         │  :3100           │
│  • Serves MFE bundles at       │         └──────────────────┘
│    /static-assets/mfes/<name>/ │
│  :3000                         │
└────────────────────────────────┘
              ▲
              │ exposes pages via Module Federation (prod)
              │ workspace alias to src/pages/* (dev)
              │
   ┌──────────┴────────────────────────────┐
   │                                       │
┌──────────────────┐  ┌──────────────────┐ ┌──────────────────┐
│ mfe-champions    │  │ mfe-tier-list    │ │ mfe-player       │
│ (workspace pkg)  │  │ (workspace pkg)  │ │ (vertical, WIP)  │
│ exposes Page.tsx │  │ exposes Page.tsx │ │ Stencil-based    │
│ + data.ts        │  │ + data.ts        │ │                  │
└──────────────────┘  └──────────────────┘ └──────────────────┘
```

### Two execution modes

| Mode                                                     | How MFEs are loaded                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev** (`vike dev`)                                     | Workspace package alias — shell imports `mfe-champions/pages/...` directly from MFE source. No federation runtime, no MFE servers.                |
| **Prod** (`vike build` + `node ./dist/server/index.mjs`) | `@module-federation/vite` host loads each MFE's `mf-manifest.json`. Shell's Hono server serves those bundles from `/static-assets/mfes/<name>/*`. |

The shell-side bare-name imports (e.g. `mfe-champions/pages/champions-list`) are resolved by:

- **TypeScript paths** in [apps/shell/tsconfig.json](apps/shell/tsconfig.json) (type-checking)
- A custom `mfeBareNameAliasPlugin` in [apps/shell/vite.config.ts](apps/shell/vite.config.ts) for non-client environments (SSR build)
- The `@module-federation/vite` host plugin (gated to `command === "build"` + `applyToEnvironment: env => env.name === "client"`) for the client production build

## Apps

| App             | Port    | Role                                                                                                                                              |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shell`         | `:3000` | The only user-facing server. Hosts all routes (`/`, `/champions/*`, `/tier-list/*`, `/player/*`), serves MFE bundles, proxies `/api/*` to the API |
| `api`           | `:3100` | Standalone Hono backend (SQLite via Drizzle) — domain data only                                                                                   |
| `mfe-champions` | —       | Workspace pkg + federation remote. Owns `/champions/*` pages                                                                                      |
| `mfe-tier-list` | —       | Workspace pkg + federation remote. Owns `/tier-list/*` pages                                                                                      |
| `mfe-player`    | —       | Vertical MFE (Stencil-based). WIP                                                                                                                 |

> Horizontal MFEs (`mfe-champions`, `mfe-tier-list`) **do not** run their own
> dev servers. They publish pages as `exports` in their `package.json` and the
> shell consumes them — directly in dev, via the federation runtime in prod.

> **Auth note**: Auth.js is wired with a Credentials-only provider for local
> dev (demo creds: `rift-demo` / `demo`). The shell exposes the session as
> `pageContext.session`; the API currently uses a mock session matching the
> seeded player (`subjectId: "rift-demo"`) because cross-origin session
> verification between shell and api is not yet wired — tracked separately.

## Shared Libraries

| Lib                | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `libs/ui`          | StencilJS web components (`lol-*` prefix). Leaf node — no monorepo deps   |
| `libs/styles`      | Shared CSS tokens + base component styles consumed by every app           |
| `libs/champion`    | TypeScript types + Valibot schemas for champion domain. No framework code |
| `libs/player`      | TypeScript types + Valibot schemas for player domain. Depends on champion |
| `libs/data-access` | React hooks + typed API client. Depends on champion + player libs         |
| `libs/auth`        | Shared Auth.js config + Hono session middleware (used by shell + api)     |
| `libs/storybook`   | Storybook stories for `libs/ui` components                                |

## Tech Stack

[Vike](https://vike.dev/) · [@module-federation/vite](https://github.com/module-federation/vite) · [React 19](https://react.dev/) · [StencilJS](https://stenciljs.com/) · [Tailwind CSS v4](https://tailwindcss.com/) · [shadcn/ui](https://ui.shadcn.com/) · [Hono](https://hono.dev/) · [Drizzle ORM](https://orm.drizzle.team/) + SQLite · [Jotai](https://jotai.org/) · [Valibot](https://valibot.dev/) · [Vitest](https://vitest.dev/) · [Playwright](https://playwright.dev/) · [Storybook 10](https://storybook.js.org/) · [NX](https://nx.dev/) · [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) · [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) · TypeScript 6

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

### Dev (workspace-alias mode)

In dev, MFEs are consumed directly as workspace packages — there is no
federation runtime, no separate MFE process, and no `/static-assets/*`
roundtrip. Just start the shell and the API:

```bash
pnpm dev                  # shell + api in parallel
# or individually:
pnpm dev:shell            # http://localhost:3000
pnpm dev:api              # http://localhost:3100
```

Edits to MFE source (`mfe/mfe-*/src/pages/...`) hot-reload through Vite as if
they lived inside the shell.

### Prod (federated mode)

To exercise the production federation runtime end-to-end (the path that
matters for "independently deployable" MFEs), use `pnpm preview` — it
builds every project (respecting NX dependency order) and starts the
shell + api in parallel:

```bash
pnpm preview              # build all + serve shell (:3000) + api (:3100)
# or individually:
pnpm preview:shell        # build shell (+ deps) + node ./dist/server/index.mjs
pnpm preview:api          # tsx src/index.ts (no build step needed)
```

Both `pnpm dev` and `pnpm preview` first run `pnpm kill-ports` (which
shells out to [scripts/kill-ports.sh](scripts/kill-ports.sh)) to free any
orphaned listeners on `:3000`–`:3012` (shell + MFEs) and `:3100`–`:3112`
(api) left behind by a previous session (common on Windows where Ctrl-C
of the NX TUI doesn't always propagate to spawned children). You can
also run it directly:

```bash
pnpm kill-ports           # free :3000–:3012 (shell + MFEs) and :3100–:3112 (api)
```

The shell's [Hono server](apps/shell/server/hono.ts) mounts each MFE's
`dist/` directory at `/static-assets/mfes/<name>/*`, so the federation runtime
fetches `mf-manifest.json`, `remoteEntry.js`, and chunks from the same origin
the user is already on — no CORS, no separate static host.

> ⚠️ **`vike preview` does not work for federation testing.** It bypasses the
> Hono middleware chain that serves MFE bundles. The shell's `preview` script
> ([apps/shell/package.json](apps/shell/package.json)) runs
> `node ./dist/server/index.mjs` instead, which is what `pnpm preview:shell`
> invokes via `nx run shell:preview`.

Override MFE locations with env vars when serving from a different cwd or
hosting MFEs on a CDN:

```bash
MFE_CHAMPIONS_DIST=/abs/path/to/mfe-champions/dist        # static file root
MFE_CHAMPIONS_URL=https://cdn.example.com/mfes/champions  # federation entry URL
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
