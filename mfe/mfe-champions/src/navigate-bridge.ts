/**
 * navigate-bridge.ts
 *
 * Module-level navigate ref bridging the imperative `setNavigate()` call from
 * `client-entry.ts` → the MemoryRouter `navigate` function from `App.tsx`.
 *
 * Lives in a separate file so `App.tsx` can export only a React component
 * (required for Fast Refresh / only-export-components rule).
 */

let navigateFn: ((route: string) => void) | null = null;

export function setNavigate(route: string): void {
	navigateFn?.(route);
}

export function registerNavigate(fn: (route: string) => void): () => void {
	navigateFn = fn;
	return () => {
		navigateFn = null;
	};
}
