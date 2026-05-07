import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
	// oxlint-disable-next-line react/hook-use-state -- intentional single-element destructure: setter not needed for a stable QueryClient reference
	const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }));
	return (
		<QueryClientProvider client={queryClient}>
			<Suspense fallback={null}>{children}</Suspense>
		</QueryClientProvider>
	);
}
