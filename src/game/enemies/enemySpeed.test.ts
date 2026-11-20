import { describe, expect, it } from "vitest";
import { HASTED_ENEMY_FLOOR } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy, GameState } from "../state.js";
import { advanceEnemies } from "./enemies.js";

const awake = (kind: Enemy["kind"], x: number): Enemy => ({
	x,
	y: 1,
	kind,
	hp: 30,
	maxHp: 30,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

/** 15x3 corridor, the player at (7,1), on `floor`. */
const corridorOn = (floor: number, enemies: readonly Enemy[]): GameState => ({
	...buildArenaGameState(15, 3, 1),
	floor,
	deepestFloor: floor,
	enemies,
});

describe("enemy speed (enemySpeed.ts)", () => {
	it("a monster steps once a turn above HASTED_ENEMY_FLOOR, twice from it down", () => {
		const slow = advanceEnemies(corridorOn(1, [awake("zombie", 12)]));
		expect(slow.enemies[0]?.x).toBe(11);
		const hasted = advanceEnemies(
			corridorOn(HASTED_ENEMY_FLOOR, [awake("zombie", 12)]),
		);
		expect(hasted.enemies[0]?.x).toBe(10);
		const justAbove = advanceEnemies(
			corridorOn(HASTED_ENEMY_FLOOR - 1, [awake("zombie", 12)]),
		);
		expect(justAbove.enemies[0]?.x).toBe(11);
	});

	it("a hasted flier far away gets a whole second hasted move — four steps", () => {
		/* the kestrel's flight never lurches at random (no erratic chance) */
		const next = advanceEnemies(
			corridorOn(HASTED_ENEMY_FLOOR, [awake("kestrel", 13)]),
		);
		expect(next.enemies[0]?.x).toBe(9);
	});

	it("a hasted monster next to the player attacks twice", () => {
		const next = advanceEnemies(
			corridorOn(HASTED_ENEMY_FLOOR, [awake("zombie", 8)]),
		);
		const attacks = next.events.filter(
			(event) =>
				event.type === "player-hit" || event.type === "enemy-attack-missed",
		);
		expect(attacks).toHaveLength(2);
	});
});
