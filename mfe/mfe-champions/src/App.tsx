import { Suspense, useEffect } from "react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

import { registerNavigate } from "./navigate-bridge";
import ChampionDetailPage from "./pages/champion-detail/Page";
import ChampionsListPage from "./pages/champions-list/Page";

type AppProps = {
	/** Shell mount path for this MFE, e.g. `/champions`. */
	basePath?: string;
	/** Origin key used by client-entry to expose shell URL sync emitters. */
	mfeOrigin?: string;
	/**
	 * MFE-relative route, e.g. `/` or `/ahri`.
	 * On initial render (SSR + hydration): derived from `window.location`.
	 * On Vike SPA navigations: updated by the shell via `setNavigate()`.
	 */
	route?: string;
};

function ShellRouteSync({ basePath = "", mfeOrigin }: { basePath?: string; mfeOrigin?: string }): null {
	const location = useLocation();

	useEffect(() => {
		if (!mfeOrigin) {
			return;
		}

		const normalizedBasePath = basePath === "" || basePath === "/" ? "" : basePath.replace(/\/+$/, "");
		const nextPath =
			location.pathname === "/" ? normalizedBasePath || "/" : `${normalizedBasePath}${location.pathname}`;
		const emit = (globalThis as Record<string, unknown>)[`__mfe_emit_navigate__${mfeOrigin}`];

		if (typeof emit === "function") {
			(emit as (route: string) => void)(nextPath);
		}
	}, [basePath, location.pathname, mfeOrigin]);

	return null;
}

function IntraMfeAnchorInterceptor({ basePath = "" }: { basePath?: string }): null {
	const navigate = useNavigate();

	useEffect(() => {
		const normalizedBasePath = basePath === "" || basePath === "/" ? "" : basePath.replace(/\/+$/, "");

		const onClick = (event: MouseEvent): void => {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}

			const anchor = target.closest("a[href]");
			if (!(anchor instanceof HTMLAnchorElement)) {
				return;
			}

			if (anchor.target && anchor.target !== "_self") {
				return;
			}

			const url = new URL(anchor.href, globalThis.location.href);
			if (url.origin !== globalThis.location.origin) {
				return;
			}

			if (
				normalizedBasePath &&
				!(url.pathname === normalizedBasePath || url.pathname.startsWith(`${normalizedBasePath}/`))
			) {
				return;
			}

			event.preventDefault();

			const relativePath = normalizedBasePath
				? url.pathname.slice(normalizedBasePath.length) || "/"
				: url.pathname || "/";
			const to = `${relativePath}${url.search}${url.hash}`;
			const navigation = navigate(to);
			if (navigation instanceof Promise) {
				navigation.catch(() => {
					/* empty */
				});
			}
		};

		document.addEventListener("click", onClick);
		return () => document.removeEventListener("click", onClick);
	}, [basePath, navigate]);

	return null;
}

function DetailRoute({ basePath }: { basePath?: string }): React.ReactElement {
	const { id } = useParams<{ id: string }>();
	return <ChampionDetailPage id={id ?? ""} basePath={basePath} />;
}

/**
 * Bridges the `registerNavigate` ref → MemoryRouter's `useNavigate`.
 * Must render inside the router so it has access to the navigate function.
 */
function NavigateBridge(): null {
	const navigate = useNavigate();
	useEffect(
		() =>
			registerNavigate((route: string) => {
				const navigation = navigate(route);
				if (navigation instanceof Promise) {
					navigation.catch(() => {
						/* empty */
					});
				}
			}),
		[navigate],
	);
	return null;
}

export default function App({ basePath, mfeOrigin, route }: AppProps) {
	const initialPath = route ?? "/";

	return (
		<MemoryRouter initialEntries={[initialPath]}>
			<NavigateBridge />
			<ShellRouteSync basePath={basePath} mfeOrigin={mfeOrigin} />
			<IntraMfeAnchorInterceptor basePath={basePath} />
			<Suspense fallback={null}>
				<Routes>
					<Route path="/:id" element={<DetailRoute basePath={basePath} />} />
					<Route path="/" element={<ChampionsListPage basePath={basePath} />} />
				</Routes>
			</Suspense>
		</MemoryRouter>
	);
}
