# @rift/mfe-player

Player profile micro-frontend authored as a **Stencil** component package
(no Vike). Demonstrates the second MFE delivery pattern in the monorepo:

| Pattern         | Used by                        | Tech                                        |
| --------------- | ------------------------------ | ------------------------------------------- |
| Vike apps + MF  | `mfe-champions`, `mfe-tier-list` | Vike SSR + Module Federation runtime remote |
| Stencil package | `mfe-player` (this)            | Stencil custom element + DSD SSR + Hydrate  |

## Outputs

`stencil build` produces:

- `dist/` — `dist` ESM bundle + `dist-custom-elements` + `loader/`
- `hydrate/` — `dist-hydrate-script` (Node-side render → DSD)
- `src/react/` — `@stencil/react-output-target` wrappers (consumed via `@rift/mfe-player/react`)

## Public API

```ts
import "@rift/mfe-player/loader";          // browser custom-element registration
import { RiftPlayerApp } from "@rift/mfe-player/react";
import { renderToString } from "@rift/mfe-player/hydrate";
```

## Components

- `<rift-player-app>` — top-level shell. Props: `user?`, `initialRoute?`. Emits `routechange`.
- `<rift-player-overview>` — top-3 mastery cards.
- `<rift-player-champions>` — owned champions grid.
- `<rift-player-matches>` — match history table.

Mock data lives in `src/data/mock.ts` and is bundled into the component so SSR
and CSR render identically.
