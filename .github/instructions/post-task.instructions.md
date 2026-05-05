---
applyTo: "**"
description: Required post-task verification — run lint --fix and fmt before reporting completion
---

# Post-Task Verification

After finishing any task that modifies files in this workspace, you **must** run the following two commands, in order, from the repo root:

```bash
pnpm lint --fix
pnpm fmt
```

## Rules

- Run **after** all file edits for the task are complete — not between intermediate edits.
- Run **before** telling the user the task is done.
- `pnpm lint --fix` first (auto-applies safe fixes), then `pnpm fmt` (formats the resulting code).
- If `pnpm lint --fix` reports remaining errors or warnings, prefer fixing them in code over disabling rules — but see "Evaluating remaining warnings" below.
- If either command fails, surface the failure and resolve it before completing the task.

## Evaluating remaining warnings

Before fixing or disabling a remaining lint warning, judge whether the rule actually applies in the current file's context. A rule that is correct for one project type can be noise (or actively harmful) in another. Examples in this repo:

- **React rules on StencilJS components** — Stencil uses `h()`, HTML attributes, class-based components, and its own renderer. React-specific rules (`react/*`, `react-perf/*`, `react/no-unknown-property`, `react/prefer-function-component`, etc.) often don't apply. Stencil files live in [libs/ui/src](libs/ui/src) and [mfe/mfe-player/src](mfe/mfe-player/src) and already have an override block in [oxlint.config.ts](oxlint.config.ts) — extend that block rather than adding inline disables.
- **Vike convention files** (`+Page.tsx`, `+Layout.tsx`, `+data.ts`, `+config.ts`, etc.) — return-type / default-export rules are often noise here; there is already a `**/pages/**` override.
- **Decorator metadata** — `typescript/consistent-type-imports` must stay off for files using `@Event()` (runtime `EventEmitter` import is required).
- **Generic helpers with caller-controlled deps** (e.g. `useFetchedJson(load, deps)`) — `react-hooks/exhaustive-deps` cannot statically verify caller-supplied arrays; an inline disable with an explanatory comment is appropriate.
- **Drizzle schema barrel** — `import * as schema` is the documented convention; `import/no-namespace` should be disabled at the file level with a comment.

When you encounter a warning that falls into one of these categories — i.e. **the rule does not make sense for the file's project type, is overly pedantic, or fixing it would hurt readability/maintainability rather than help** — do **not** silently disable it. Instead:

1. State which rule is firing, where, and why you believe the rule does not apply (or the fix would hurt code quality).
2. Offer the user a small set of options, typically:
   - Disable globally in [oxlint.config.ts](oxlint.config.ts) (with a justification comment)
   - Disable in a scoped `overrides` block (preferred when the issue is project-type-specific)
   - Inline `// oxlint-disable-next-line <rule> -- <reason>` (preferred for one-off cases)
   - Refactor the code instead (and describe the refactor)
3. Wait for the user's choice before applying the change.

Inline `oxlint-disable` / `oxlint-disable-next-line` comments **must always include a `-- <reason>`** explaining why the rule does not apply in that location.

## When to Skip

Only skip when:

- The task made **no file changes** (pure read/research/Q&A).
- The user explicitly said to skip formatting/linting for this task.
- The task is itself failing in a way that makes lint/fmt meaningless (e.g. broken syntax the user is mid-debugging) — in that case, mention that you skipped them and why.

## Why

This repo enforces zero lint warnings and consistent oxfmt formatting across all 11 projects. Running these commands at task end keeps the working tree CI-clean and avoids drive-by formatting noise in subsequent diffs.
