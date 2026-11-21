import { describe, expect, it } from "vitest";
import { encodePointKey } from "../pointkey.js";
import { createRng as createAppearanceRng, seedToState } from "../rng.js";
import { rollItemAppearances } from "./appearances.js";
import { PLAYER_MAX_HP, PLAYER_START_STRENGTH } from "./balance.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy, GameState } from "./state.js";
import {
	computePlayerVisiblePoints,
	computeVisiblePoints,
	deriveExploredState,
	findVisibleEnemies,
	nameEnemy,
	VIEW_RADIUS,
} from "./vision.js";

/**
 * A 7x3 corridor (column-major): one walkable row at y=1, cut in half by a
 * blocking wall at x=3.
 */
const CORRIDOR_TERRAIN: readonly (readonly number[])[] = [
	[1, 1, 1],
	[1, 0, 1],
	[1, 0, 1],
	[1, 1, 1],
	[1, 0, 1],
	[1, 0, 1],
	[1, 1, 1],
];

const buildUnexplored = (width: number, height: number): boolean[][] => {
	const columns: boolean[][] = [];
	for (let x = 0; x < width; x++) {
		columns.push(new Array<boolean>(height).fill(false));
	}
	return columns;
};

describe("computeVisiblePoints", () => {
	it("sees a whole small arena, including its walls", () => {
		const state = buildArenaGameState(9, 7, 1);
		const visible = computeVisiblePoints(
			state.terrain,
			state.player,
			VIEW_RADIUS,
		);
		for (let x = 0; x < 9; x++) {
			for (let y = 0; y < 7; y++) {
				expect(visible.has(encodePointKey(x, y))).toBe(true);
			}
		}
	});

	it("walls block sight", () => {
		const visible = computeVisiblePoints(
			CORRIDOR_TERRAIN,
			{ x: 1, y: 1 },
			VIEW_RADIUS,
		);
		expect(visible.has(encodePointKey(2, 1))).toBe(true);
		/* the blocking wall itself is visible... */
		expect(visible.has(encodePointKey(3, 1))).toBe(true);
		/* ...but nothing behind it is */
		expect(visible.has(encodePointKey(4, 1))).toBe(false);
		expect(visible.has(encodePointKey(5, 1))).toBe(false);
	});

	it("respects a custom radius, seeing far fewer tiles when it shrinks", () => {
		const state = buildArenaGameState(9, 7, 1);
		const wide = computeVisiblePoints(state.terrain, state.player, VIEW_RADIUS);
		const narrow = computeVisiblePoints(state.terrain, state.player, 1);
		expect(narrow.size).toBeLessThan(wide.size);
		expect(narrow.has(encodePointKey(state.player.x, state.player.y))).toBe(
			true,
		);
		expect(narrow.has(encodePointKey(0, 0))).toBe(false);
	});
});

describe("computePlayerVisiblePoints", () => {
	/** A 15x9 arena whose middle is one room x 4..10, y 2..6; the player at its center (7,4). */
	const withRoom = (dark: boolean): GameState => ({
		...buildArenaGameState(15, 9, 1),
		explored: buildUnexplored(15, 9),
		rooms: [{ x1: 4, y1: 2, x2: 10, y2: 6, dark }],
	});

	it("in a lit room, the whole room is seen, walls and doors included", () => {
		const visible = computePlayerVisiblePoints(withRoom(false));
		expect(visible.has(encodePointKey(3, 1))).toBe(true);
		expect(visible.has(encodePointKey(11, 7))).toBe(true);
		expect(visible.has(encodePointKey(12, 4))).toBe(false);
	});

	it("in a dark room or a corridor, only the eight tiles around", () => {
		const visible = computePlayerVisiblePoints(withRoom(true));
		expect(visible.size).toBe(9);
		expect(visible.has(encodePointKey(8, 5))).toBe(true);
		expect(visible.has(encodePointKey(9, 4))).toBe(false);
		const corridor = { ...withRoom(false), rooms: [] };
		expect(computePlayerVisiblePoints(corridor).size).toBe(9);
	});

	it("blind, nothing but the player's own tile", () => {
		const blind = { ...withRoom(false), blindTurnsRemaining: 3 };
		expect([...computePlayerVisiblePoints(blind)]).toEqual([
			encodePointKey(7, 4),
		]);
	});

	it("a dark room's floor is forgotten once the player is out of it, its walls are not", () => {
		const inside = deriveExploredState(withRoom(true));
		expect(inside.explored[8]?.[5]).toBe(true);
		expect(inside.explored[3]?.[1]).toBe(false);
		/* walk out east past the wall, onto (12,4) */
		const outside = deriveExploredState({
			...inside,
			player: { x: 12, y: 4 },
			explored: inside.explored.map((column, x) =>
				column.map((seen, y) => seen || (x === 11 && y === 4)),
			),
		});
		expect(outside.explored[8]?.[5]).toBe(false);
		expect(outside.explored[11]?.[4]).toBe(true);
	});
});

describe("deriveExploredState", () => {
	it("adds visible cells, keeps old ones, and leaves hidden cells dark", () => {
		const explored = buildUnexplored(7, 3);
		const beyondWallColumn = explored[5];
		if (beyondWallColumn === undefined) {
			throw new Error("unreachable: column 5 exists in a 7-wide grid");
		}
		beyondWallColumn[1] = true; /* pretend this was seen earlier */

		const state: GameState = {
			width: 7,
			height: 3,
			terrain: CORRIDOR_TERRAIN,
			explored,
			player: { x: 1, y: 1 },
			playerHp: 10,
			playerMaxHp: PLAYER_MAX_HP,
			playerLevel: 1,
			playerExperience: 0,
			playerStrength: PLAYER_START_STRENGTH,
			playerMaxStrength: PLAYER_START_STRENGTH,
			playerFood: 100,
			confusedTurnsRemaining: 0,
			levitationTurnsRemaining: 0,
			blindTurnsRemaining: 0,
			paralyzedTurnsRemaining: 0,
			playerRunFlag: false,
			nextHitConfuses: false,
			hiddenTiles: [],
			hasteTurnsRemaining: 0,
			hasteMoveSpent: false,
			seeInvisibleTurnsRemaining: 0,
			stuckTurnsRemaining: 0,
			rooms: [],
			appearances: rollItemAppearances(createAppearanceRng(1)),
			detectMonstersTurnsRemaining: 0,
			hallucinatingTurnsRemaining: 0,
			enemies: [],
			items: [],
			inventory: [],
			nextItemId: 1,
			identifiedItemKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			deepestFloor: 1,
			turnsOnCurrentFloor: 0,
			quietTurns: 0,
			flytrapHoldDamage: 0,
			floorsWithoutFood: 0,
			wandererDelayTurns: 70,
			wandererRollTurns: 0,
			stairs: { x: 2, y: 1 },
			amulet: undefined,
			hasAmulet: false,
			events: [],
			rng: seedToState(1),
			status: "playing",
		};
		const next = deriveExploredState(state);

		expect(next.explored[2]?.[1]).toBe(true); /* newly visible */
		expect(next.explored[5]?.[1]).toBe(true); /* remembered */
		expect(next.explored[4]?.[1]).toBe(false); /* never seen */
		expect(state.explored[2]?.[1]).toBe(false); /* input not mutated */
	});

	it("explores nothing new while blind — not even the tile next door", () => {
		const explored = buildUnexplored(7, 3);
		const state: GameState = {
			width: 7,
			height: 3,
			terrain: CORRIDOR_TERRAIN,
			explored,
			player: { x: 1, y: 1 },
			playerHp: 10,
			playerMaxHp: PLAYER_MAX_HP,
			playerLevel: 1,
			playerExperience: 0,
			playerStrength: PLAYER_START_STRENGTH,
			playerMaxStrength: PLAYER_START_STRENGTH,
			playerFood: 100,
			confusedTurnsRemaining: 0,
			levitationTurnsRemaining: 0,
			blindTurnsRemaining: 5,
			paralyzedTurnsRemaining: 0,
			playerRunFlag: false,
			nextHitConfuses: false,
			hiddenTiles: [],
			hasteTurnsRemaining: 0,
			hasteMoveSpent: false,
			seeInvisibleTurnsRemaining: 0,
			stuckTurnsRemaining: 0,
			rooms: [],
			appearances: rollItemAppearances(createAppearanceRng(1)),
			detectMonstersTurnsRemaining: 0,
			hallucinatingTurnsRemaining: 0,
			enemies: [],
			items: [],
			inventory: [],
			nextItemId: 1,
			identifiedItemKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			deepestFloor: 1,
			turnsOnCurrentFloor: 0,
			quietTurns: 0,
			flytrapHoldDamage: 0,
			floorsWithoutFood: 0,
			wandererDelayTurns: 70,
			wandererRollTurns: 0,
			stairs: { x: 2, y: 1 },
			amulet: undefined,
			hasAmulet: false,
			events: [],
			rng: seedToState(1),
			status: "playing",
		};
		const next = deriveExploredState(state);

		expect(next.explored[1]?.[1]).toBe(true); /* player's own tile */
		/* original Rogue's cansee(): blind, not even the tile next door */
		expect(next.explored[2]?.[1]).toBe(false);
		expect(next.explored[3]?.[1]).toBe(false);
	});
});

describe("findVisibleEnemies", () => {
	const zombie = (x: number, y: number): Enemy => ({
		x,
		y,
		kind: "zombie",
		hp: 2,
		maxHp: 2,
		awake: true,
		speed: "normal" as const,
		held: false,
		carried: [],
		mean: false,
		gazeUsed: false,
		confused: false,
	});

	it("returns every enemy inside the player's field of view", () => {
		const near = zombie(6, 4);
		const far = zombie(7, 4);
		const state = { ...buildArenaGameState(9, 9, 1), enemies: [near, far] };
		expect(findVisibleEnemies(state)).toEqual([near, far]);
	});

	it("returns an empty array when no enemies are visible", () => {
		const state = buildArenaGameState(9, 9, 1);
		expect(findVisibleEnemies(state)).toEqual([]);
	});
});

describe("nameEnemy", () => {
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
	});

	it("names a monster in sight by its kind, and one out of sight, a phantom or anything while blind as something", () => {
		/* a 9x5 arena — one lit room — the player at (4,2) */
		const lit = buildArenaGameState(9, 5, 1);
		expect(nameEnemy(lit, monster("zombie", 7, 3))).toBe("zombie");
		expect(nameEnemy(lit, monster("phantom", 5, 2))).toBe("something");
		expect(
			nameEnemy(
				{ ...lit, seeInvisibleTurnsRemaining: 5 },
				monster("phantom", 5, 2),
			),
		).toBe("phantom");
		expect(
			nameEnemy({ ...lit, blindTurnsRemaining: 5 }, monster("zombie", 5, 2)),
		).toBe("something");
		const dark = {
			...lit,
			rooms: [{ ...lit.rooms[0], x1: 1, y1: 1, x2: 7, y2: 3, dark: true }],
		};
		expect(nameEnemy(dark, monster("zombie", 7, 3))).toBe("something");
		expect(nameEnemy(dark, monster("zombie", 5, 3))).toBe("zombie");
		/* detecting monsters names them all */
		expect(
			nameEnemy(
				{ ...dark, detectMonstersTurnsRemaining: 5 },
				monster("zombie", 7, 3),
			),
		).toBe("zombie");
	});
});
