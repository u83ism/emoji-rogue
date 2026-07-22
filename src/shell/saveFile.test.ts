import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDungeonGameState } from "../game/initialState.js";
import { loadSavedGameState, saveGameState } from "./saveFile.js";

let testDirectory: string;
let testFilePath: string;

beforeEach(() => {
	testDirectory = mkdtempSync(join(tmpdir(), "emoji-rogue-save-"));
	testFilePath = join(testDirectory, "save.json");
});

afterEach(() => {
	rmSync(testDirectory, { recursive: true, force: true });
});

describe("saveGameState / loadSavedGameState", () => {
	it("round-trips a state and consumes the file on load", () => {
		const state = buildDungeonGameState(20, 12, 7);
		saveGameState(state, testFilePath);
		expect(existsSync(testFilePath)).toBe(true);

		expect(loadSavedGameState(testFilePath)).toEqual({
			kind: "loaded",
			state,
		});
		expect(existsSync(testFilePath)).toBe(false); /* resumes exactly once */
		expect(loadSavedGameState(testFilePath)).toEqual({ kind: "none" });
	});

	it("creates missing directories on save", () => {
		const nested = join(testDirectory, "deeper", "save.json");
		saveGameState(buildDungeonGameState(20, 12, 7), nested);
		expect(existsSync(nested)).toBe(true);
	});

	it("reports a corrupted save file, consumes it, and starts fresh", () => {
		writeFileSync(testFilePath, "{broken", "utf8");
		expect(loadSavedGameState(testFilePath)).toEqual({ kind: "corrupted" });
		expect(existsSync(testFilePath)).toBe(false); /* no retry loop next boot */
	});

	it("reports no save when no save file exists", () => {
		expect(loadSavedGameState(testFilePath)).toEqual({ kind: "none" });
	});
});
