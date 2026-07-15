import { describe, expect, it } from "vitest";
import { buildDungeonGameState } from "./initialState.js";
import { buildSaveFileContent, parseSaveFileContent } from "./save.js";

/**
 * The structural shape of a value: objects keep their keys, arrays collapse
 * to the shape of their first element, leaves become their typeof.
 */
const describeShape = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.length === 0 ? [] : [describeShape(value[0])];
	}
	if (typeof value === "object" && value !== null) {
		return Object.fromEntries(
			Object.entries(value).map(([key, field]) => [key, describeShape(field)]),
		);
	}
	return typeof value;
};

describe("save file shape guard", () => {
	it("pins the serialized shape — a change here means SAVE_FORMAT_VERSION must be bumped", () => {
		/* If this fails, the GameState/save-file shape changed. Do BOTH:
		 *   1. bump SAVE_FORMAT_VERSION in save.ts (old files must not be
		 *      half-read by a build expecting a different shape), and
		 *   2. update the expected shape below.
		 * (GameEvent payloads are pinned by validateGameState tests instead —
		 * a fresh state's event log is empty.) */
		const written = buildSaveFileContent(buildDungeonGameState(20, 12, 42));
		expect(describeShape(JSON.parse(written))).toEqual({
			formatVersion: "number",
			state: {
				width: "number",
				height: "number",
				terrain: [["number"]],
				explored: [["boolean"]],
				player: { x: "number", y: "number" },
				playerHp: "number",
				playerAttackDamage: "number",
				playerDefense: "number",
				playerFood: "number",
				enemies: [{ x: "number", y: "number", kind: "string", hp: "number" }],
				items: [{ x: "number", y: "number", kind: "string" }],
				inventory: [],
				goldPiles: [{ x: "number", y: "number", amount: "number" }],
				goldCollected: "number",
				traps: [{ x: "number", y: "number", kind: "string" }],
				floor: "number",
				stairs: { x: "number", y: "number" },
				events: [],
				rng: { s0: "number", s1: "number", s2: "number", c: "number" },
				status: "string",
			},
		});
	});
});

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
