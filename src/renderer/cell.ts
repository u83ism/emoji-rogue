/**
 * Fixed terminal-column width of one logical grid cell. Hardcoded per
 * docs/design.md: emoji width is never measured at runtime (wcwidth-style
 * measurement is not trustworthy for emoji), so every cell is treated as
 * exactly 2 columns wide by design-time decision.
 */
export const TILE_W = 2 as const;

/**
 * One logical grid cell: a single glyph (never pre-widened — width handling
 * is entirely the renderer's job, not the glyph's) with optional colors.
 */
export interface Cell {
	readonly glyph: string;
	// `| undefined` (not just `?`) so callers may write `fg: undefined`
	// explicitly under exactOptionalPropertyTypes, matching how grid.ts
	// unconditionally sets both fields on every Cell it builds.
	readonly fg?: string | undefined;
	readonly bg?: string | undefined;
}
