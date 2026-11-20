/**
 * Which terminal's width table the map grid is being drawn for. Still a
 * design-time decision, not a measurement: each profile is a hand-written
 * table of known per-terminal behavior (docs/emoji-policy.md's ADR of
 * 2026-11-20).
 *
 * - "standard": Windows Terminal — every map glyph takes the full TILE_W.
 * - "vscode": VS Code's integrated terminal (xterm.js), whose width table
 *   stops at Unicode 12.1, so newer emoji are counted as 1 column even
 *   though the font still draws them 2 columns wide.
 */
export type TerminalProfile = "standard" | "vscode";

/*
 * Map glyphs from Unicode 13.0 or later. Confirmed on the real VS Code
 * integrated terminal (2026-11-20): exactly these drift by one column,
 * while the Unicode ≤12.0 glyphs (🧊, 🦺, …) line up. Any new map glyph
 * from Unicode 13.0–15.1 must be added here (docs/emoji-policy.md's
 * procedure for adding an emoji).
 */
const UNICODE_13_PLUS_GLYPHS: ReadonlySet<string> = new Set([
	"🦤", // dodo, 13.0
	"🪙", // coin, 13.0
	"🪄", // magic wand, 13.0
	"🧌", // troll, 14.0
	"🫥", // dotted line face, 14.0
]);

const NARROW_GLYPHS: Readonly<Record<TerminalProfile, ReadonlySet<string>>> = {
	standard: new Set(),
	vscode: UNICODE_13_PLUS_GLYPHS,
};

/**
 * Pads a glyph the terminal counts as 1 column with a trailing space, so the
 * terminal's column bookkeeping matches the 2 columns the font actually
 * draws. The space draws nothing, so the glyph's overflowing right half
 * stays visible.
 */
export const formatGlyphForTerminal = (
	glyph: string,
	profile: TerminalProfile,
): string => {
	return NARROW_GLYPHS[profile].has(glyph) ? `${glyph} ` : glyph;
};

/**
 * Maps the TERM_PROGRAM environment variable (VS Code's integrated terminal
 * sets it to "vscode") to a profile. Anything else is treated as the
 * standard (Windows Terminal) profile.
 */
export const parseTerminalProfile = (
	termProgram: string | undefined,
): TerminalProfile => {
	return termProgram === "vscode" ? "vscode" : "standard";
};
