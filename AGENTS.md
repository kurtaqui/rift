# rift

Experiment and testing monorepo for exploring [Vike](https://vike.dev/), micro-frontends (MFE), SSR/hydration strategies, and [StencilJS](https://stenciljs.com/) web components. Domain theme: **League of Legends** — champions, abilities, tier lists, and skins.

## Monorepo Structure

```
apps/
  shell/             # Vike host — global nav, home, 404, auth state, MF host (Phase 2)
libs/
  ui/                # StencilJS web components (core design system)
  champion/          # Champion domain: types & Valibot schemas (Champion, ChampionAbility, ChampionTier, ChampionSkin)
  player/            # Player domain: types & Valibot schemas (Player, PlayerChampion, PlayerMatchEntry)
  data-access/       # API clients & React hooks (Hono backend)
  storybook/         # Storybook configuration for libs/ui components
mfe/
  mfe-champions/     # MFE 1 — champion browser, detail pages, abilities viewer
  mfe-tier-list/     # MFE 2 — tier list rankings, meta builds (filterable by role/tier/patch)
  mfe-player/        # MFE 3 — authenticated player profile, owned champions, match history
```

## Domain Entities

| Entity             | Key Fields                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ |
| `Champion`         | id, name, roles, difficulty (1–10), stats, splashArtUrl, lore                        |
| `ChampionAbility`  | id, slot (Q/W/E/R/P), name, description, cooldown, championId                        |
| `ChampionTier`     | id, championId, tier (S/A/B/C/D), role, patch, winRate, pickRate                     |
| `ChampionSkin`     | id, championId, name, rpPrice, splashArtUrl, rarity                                  |
| `Player`           | id, summonerName, accountId, profileIconId, summonerLevel, subjectId                 |
| `PlayerChampion`   | playerId, championId, masteryLevel, masteryPoints, owned                             |
| `PlayerMatchEntry` | id, playerId, championId, role, kills, deaths, assists, win, gameDuration, matchDate |

Champion types live in `libs/champion/src/`. Player types live in `libs/player/src/`. Valibot schemas are co-located with their types.

## Package Manager & Task Runner

- **Package manager**: `pnpm` (workspaces)
- **Task runner**: NX (see `nx.json` and per-project `project.json`)

```bash
pnpm install                        # install all deps
pnpm nx run <project>:<target>      # run a task (e.g. build, dev, test)
pnpm nx run-many -t build           # build all projects
pnpm nx run-many -t test            # run all unit tests
pnpm nx run-many -t lint            # lint all projects
pnpm nx run-many -t fmt             # format all projects
pnpm nx run-many -t fmt:check       # check formatting (CI)
pnpm nx affected -t build           # build only affected projects
pnpm nx graph                       # visualize project dependency graph
pnpm run nx:reset                   # clear NX cache (use when builds behave unexpectedly)
```

## Tech Stack

| Tool                                                                  | Role                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Vike](https://vike.dev/) + [vike-react](https://vike.dev/vike-react) | SSR/SSG framework (each MFE is a standalone Vike app)              |
| [React 19](https://react.dev/)                                        | UI framework                                                       |
| [StencilJS](https://stenciljs.com/)                                   | Core web components in `libs/ui`                                   |
| [Tailwind CSS v4](https://tailwindcss.com/)                           | Utility-first CSS                                                  |
| [shadcn/ui](https://ui.shadcn.com/)                                   | Component library (within each app)                                |
| [Hono](https://hono.dev/)                                             | API server (each app has its own `+server.ts`)                     |
| [Auth.js](https://authjs.dev/)                                        | Authentication via `@auth/core` with a Credentials provider (demo) |
| [Module Federation](https://github.com/module-federation/vite)        | MFE runtime sharing via `@module-federation/vite`                  |
| [Jotai](https://jotai.org/)                                           | Atomic client-side state management                                |
| [Vitest](https://vitest.dev/)                                         | Unit testing                                                       |
| [Playwright](https://playwright.dev/)                                 | E2E testing (`e2e/` folder per app)                                |
| [Storybook 10](https://storybook.js.org/)                             | Component explorer for `libs/ui`                                   |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)                 | Fast linter (replaces ESLint)                                      |
| [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)               | Fast formatter (replaces Prettier)                                 |
| TypeScript 6                                                          | Strict mode enabled everywhere                                     |

## Scaffolding a New Vike App

Use [Bati](https://github.com/vikejs/bati) (the Vike scaffolder) to create apps, then add to NX:

```bash
cd apps
pnpm create vike@latest <app-name> --react --tailwindcss --shadcn-ui --hono --oxlint
```

> After scaffolding: remove `.oxlintrc.json` (root `oxlint.config.ts` is used instead), remove nested `.git/`, update `tsconfig.json` to extend `../../tsconfig.base.json` and point `@/` at `./src/*`, update `vite.config.ts` to use `path.resolve(__dirname, "./src")` for the `@` alias, then add a `project.json` to register the app with NX. See an existing app's `project.json` as reference.

## Conventions

### Vertical Slice Architecture

Organize code **by feature/domain slice**, not by type. This applies to both `libs/` and within each `apps/` source tree.

**Prefer** — feature-first:

```
src/
  champion/
    ChampionCard.tsx
    useChampion.ts
    champion.atoms.ts
  tier-list/
    TierBadge.tsx
    useTierList.ts
    tier-list.atoms.ts
```

**Avoid** — type-first:

```
src/
  components/
    ChampionCard.tsx
    TierBadge.tsx
  hooks/
    useChampion.ts
    useTierList.ts
  atoms/
    champion.atoms.ts
    tier-list.atoms.ts
```

Rules:

- Group code by what it **does** (champion, player, tier-list), not what it **is** (component, hook, atom)
- Co-locate everything a feature needs: page, data-fetching, component, atom, test
- Cross-cutting concerns belong in a `shared/` slice only when truly generic (e.g. error boundaries, layout primitives)
- This mirrors the `libs/` split: `libs/champion` and `libs/player` are slices, not a monolithic `libs/domain`

### App Imports (`@/`)

Each app uses `@/` as an alias for its own `src/` directory.

- Configured in the app's `tsconfig.json` paths: `"@/*": ["./src/*"]`
- Configured in the app's `vite.config.ts` resolve alias: `"@": path.resolve(__dirname, "./src")`
- Example: `import { TierBadge } from "@/tier-list/TierBadge"`
- Use `@/` for **intra-app** imports only; use `@rift/*` aliases for cross-lib imports

### File Routing (Vike)

- Pages use [filesystem routing](https://vike.dev/filesystem-routing): `pages/index/+Page.tsx`, `pages/champions/@id/+Page.tsx`
- Data fetching: `+data.ts` files alongside `+Page.tsx`
- Layouts: `+Layout.tsx` at route segment roots
- Config: `+config.ts` per page/layout for SSR toggles, head tags, etc.

### Tier List Filters (`mfe-tier-list`)

- Filter state lives in Jotai atoms: `tierAtom`, `roleAtom`, `patchAtom`
- Supported filters: tier (S/A/B/C/D), role (Top/Jungle/Mid/ADC/Support), patch
- Atoms are co-located with the feature slice: `src/tier-list/tier-list.atoms.ts`
- URL search params are synced with filter atoms so filtered views are shareable/bookmarkable

### Authentication & Route Access

- **Public** (no auth required): `mfe-champions`, `mfe-tier-list`
- **Private** (login required): `apps/shell` + `mfe-player` — guarded via Auth.js session
- Auth provider: [Auth.js](https://authjs.dev/) (`@auth/core`) with a Credentials provider (demo creds: `rift-demo` / `demo`) — session accessible as `pageContext.session`
- Unauthenticated users hitting `mfe-player` routes are rejected by `+guard.ts` (throws `render(401)`)
- Server-side: read `pageContext.session?.user` to identify the player; `session.user.id` matches the seeded player's `subjectId`
- Auth routes: `/api/auth/signin`, `/api/auth/signout`, `/api/auth/session` (handled by `server/authjs-handler.ts`)

### Player Profile (`mfe-player`)

- Requires authentication — all pages guarded by `pages/+guard.ts`
- Displays top 3 champions by mastery points (from `PlayerChampion`)
- Owned champions grid links through to `mfe-champions` detail pages
- Match history table shows K/D/A, role, champion, win/loss, duration per `PlayerMatchEntry`
- Player data is fetched server-side using `session.user.id` (matches the seeded `subjectId`)

### State Management (Jotai)

- Use Jotai atoms for UI filter state, user preferences, and cross-component derived state
- Atoms are co-located with their feature slice: `src/tier-list/tier-list.atoms.ts` (not `src/atoms/`)
- Do **not** use Jotai for server data — use `+data.ts` / React hooks in `libs/data-access`

### StencilJS Web Components (`libs/ui`)

- All components are pure web components — no React-specific APIs inside `libs/ui`
- Components consume a [React output target](https://stenciljs.com/docs/react) for use in Vike apps
- Component names follow `lol-*` prefix convention (e.g. `lol-champion-card`, `lol-tier-badge`)
- Stories live in `libs/storybook/` as `*.stories.tsx`

### Shared Libs

- `libs/champion` — Champion domain: pure types + Valibot schemas; no framework code; leaf node within domain libs
- `libs/player` — Player domain: pure types + Valibot schemas; depends on `libs/champion` for `ChampionRole`
- `libs/data-access` — React hooks + Hono fetch utilities; depends on `libs/champion` + `libs/player`
- `libs/ui` — depends on nothing in the monorepo (leaf node)
- NX enforce-module-boundaries: `apps/*` may import `libs/*`; `libs/player` may import `libs/champion`; domain libs (`champion`, `player`) may not import `libs/data-access`

### Code Style

- **Formatter**: oxfmt — config at `.oxfmtrc.json`, run `pnpm oxfmt .` to format
- **Linter**: oxlint — config at `oxlint.config.ts`, run `pnpm oxlint .` to lint
- Plugins enabled: `typescript`, `import`, `react`, `react-perf`, `jsx-a11y`, `vitest`, `unicorn`
- Vike `+` files and Storybook stories are overridden to allow default exports (required by convention)
- TypeScript strict mode — no `any`, prefer `unknown` for external data (use typescript 6 defaults, which should be strict by default)
- React: functional components only, no class components
- Avoid default exports in `libs/`; named exports only

### Testing

- Unit tests: Vitest, co-located as `*.test.ts` or `*.spec.ts`
- E2E: Playwright, in `<app>/e2e/` directory
- Run unit tests: `pnpm nx run <project>:test`
- Run E2E: `pnpm nx run <app>:e2e`

## Key References

- [Vike docs](https://vike.dev/)
- [vike-react API](https://vike.dev/vike-react)
- [Vike routing](https://vike.dev/routing)
- [Vike data fetching](https://vike.dev/data-fetching)
- [StencilJS framework integration > React](https://stenciljs.com/docs/react)
- [NX task pipeline config](https://nx.dev/docs/concepts/task-pipeline-configuration)
- [Hono docs](https://hono.dev/docs/)
- [Oxlint rules](https://oxc.rs/docs/guide/usage/linter/rules.html)
- [Module Federation for Vite](https://github.com/module-federation/vite) — runtime MFE sharing

## MFE Patterns to Investigate

- [OpenComponents](https://opencomponents.github.io/) — serverless micro-frontend registry and runtime
- [AWS Frontend Discovery](https://github.com/awslabs/frontend-discovery) — service-based MFE discovery from AWS Labs

## LoL Data Sources (for mock/seed data)

- [Riot Data Dragon API](https://developer.riotgames.com/docs/lol#data-dragon) — champion JSON, ability data
- [Community Dragon](https://www.communitydragon.org/) — additional assets
- [wiki.leagueoflegends.com](https://wiki.leagueoflegends.com/en-us/) — lore, ability details
- Reference tier lists: [mobalytics.gg/lol/tier-list](https://mobalytics.gg/lol/tier-list), [u.gg/lol/tier-list](https://u.gg/lol/tier-list)
