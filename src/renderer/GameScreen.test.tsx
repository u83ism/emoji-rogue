import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { Cell } from "./cell.js";
import { GameScreen } from "./GameScreen.js";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes requires matching the ESC control character
const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

const stripAnsi = (text: string): string => {
	return text.replace(ANSI_ESCAPE, "");
};

describe("GameScreen", () => {
	it("renders one line per grid row, in order", () => {
		const grid: Cell[][] = [
			[{ glyph: "🧱" }, { glyph: "·" }, { glyph: "🧱" }],
			[{ glyph: "🚪" }, { glyph: "·" }, { glyph: "·" }],
		];

		const { lastFrame } = render(<GameScreen grid={grid} />);
		const frame = stripAnsi(lastFrame() ?? "");
		const lines = frame.split("\n");

		expect(lines).toHaveLength(2);
		expect(lines[0]).toBe("🧱·🧱");
		expect(lines[1]).toBe("🚪··");
	});

	it("does not corrupt rows containing variation-selector emoji", () => {
		// ⚠️ and 🌡️ rely on a variation selector (U+FE0F) to render as emoji —
		// historically the source of width-measurement bugs in general-purpose
		// terminal layout engines (see docs/design.md and the plan for why this
		// renderer avoids per-cell <Box> sizing in the first place).
		const grid: Cell[][] = [[{ glyph: "⚠️" }, { glyph: "🌡️" }, { glyph: "·" }]];

		const { lastFrame } = render(<GameScreen grid={grid} />);
		const frame = stripAnsi(lastFrame() ?? "");

		expect(frame).toBe("⚠️🌡️·");
	});

	it("renders differently-colored cells without corrupting their text content", () => {
		// The exact ANSI sequence isn't asserted here (Ink disables color
		// output in this non-TTY test environment, and the color-grouping
		// logic itself is already covered by runs.test.ts in isolation) — this
		// just checks the Ink wiring doesn't garble text across a color change.
		const grid: Cell[][] = [
			[
				{ glyph: "a", fg: "red" },
				{ glyph: "b", fg: "red" },
				{ glyph: "c", fg: "blue" },
			],
		];

		const { lastFrame } = render(<GameScreen grid={grid} />);
		expect(stripAnsi(lastFrame() ?? "")).toBe("abc");
	});
});
