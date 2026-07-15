import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import { BAT_MAX_HP, PLAYER_ATTACK_DAMAGE, ZOMBIE_MAX_HP } from "./balance.js";
import { advanceEnemies } from "./enemies.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy, GameState } from "./state.js";

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: ZOMBIE_MAX_HP,
});

const bat = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "bat",
	hp: BAT_MAX_HP,
});

/** 9x3 arena: one walkable row at y=1, player at (4,1). */
const buildCorridorState = (enemies: GameState["enemies"]): GameState => ({
	...buildArenaGameState(9, 3, 1),
	enemies,
});

const buildUnexplored7x3 = (): boolean[][] => {
	const columns: boolean[][] = [];
	for (let x = 0; x < 7; x++) {
		columns.push(new Array<boolean>(3).fill(false));
	}
	return columns;
};

describe("advanceEnemies", () => {
	it("a visible enemy chases the player via A*, consuming no rng", () => {
		const state = buildCorridorState([zombie(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(6, 1)]);
		expect(next.status).toBe("playing");
		expect(next.rng).toEqual(state.rng);
	});

	it("an adjacent enemy attacks in place instead of moving", () => {
		const state = buildCorridorState([zombie(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1)]);
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
		]);
		expect(next.status).toBe("playing");
	});

	it("the player's hp reaching zero ends the run", () => {
		const state = { ...buildCorridorState([zombie(5, 1)]), playerHp: 1 };
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
			{ type: "player-died", payload: { by: "zombie" } },
		]);
	});

	it("enemies stop acting once the run has ended this turn", () => {
		/* two adjacent zombies, 1 hp left: only the first one gets to attack */
		const state = {
			...buildCorridorState([zombie(3, 1), zombie(5, 1)]),
			playerHp: 1,
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(3, 1), zombie(5, 1)]);
		expect(
			next.events.filter((event) => event.type === "player-hit").length,
		).toBe(1);
	});

	it("enemies never stack on the same tile", () => {
		/* both chase the player westwards along the single row */
		const state = buildCorridorState([zombie(6, 1), zombie(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1), zombie(6, 1)]);
	});

	it("an unseen enemy wanders, consuming the state's rng", () => {
		/* 7x3 corridor cut by a wall at x=3: the enemy at (5,1) is hidden */
		const state: GameState = {
			width: 7,
			height: 3,
			terrain: [
				[1, 1, 1],
				[1, 0, 1],
				[1, 0, 1],
				[1, 1, 1],
				[1, 0, 1],
				[1, 0, 1],
				[1, 1, 1],
			],
			explored: buildUnexplored7x3(),
			player: { x: 1, y: 1 },
			playerHp: 10,
			playerAttackDamage: PLAYER_ATTACK_DAMAGE,
			enemies: [zombie(5, 1)],
			items: [],
			inventory: [],
			floor: 1,
			stairs: { x: 2, y: 1 },
			events: [],
			rng: seedToState(1),
			status: "playing",
		};
		const next = advanceEnemies(state);
		/* (4,1) is the only open neighbor */
		expect(next.enemies).toEqual([zombie(4, 1)]);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("is deterministic: same state in, same state out", () => {
		const state = buildCorridorState([zombie(7, 1)]);
		expect(advanceEnemies(state)).toEqual(advanceEnemies(state));
	});

	it("a bat chases two tiles per player turn (twice a zombie's speed)", () => {
		const state = buildCorridorState([bat(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([bat(5, 1)]);
	});

	it("a bat adjacent to the player attacks twice per turn", () => {
		const state = buildCorridorState([bat(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([bat(5, 1)]);
		expect(next.playerHp).toBe(state.playerHp - 2);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "bat", damage: 1 } },
			{ type: "player-hit", payload: { by: "bat", damage: 1 } },
		]);
	});

	it("a bat's second attack is skipped once it already ended the run", () => {
		const state = { ...buildCorridorState([bat(5, 1)]), playerHp: 1 };
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "bat", damage: 1 } },
			{ type: "player-died", payload: { by: "bat" } },
		]);
	});
});
