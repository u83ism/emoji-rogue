#!/usr/bin/env node
import { render } from "ink";
// Manual smoke test for the Ink renderer: generates a small dungeon and
// prints it once via GameScreen. Run after `npm run build`:
//
//   node scripts/demo-renderer.mjs
//
// Visually confirm in your actual terminal (Windows Terminal, etc.) that the
// emoji tiles line up into a clean rectangular grid with no column drift,
// especially around the variation-selector tiles (⚠️).
import React from "react";
import {
	createDiggerMap,
	createRng,
	GameScreen,
	gridFrom,
} from "../dist/index.mjs";

const WIDTH = 40;
const HEIGHT = 20;

const rng = createRng(Date.now());
const map = [];
for (let x = 0; x < WIDTH; x++) map.push([]);

createDiggerMap(WIDTH, HEIGHT, rng).create((x, y, value) => {
	map[x][y] = value;
});

const glyphs = {
	0: { glyph: "・" },
	1: { glyph: "🧱" },
	2: { glyph: "🚪" },
};
const fallback = { glyph: "⚠️" };

const grid = gridFrom(map, glyphs, fallback);

render(React.createElement(GameScreen, { grid }));
