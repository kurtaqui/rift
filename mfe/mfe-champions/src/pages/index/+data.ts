// Home page has no server-side data — Marketing is static and Dashboard
// is client-side-only (requires browser auth session check).
export type Data = Record<string, never>;

export function data(): Data {
	return {};
}
