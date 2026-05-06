# Rift Architecture Plan — Future Improvements

## Tailwind v4 @source Coupling

**Status**: Deferred
**Reason**: Currently shell's `pages/tailwind.css` scans MFE source paths directly (`@source "../../mfe-*/src"`). This was changed from the original plan (which avoided MFE source coupling) because it resolved build/HMR issues.
**Future work**: Decouple shell @source from MFE paths once Tailwind v4 scanning or build pipeline behavior is better understood. The plan intended each MFE to own its own Tailwind scan.

---

## API Auth Session Verification

**Status**: Mock placeholder
**Current impl**: [apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts) uses a hardcoded mock session and no-op `requireUser` guard.
**Future work**: Wire real Auth.js session verification via `libs/auth.getSession()` so the API can verify cross-origin session cookies from the shell. This unblocks true `/player/*` guarding at the API level instead of relying on shell-side guards alone.

---

## Phase D-B: SSR-Dynamic Module Federation

**Status**: Not started
**Scope**: Load MFE remote bundles at runtime on both server (Node) and client (browser).
**Current state**: Phase D-A (client-only) is stable and tested. Shell SSR continues to resolve MFE pages in-tree via workspace aliases.
**Future work**: Implement server-side `@module-federation/vite` runtime integration once v1.15+ SSR stability is confirmed in production. Enables zero-downtime MFE redeploys without shell rebuild.

---

## NX Boundary Tags & Enforcement

**Status**: Not enforced
**Plan references**: §11 "Resolved Decisions" item 5 (NX scopes).
**Current gaps**: `nx.json` has no tag-based boundary policies.
**Future work**: Add `nx.json` `namedInputs` and module-boundary rules to enforce allowed dependency edges (e.g., `scope:shell` → `scope:mfe`, `scope:lib-domain` → `scope:lib-domain` with player→champion-only).

---

## Phase F Performance Polish

**Status**: Not started
**Items**:
- F.1 — Shared chunk audit via `mf-stats.json`
- F.2 — Link prefetch on header nav
- F.3 — Lighthouse CI per route
- F.4 — Remote loading skeleton component
- F.5 — `vike-react-query` for client-side caching

---

## Expected New Library: `libs/mfe-runtime`

**Status**: Not created
**Plan references**: §12 "Files / Packages Affected" (listed as new).
**Current state**: Functionality exists but spread across shell middleware and helpers.
**Future work**: Consider consolidating `createRemoteRoute()` helper and shared MFE utilities into a dedicated `libs/mfe-runtime` package.

