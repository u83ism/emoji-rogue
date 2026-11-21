import { describe, expect, it } from "vitest";
import { createRng } from "../../rng.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy, GameState, Item } from "../state.js";
import { applyEnemyPickups, findItemGoal } from "./enemyPack.js";

const monster = (kind: Enemy["kind"], x: number, y: number): Enemy => ({
	x,
	y,
	kind,
	hp: 5,
	maxHp: 5,
	awake: true,
	speed: "normal",
	held: false,
	carried: [],
	mean: false,
	gazeUsed: false,
	confused: false,
	cancelled: false,
	invisible: false,
});

const potion = (x: number, y: number): Item => ({ x, y, kind: "heal-potion" });

/* a 20x5 arena split into two rooms — A spans x 1..7 (the player at (3,2)),
 * B x 12..18 */
const twoRooms = (overrides: Partial<GameState> = {}): GameState => ({
	...buildArenaGameState(20, 5, 1),
	player: { x: 3, y: 2 },
	rooms: [
		{ x1: 1, y1: 1, x2: 7, y2: 3, dark: false },
		{ x1: 12, y1: 1, x2: 18, y2: 3, dark: false },
	],
	...overrides,
});

describe("findItemGoal", () => {
	it("sends a carrying kind out of the player's room and sight to an item in its own room", () => {
		const nymph = monster("nymph", 15, 2); /* carries 100% */
		const state = twoRooms({ items: [potion(17, 3)], enemies: [nymph] });
		expect(findItemGoal(state, nymph, createRng(1))).toEqual({ x: 17, y: 3 });
	});

	it("leaves it after the player when it cannot carry, shares the player's room, or the item is elsewhere", () => {
		const items = [potion(17, 3)];
		const zombie = monster("zombie", 15, 2); /* carries nothing */
		expect(
			findItemGoal(
				twoRooms({ items, enemies: [zombie] }),
				zombie,
				createRng(1),
			),
		).toBeUndefined();
		const near = monster("nymph", 5, 2); /* in the player's room */
		expect(
			findItemGoal(
				twoRooms({ items: [potion(6, 3)], enemies: [near] }),
				near,
				createRng(1),
			),
		).toBeUndefined();
		const nymph = monster("nymph", 15, 2);
		expect(
			findItemGoal(
				twoRooms({ items: [potion(6, 3)], enemies: [nymph] }),
				nymph,
				createRng(1),
			),
		).toBeUndefined();
	});

	it("skips an item another monster already heads for", () => {
		const nymph = monster("nymph", 15, 2);
		const other = { ...monster("nymph", 13, 1), goal: { x: 17, y: 3 } };
		const state = twoRooms({ items: [potion(17, 3)], enemies: [other, nymph] });
		expect(findItemGoal(state, nymph, createRng(1))).toBeUndefined();
	});
});

describe("applyEnemyPickups", () => {
	it("picks the item up into the pack and stops; gives up a goal with nothing left on it", () => {
		const there = { ...monster("nymph", 17, 3), goal: { x: 17, y: 3 } };
		const state = twoRooms({ items: [potion(17, 3)], enemies: [there] });
		const next = applyEnemyPickups(state);
		expect(next.items).toEqual([]);
		expect(next.enemies[0]).toEqual({
			...monster("nymph", 17, 3),
			awake: false,
			carried: [potion(17, 3)],
		});
		const gone = { ...monster("nymph", 15, 2), goal: { x: 17, y: 3 } };
		expect(applyEnemyPickups(twoRooms({ enemies: [gone] })).enemies[0]).toEqual(
			monster("nymph", 15, 2),
		);
	});

	it("leaves an orc standing guard on its gold", () => {
		const orc = { ...monster("orc", 17, 3), goal: { x: 17, y: 3 } };
		const state = twoRooms({
			goldPiles: [{ x: 17, y: 3, amount: 30 }],
			enemies: [orc],
		});
		const next = applyEnemyPickups(state);
		expect(next.goldPiles).toEqual(state.goldPiles);
		expect(next.enemies[0]?.awake).toBe(false);
	});
});
