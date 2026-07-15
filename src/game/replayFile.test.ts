import { describe, expect, it } from "vitest";
import type { Replay } from "./replay.js";
import {
	buildReplayFileContent,
	parseReplayFileContent,
} from "./replayFile.js";

const REPLAY: Replay = {
	width: 40,
	height: 20,
	seed: 12345,
	actions: [
		{ type: "wait" },
		{ type: "move", payload: { direction: "north" } },
	],
};

describe("replay file round trip", () => {
	it("parses back exactly what was written", () => {
		const result = parseReplayFileContent(buildReplayFileContent(REPLAY));
		expect(result).toEqual({ ok: true, value: REPLAY });
	});

	it("rejects malformed json", () => {
		const result = parseReplayFileContent("{not json");
		expect(result).toEqual({ ok: false, error: { kind: "malformed-json" } });
		expect(parseReplayFileContent("42").ok).toBe(false);
	});

	it("rejects a different format version", () => {
		const tampered = JSON.stringify({ formatVersion: 999, replay: REPLAY });
		expect(parseReplayFileContent(tampered)).toEqual({
			ok: false,
			error: { kind: "unsupported-version", foundVersion: 999 },
		});
	});

	it("rejects a tampered replay and names the field", () => {
		const tampered = buildReplayFileContent(REPLAY).replace(
			`"width":${REPLAY.width}`,
			'"width":0',
		);
		expect(parseReplayFileContent(tampered)).toEqual({
			ok: false,
			error: { kind: "invalid-replay", field: "width" },
		});
	});
});
