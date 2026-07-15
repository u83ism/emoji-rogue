import { describe, expect, it } from "vitest";
import { buildDungeonGameState } from "./initialState.js";
import { validateGameState } from "./validateGameState.js";

const buildValidState = (): Record<string, unknown> => {
	const state = buildDungeonGameState(20, 12, 42);
	const serialized: unknown = JSON.parse(JSON.stringify(state));
	if (typeof serialized !== "object" || serialized === null) {
		throw new Error("unreachable: a serialized GameState is an object");
	}
	return { ...serialized };
};

const expectRejected = (tampered: unknown, field: string): void => {
	const result = validateGameState(tampered);
	expect(result.ok).toBe(false);
	if (!result.ok) {
		expect(result.error).toBe(field);
	}
};

describe("validateGameState", () => {
	it("accepts a serialized real game state and rebuilds it exactly", () => {
		const state = buildDungeonGameState(20, 12, 42);
		const result = validateGameState(JSON.parse(JSON.stringify(state)));
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(state);
		}
	});

	it("drops unknown extra fields on rebuild", () => {
		const result = validateGameState({
			...buildValidState(),
			cheatFlag: true,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect("cheatFlag" in result.value).toBe(false);
		}
	});

	it("rejects non-record roots", () => {
		expectRejected(null, "root");
		expectRejected("[]", "root");
		expectRejected(42, "root");
	});

	it("rejects broken dimensions and grids", () => {
		expectRejected({ ...buildValidState(), width: "20" }, "width");
		expectRejected({ ...buildValidState(), height: 0 }, "height");
		expectRejected({ ...buildValidState(), terrain: [] }, "terrain");

		const shortColumn = buildValidState();
		const terrain = shortColumn.terrain;
		if (!Array.isArray(terrain)) {
			throw new Error("unreachable: terrain is an array here");
		}
		terrain[3] = terrain[3].slice(1); /* one column too short */
		expectRejected(shortColumn, "terrain");

		expectRejected({ ...buildValidState(), explored: [[true]] }, "explored");
	});

	it("rejects actors off the floor or out of bounds", () => {
		expectRejected(
			{ ...buildValidState(), player: { x: 0, y: 0 } } /* perimeter wall */,
			"player",
		);
		expectRejected({ ...buildValidState(), player: { x: -1, y: 2 } }, "player");
		expectRejected(
			{
				...buildValidState(),
				enemies: [{ x: 0, y: 0, kind: "zombie", hp: 2 }],
			},
			"enemies",
		);
	});

	it("accepts a bat as a valid enemy kind", () => {
		const valid = buildValidState();
		const enemies = valid.enemies;
		if (!Array.isArray(enemies) || enemies.length === 0) {
			throw new Error("unreachable: the dungeon state spawns enemies");
		}
		const result = validateGameState({
			...valid,
			enemies: [{ ...enemies[0], kind: "bat", hp: 1 }],
		});
		expect(result.ok).toBe(true);
	});

	it("rejects broken combat fields", () => {
		expectRejected({ ...buildValidState(), playerHp: 0 }, "playerHp");
		expectRejected({ ...buildValidState(), playerHp: 9999 }, "playerHp");

		const valid = buildValidState();
		const enemies = valid.enemies;
		if (!Array.isArray(enemies) || enemies.length === 0) {
			throw new Error("unreachable: the dungeon state spawns enemies");
		}
		expectRejected(
			{ ...valid, enemies: [{ ...enemies[0], kind: "dragon" }] },
			"enemies",
		);
		expectRejected(
			{ ...valid, enemies: [{ ...enemies[0], hp: 0 }] },
			"enemies",
		);
		expectRejected(
			{ ...buildValidState(), events: [{ type: "player-hit", payload: {} }] },
			"events",
		);
		expectRejected(
			{ ...buildValidState(), events: [{ type: "unknown", payload: {} }] },
			"events",
		);
	});

	it("rejects broken items", () => {
		expectRejected(
			{
				...buildValidState(),
				items: [{ x: 0, y: 0, kind: "potion" }] /* perimeter wall */,
			},
			"items",
		);
		expectRejected(
			{ ...buildValidState(), items: [{ x: 2, y: 2, kind: "sword" }] },
			"items",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "player-healed", payload: { by: "potion", amount: -1 } },
				],
			},
			"events",
		);
	});

	it("rejects a broken floor counter or misplaced stairs", () => {
		expectRejected({ ...buildValidState(), floor: 0 }, "floor");
		expectRejected({ ...buildValidState(), floor: 2.5 }, "floor");
		expectRejected(
			{ ...buildValidState(), stairs: { x: 0, y: 0 } } /* perimeter wall */,
			"stairs",
		);
		expectRejected({ ...buildValidState(), stairs: undefined }, "stairs");
	});

	it("rejects broken rng and non-playing status", () => {
		expectRejected({ ...buildValidState(), rng: { s0: 1, s1: 2 } }, "rng");
		expectRejected(
			{ ...buildValidState(), rng: { s0: 1, s1: 2, s2: Number.NaN, c: 1 } },
			"rng",
		);
		expectRejected({ ...buildValidState(), status: "dead" }, "status");
	});
});
