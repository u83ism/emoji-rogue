import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Replay } from "./game/replay.js";
import { loadReplay, saveReplay } from "./replayFile.js";

const REPLAY: Replay = {
	width: 40,
	height: 20,
	seed: 12345,
	actions: [{ type: "wait" }, { type: "move", payload: { direction: "east" } }],
};

let testDirectory: string;
let testFilePath: string;

beforeEach(() => {
	testDirectory = mkdtempSync(join(tmpdir(), "emoji-rogue-replay-"));
	testFilePath = join(testDirectory, "replay.json");
});

afterEach(() => {
	rmSync(testDirectory, { recursive: true, force: true });
});

describe("saveReplay / loadReplay", () => {
	it("round-trips a replay without consuming the file", () => {
		saveReplay(REPLAY, testFilePath);
		expect(existsSync(testFilePath)).toBe(true);

		expect(loadReplay(testFilePath)).toEqual(REPLAY);
		expect(existsSync(testFilePath)).toBe(
			true,
		); /* not consumed, unlike saves */
		expect(loadReplay(testFilePath)).toEqual(REPLAY); /* readable repeatedly */
	});

	it("creates missing directories on save", () => {
		const nested = join(testDirectory, "deeper", "replay.json");
		saveReplay(REPLAY, nested);
		expect(existsSync(nested)).toBe(true);
	});

	it("overwrites the previous replay (single slot)", () => {
		saveReplay(REPLAY, testFilePath);
		const longer: Replay = {
			...REPLAY,
			actions: [...REPLAY.actions, { type: "wait" }],
		};
		saveReplay(longer, testFilePath);
		expect(loadReplay(testFilePath)).toEqual(longer);
	});

	it("returns undefined for invalid or missing content", () => {
		expect(loadReplay(testFilePath)).toBeUndefined(); /* no file yet */
		writeFileSync(testFilePath, "{broken", "utf8");
		expect(loadReplay(testFilePath)).toBeUndefined();
	});
});
