import { describe, expect, it } from "vitest";
import {
	formatGlyphForTerminal,
	parseTerminalProfile,
} from "./terminalProfile.js";

describe("formatGlyphForTerminal", () => {
	it("pads a Unicode 13+ glyph with one space in the vscode profile", () => {
		expect(formatGlyphForTerminal("🦤", "vscode")).toBe("🦤 ");
		expect(formatGlyphForTerminal("🫥", "vscode")).toBe("🫥 ");
	});

	it("leaves a Unicode ≤12 glyph unchanged in the vscode profile", () => {
		expect(formatGlyphForTerminal("🧊", "vscode")).toBe("🧊");
		expect(formatGlyphForTerminal("🟫", "vscode")).toBe("🟫");
	});

	it("never pads in the standard profile", () => {
		expect(formatGlyphForTerminal("🦤", "standard")).toBe("🦤");
	});
});

describe("parseTerminalProfile", () => {
	it("maps VS Code's TERM_PROGRAM to the vscode profile", () => {
		expect(parseTerminalProfile("vscode")).toBe("vscode");
	});

	it("falls back to standard for anything else, including unset", () => {
		expect(parseTerminalProfile(undefined)).toBe("standard");
		expect(parseTerminalProfile("WezTerm")).toBe("standard");
	});
});
