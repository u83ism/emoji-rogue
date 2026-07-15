import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/main.tsx", "src/game/index.ts"],
	format: ["esm"],
	target: "es2022",
	dts: true,
	sourcemap: true,
	clean: true,
});
