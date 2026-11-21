import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy, EnemySpeed, GameState } from "../state.js";
import { advanceEnemies } from "./enemies.js";

const awake = (
	kind: Enemy["kind"],
	x: number,
	speed: EnemySpeed = "normal",
): Enemy => ({
	x,
	y: 1,
	kind,
	hp: 30,
	maxHp: 30,
	awake: true,
	speed,
	held: false,
	carried: [],
	mean: false,
	gazeUsed: false,
	confused: false,
	cancelled: false,
	invisible: false,
});

/** 15x3 corridor, the player at (7,1). */
const corridor = (enemies: readonly Enemy[]): GameState => ({
	...buildArenaGameState(15, 3, 1),
	enemies,
});

describe("enemy speed (enemySpeed.ts)", () => {
	it("a normal monster steps once a turn, a hasted one twice", () => {
		expect(advanceEnemies(corridor([awake("zombie", 12)])).enemies[0]?.x).toBe(
			11,
		);
		expect(
			advanceEnemies(corridor([awake("zombie", 12, "hasted")])).enemies[0]?.x,
		).toBe(10);
	});

	it("a slowed monster steps on its acting move only, alternating", () => {
		const first = advanceEnemies(
			corridor([awake("zombie", 12, "slowed-acting")]),
		);
		expect(first.enemies[0]).toMatchObject({ x: 11, speed: "slowed-resting" });
		const second = advanceEnemies(first);
		expect(second.enemies[0]).toMatchObject({ x: 11, speed: "slowed-acting" });
	});

	it("a hasted flier far away gets a whole second hasted move — four steps", () => {
		/* the kestrel's flight never lurches at random (no erratic chance) */
		const next = advanceEnemies(corridor([awake("kestrel", 13, "hasted")]));
		expect(next.enemies[0]?.x).toBe(9);
	});

	it("a slowed flier far away acts every turn — its second move flips the turn back", () => {
		const next = advanceEnemies(
			corridor([awake("kestrel", 13, "slowed-acting")]),
		);
		expect(next.enemies[0]).toMatchObject({ x: 12, speed: "slowed-acting" });
	});

	it("a hasted monster next to the player attacks twice", () => {
		const next = advanceEnemies(corridor([awake("zombie", 8, "hasted")]));
		const attacks = next.events.filter(
			(event) =>
				event.type === "player-hit" || event.type === "enemy-attack-missed",
		);
		expect(attacks).toHaveLength(2);
	});
});
