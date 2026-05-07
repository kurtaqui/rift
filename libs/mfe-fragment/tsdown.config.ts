import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		server: "src/server.ts",
		client: "src/client.tsx",
	},
	format: ["esm"],
	dts: true,
	outDir: "dist",
	clean: true,
	external: ["react", "react-dom", "react-dom/client"],
});
