// Manual smoke test for the Ink renderer: generates a small dungeon and
// prints it once via GameScreen. Run:
//
//   npx unrun scripts/demo-renderer.ts
//
// Visually confirm in your actual terminal (Windows Terminal, etc.) that the
// emoji tiles line up into a clean rectangular grid with no column drift,
// especially around the variation-selector tiles (⚠️).
import { render } from "ink";
import React from "react";
import { buildEmptyColumns } from "../src/game/columns.js";
import {
	type Cell,
	createDiggerMap,
	createRng,
	GameScreen,
	gridFrom,
	type TileGlyphs,
} from "../src/index.js";
import { at } from "../src/indexing.js";

const WIDTH = 40;
const HEIGHT = 20;

const rng = createRng(Date.now());
const map = buildEmptyColumns(WIDTH);

createDiggerMap(WIDTH, HEIGHT, rng).create((x, y, value) => {
	at(map, x)[y] = value;
});

const glyphs: TileGlyphs = {
	0: { glyph: "🟫" },
	1: { glyph: "🧱" },
	2: { glyph: "🚪" },
};
const fallback: Cell = { glyph: "⚠️" };

const grid = gridFrom(map, glyphs, fallback);

render(React.createElement(GameScreen, { grid }));
