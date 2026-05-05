# rift — Project Setup Plan

**TL;DR**: Bootstrap from scratch. Architecture is **Vike Host Shell + 3 Vike MFE remotes**. StencilJS is the design system only (`libs/ui`). Module Federation is Phase 2. Each phase is an independently verifiable deliverable.

---

## Architecture

```
apps/
  shell/           # Vike host — global nav, home, 404, auth state, MF host (Phase 2)
  mfe-champions/   # Vike remote — SSR, own CI/CD, public
  mfe-tier-list/   # Vike remote — SSR, own CI/CD, public
  mfe-player/      # Vike remote — SSR, own CI/CD, Auth0-protected
libs/
  ui/              # StencilJS lol-* web components — design system, leaf node
  champion/        # Champion domain: types & Valibot schemas (Champion, ChampionAbility, ChampionTier, ChampionSkin)
  player/          # Player domain: types & Valibot schemas (Player, PlayerChampion, PlayerMatchEntry)
  data-access/     # React hooks + Hono fetch clients
  storybook/       # Storybook for libs/ui components
```

Phase 1 navigation: full page loads between apps via `<a href>`.
Seamless SPA navigation via Module Federation is **Phase 2**.

### Performance Strategy (LCP / INP / CLS)

| Metric | Approach                                                                            |
| ------ | ----------------------------------------------------------------------------------- |
| LCP    | Each Vike app SSR-renders on direct URL hit — user always gets server-rendered HTML |
| CLS    | Reserve layout slots for async content using skeleton dimensions                    |
| INP    | React 19 concurrent mode + Jotai fine-grained atom subscriptions                    |

---

## Decisions

| Decision          | Choice                                                                        |
| ----------------- | ----------------------------------------------------------------------------- |
| Module Federation | Phase 2 — apps first                                                          |
| Storybook         | `libs/storybook` only — no `--storybook` Bati flag per app                    |
| Libs scope        | Skeletons only (structure, tsconfig, project.json, placeholder exports)       |
| Auth0             | `apps/shell` + `mfe/mfe-player` only                                          |
| StencilJS role    | Design system (`libs/ui`) only — Vike handles all page apps                   |
| Shell pages       | Owns `/` (home) and `_error`/404; delegates all feature routes to MFE remotes |

---

## Phase 1 — Monorepo Root Infrastructure

> No dependencies — start here.

- [x] 1.1. Create root `package.json` — `private: true`, devDeps: `nx`, `@nx/vite`, `@nx/playwright`, `typescript`, `@types/node`, `vitest`
- [x] 1.2. Create `pnpm-workspace.yaml` — packages: `apps/*`, `libs/*`
- [x] 1.3. Create `nx.json` — `build` cacheable + depends on upstream `build`; `test` depends on `build`; `lint` standalone
- [x] 1.4. Create `tsconfig.base.json` — strict, ES2022+, `paths: {}` placeholder for lib aliases
- [x] 1.5. Run `pnpm install` to bootstrap NX at root
- [x] 1.6. Run `pnpx nx configure-ai-agents` to configure NX AI agent integration

**Verify**: `pnpm nx graph` renders without errors; `pnpm nx show projects` returns empty (valid)

---

## Phase 2 — libs/champion + libs/player skeletons

> Depends on Phase 1. libs/player depends on libs/champion (for `ChampionRole`).

- [x] 2.1. `libs/champion/package.json` — name `@rift/champion`, dep: `valibot`
- [x] 2.2. `libs/champion/tsconfig.json` + `project.json` — NX targets: `build` (tsc), `lint` (oxlint), `test` (vitest)
- [x] 2.3. 4 entity files in `libs/champion/src/` — champion, champion-ability, champion-tier, champion-skin
- [x] 2.4. `libs/champion/src/index.ts` — barrel export
- [x] 2.5. `libs/player/package.json` — name `@rift/player`, deps: `valibot` + `@rift/champion`
- [x] 2.6. `libs/player/tsconfig.json` + `project.json` — NX targets: `build` (tsc), `lint` (oxlint), `test` (vitest)
- [x] 2.7. 3 entity files in `libs/player/src/` — player, player-champion, player-match-entry (imports `ChampionRoleSchema` from `@rift/champion`)
- [x] 2.8. `libs/player/src/index.ts` — barrel export
- [x] 2.9. Add `@rift/champion` + `@rift/player` path aliases to root `tsconfig.base.json`

**Verify**: `pnpm nx run champion:build` + `pnpm nx run player:build` + both lint pass

---

## Phase 3 — libs/ui skeleton (StencilJS)

> Depends on Phase 1. Can run in parallel with Phase 2.

- [x] 3.1. `npm create stencil@latest` in `libs/ui/` — select `component` type
- [x] 3.2. Add `@stencil/react-output-target` to `libs/ui/package.json`
- [x] 3.3. Configure React output target in `libs/ui/stencil.config.ts`
- [x] 3.4. Stub `lol-champion-card` component — bare `@Component` decorator, `lol-` prefix, no logic
- [x] 3.5. Create `libs/ui/project.json` — NX targets: `build` (stencil build), `lint`
- [x] 3.6. Add `@rift/ui` path alias to root `tsconfig.base.json`

**Verify**: `pnpm nx run ui:build` generates web component output + React wrappers in `dist/`

---

## Phase 4 — libs/data-access skeleton

> Depends on Phase 2.

- [x] 4.1. `libs/data-access/package.json` — name `@rift/data-access`, deps: `hono` + `@rift/champion` + `@rift/player`; peerDep: `react`
- [x] 4.2. `libs/data-access/tsconfig.json` + `project.json` — NX targets: `build`, `lint`, `test`
- [x] 4.3. `libs/data-access/src/index.ts` — stub barrel with placeholder hook/client exports
- [x] 4.4. Add `@rift/data-access` path alias to root `tsconfig.base.json`

**Verify**: `pnpm nx run data-access:build` passes; domain types resolve without error

---

## Phase 5 — libs/storybook skeleton

> Depends on Phase 3.

- [x] 5.1. Initialize Storybook 10 in `libs/storybook/` — configured to resolve `@rift/ui`
- [x] 5.2. `libs/storybook/project.json` — NX targets: `storybook` (serve), `build-storybook`
- [x] 5.3. Placeholder story: `libs/storybook/stories/lol-champion-card.stories.tsx`

**Verify**: `pnpm nx run storybook:storybook` opens and renders placeholder story

---

## Phase 6 — apps/shell

> Depends on Phase 1. Phases 6–9 can run in parallel.

- [x] 6.1. `pnpm create vike@latest shell --react --tailwindcss --shadcn-ui --auth0 --hono --oxlint`
- [x] 6.2. Replace scaffolded oxlint config — extend `../../oxlint.config.ts`
- [x] 6.3. Update `tsconfig.json` to reference `../../tsconfig.base.json`; add `@/` alias: `"@/*": ["./src/*"]`
- [x] 6.4. Configure `@/` Vite alias in `vite.config.ts`: `"@": path.resolve(__dirname, "./src")`
- [x] 6.5. Set up Vike pages:
  - `pages/+config.ts` — extends `vike-react`, `ssr: true`
  - `pages/+Layout.tsx` — global nav, auth state display
  - `pages/index/+Page.tsx` — home page (owned by shell)
  - `pages/_error/+Page.tsx` — global 404/error page
- [x] 6.6. Wire auth (Auth.js + Auth0 provider) at root layout via `pageContext.session`
- [x] 6.7. Create `apps/shell/project.json` — tag `scope:shell`

**Verify**: `pnpm nx run shell:dev`; `/` renders home; Auth0 login button visible in nav

---

## Phase 7 — mfe/mfe-champions

> Parallel with Phases 6, 8, 9.

- [x] 7.1. `pnpm create vike@latest mfe-champions --react --tailwindcss --shadcn-ui --hono --oxlint`
- [x] 7.2. Replace oxlint config; update `tsconfig.json` (extends base + `@/` alias); add `@/` Vite alias
- [x] 7.3. Set up Vike pages:
  - `pages/+config.ts`, `pages/+Layout.tsx`
  - `pages/index/+Page.tsx` — placeholder champion list
  - `pages/champions/@id/+Page.tsx` — placeholder champion detail
- [x] 7.4. Create `mfe/mfe-champions/project.json` — tag `scope:champions`

**Verify**: `pnpm nx run mfe-champions:dev`; `/` and `/champions/:id` routes render

---

## Phase 8 — mfe/mfe-tier-list

> Parallel with Phases 6, 7, 9.

- [x] 8.1. `pnpm create vike@latest mfe-tier-list --react --tailwindcss --shadcn-ui --hono --oxlint`
- [x] 8.2. Replace oxlint config; update `tsconfig.json` (extends base + `@/` alias); add `@/` Vite alias
- [x] 8.3. Set up Vike pages:
  - `pages/+config.ts`, `pages/+Layout.tsx`
  - `pages/index/+Page.tsx` — placeholder tier list
- [x] 8.4. `src/tier-list/tier-list.atoms.ts` — `tierAtom`, `roleAtom`, `patchAtom` (typed Jotai primitive atoms, URL-sync placeholder)
- [x] 8.5. Create `mfe/mfe-tier-list/project.json` — tag `scope:tier-list`

**Verify**: `pnpm nx run mfe-tier-list:dev`; filter atoms importable

---

## Phase 9 — mfe/mfe-player

> Parallel with Phases 6, 7, 8.

- [x] 9.1. `pnpm create vike@latest mfe-player --react --tailwindcss --shadcn-ui --auth0 --hono --oxlint`
- [x] 9.2. Replace oxlint config; update `tsconfig.json` (extends base + `@/` alias); add `@/` Vite alias
- [x] 9.3. Set up Vike pages:
  - `pages/+config.ts`, `pages/+Layout.tsx`
  - `pages/+guard.ts` — redirects to Auth0 signin when no session
  - `pages/index/+Page.tsx` — placeholder player profile
  - `pages/match-history/+Page.tsx` — placeholder match history
- [x] 9.4. Create `mfe/mfe-player/project.json` — tag `scope:player`

**Verify**: `pnpm nx run mfe-player:dev`; unauthenticated request redirects to Auth0

---

## Phase 10 — Cross-cutting Integration

> Depends on Phases 2–9.

- [x] 10.1. Finalize all path aliases in `tsconfig.base.json` (`@rift/champion`, `@rift/player`, `@rift/ui`, `@rift/data-access`)
- [x] 10.2. Tag all `project.json` files: `type:app`/`type:lib` + `scope:*`
- [x] 10.3. Wire `nx.json` `targetDefaults` — apps depend on upstream lib `build`
- [x] 10.4. `pnpm install` from root to re-link all workspace packages
- [x] 10.5. Update `AGENTS.md` — reflect `apps/shell` + 3 MFE remote structure and Phase 2 Module Federation plan

**Verify**:

- `pnpm nx run-many -t build` passes all projects
- `pnpm nx run-many -t lint` passes all projects
- `pnpm nx graph` shows: `shell/mfe-* → data-access → domain`; `mfe-* → ui`; `storybook → ui`

---

## Relevant Files

| File                                     | Status                                     |
| ---------------------------------------- | ------------------------------------------ |
| `pnpm-workspace.yaml`                    | To create                                  |
| `nx.json`                                | To create                                  |
| `tsconfig.base.json`                     | To create                                  |
| `oxlint.config.ts`                       | Exists — all packages extend it            |
| `.oxfmtrc.json`                          | Exists — applies to all files              |
| `.github/prompts/scaffold-mfe.prompt.md` | Exists — `project.json` template reference |
| `AGENTS.md`                              | Exists — architecture source of truth      |

---

## Open Decisions (Resolve Before Phase 10)

1. **NX module boundary enforcement**: `enforce-module-boundaries` requires ESLint; Oxlint has no equivalent. Options:
   - **(A)** Add a minimal root ESLint config with only `@nx/eslint-plugin` alongside Oxlint
   - **(B)** Rely on TypeScript path aliases + `pnpm nx graph` for visualization only (no enforcement)

2. **TypeScript 6**: AGENTS.md specifies TypeScript 6 — verify `typescript@6` is stable on npm before Phase 1; fall back to `typescript@latest` if still in pre-release.

3. **Bati flag names**: Run `pnpm create vike@latest --help` before Phase 6 — CLI evolves and flag names like `--shadcn-ui` vs `--shadcn` can differ across releases.
