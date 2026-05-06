import type { ReactElement } from "react";
import { usePageContext } from "vike-react/usePageContext";

export function Link({ href, children }: { href: string; children: string }): ReactElement {
	const pageContext = usePageContext();
	const { urlPathname } = pageContext;
	const isActive = urlPathname === href || (href !== "/" && urlPathname.startsWith(`${href}/`));
	return (
		<a
			href={href}
			className={
				isActive
					? "text-foreground font-semibold relative after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:bg-primary after:rounded-full"
					: "text-muted-foreground transition-colors hover:text-foreground"
			}>
			{children}
		</a>
	);
}
