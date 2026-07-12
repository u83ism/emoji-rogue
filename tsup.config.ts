import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "es2022",
	// Declaration output is blocked until the Stage 3 rewrite clears the
	// noUncheckedIndexedAccess/exactOptionalPropertyTypes backlog tracked in
	// docs/tasks.md — dts generation type-checks the source and currently
	// fails on that pre-existing debt. Flip back on once typecheck is clean.
	dts: false,
	sourcemap: true,
	clean: true,
});
