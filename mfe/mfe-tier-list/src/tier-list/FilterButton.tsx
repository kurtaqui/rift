"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";

type Props<T> = {
	value: T;
	active: boolean;
	onSelect: (value: T) => void;
	className: string;
	children: ReactNode;
};

/**
 * Single filter pill — wraps the click handler in `useCallback` per row so
 * that mapped lists of buttons don't recreate handler identities on each
 * render of the parent.
 */
export function FilterButton<T>({ value, active, onSelect, className, children }: Props<T>): ReactNode {
	const handleClick = useCallback(() => {
		onSelect(value);
	}, [onSelect, value]);

	return (
		<button type="button" onClick={handleClick} className={className} aria-pressed={active}>
			{children}
		</button>
	);
}
