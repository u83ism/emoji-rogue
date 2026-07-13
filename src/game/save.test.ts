import { describe, expect, it } from "vitest";
import { buildDungeonGameState } from "./initialState.js";
import { buildSaveFileContent, parseSaveFileContent } from "./save.js";

describe("save file round trip", () => {
	it("parses back exactly what was written", () => {
		const state = buildDungeonGameState(40, 20, 12345);
		const result = parseSaveFileContent(buildSaveFileContent(state));
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(state);
		}
	});

	it("rejects malformed json", () => {
		const result = parseSaveFileContent("{not json");
		expect(result).toEqual({ ok: false, error: { kind: "malformed-json" } });
		expect(parseSaveFileContent("42").ok).toBe(false);
	});

	it("rejects a different format version", () => {
		const state = buildDungeonGameState(20, 12, 1);
		const tampered = JSON.stringify({ formatVersion: 999, state });
		expect(parseSaveFileContent(tampered)).toEqual({
			ok: false,
			error: { kind: "unsupported-version", foundVersion: 999 },
		});
	});

	it("rejects a tampered state and names the field", () => {
		const state = buildDungeonGameState(20, 12, 1);
		const tampered = buildSaveFileContent(state).replace(
			`"playerHp":${state.playerHp}`,
			'"playerHp":9999',
		);
		expect(parseSaveFileContent(tampered)).toEqual({
			ok: false,
			error: { kind: "invalid-state", field: "playerHp" },
		});
	});
});
