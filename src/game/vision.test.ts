import { describe, expect, it } from "vitest";
import { encodePointKey } from "../pointkey.js";
import { seedToState } from "../rng.js";
import {
	BLIND_VIEW_RADIUS,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_MAX_HP,
} from "./balance.js";
import { buildArenaGameState } from "./initialState.js";
import type { GameState } from "./state.js";
import {
	computeVisiblePoints,
	deriveExploredState,
	resolveViewRadius,
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
		const visible = computeVisiblePoints(state.terrain, state.player);
		for (let x = 0; x < 9; x++) {
			for (let y = 0; y < 7; y++) {
				expect(visible.has(encodePointKey(x, y))).toBe(true);
			}
		}
	});

	it("walls block sight", () => {
		const visible = computeVisiblePoints(CORRIDOR_TERRAIN, { x: 1, y: 1 });
		expect(visible.has(encodePointKey(2, 1))).toBe(true);
		/* the blocking wall itself is visible... */
		expect(visible.has(encodePointKey(3, 1))).toBe(true);
		/* ...but nothing behind it is */
		expect(visible.has(encodePointKey(4, 1))).toBe(false);
		expect(visible.has(encodePointKey(5, 1))).toBe(false);
	});

	it("respects a custom radius, seeing far fewer tiles when it shrinks", () => {
		const state = buildArenaGameState(9, 7, 1);
		const wide = computeVisiblePoints(state.terrain, state.player);
		const narrow = computeVisiblePoints(state.terrain, state.player, 1);
		expect(narrow.size).toBeLessThan(wide.size);
		expect(narrow.has(encodePointKey(state.player.x, state.player.y))).toBe(
			true,
		);
		expect(narrow.has(encodePointKey(0, 0))).toBe(false);
	});
});

describe("resolveViewRadius", () => {
	it("returns the normal radius when not blind", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(resolveViewRadius(state)).toBe(8);
	});

	it("returns the shrunken blind radius while blindTurnsRemaining is positive", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			blindTurnsRemaining: 5,
		};
		expect(resolveViewRadius(state)).toBe(BLIND_VIEW_RADIUS);
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
			playerAttackDamage: PLAYER_ATTACK_DAMAGE,
			playerDefense: 0,
			playerFood: 100,
			hasRingOfRegeneration: false,
			hasRingOfSustenance: false,
			confusedTurnsRemaining: 0,
			levitationTurnsRemaining: 0,
			armorProtected: false,
			blindTurnsRemaining: 0,
			paralyzedTurnsRemaining: 0,
			detectMonstersTurnsRemaining: 0,
			enemies: [],
			items: [],
			inventory: [],
			identifiedPotionKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			stairs: { x: 2, y: 1, direction: "down" },
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

	it("explores fewer new cells while blind", () => {
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
			playerAttackDamage: PLAYER_ATTACK_DAMAGE,
			playerDefense: 0,
			playerFood: 100,
			hasRingOfRegeneration: false,
			hasRingOfSustenance: false,
			confusedTurnsRemaining: 0,
			levitationTurnsRemaining: 0,
			armorProtected: false,
			blindTurnsRemaining: 5,
			paralyzedTurnsRemaining: 0,
			detectMonstersTurnsRemaining: 0,
			enemies: [],
			items: [],
			inventory: [],
			identifiedPotionKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			stairs: { x: 2, y: 1, direction: "down" },
			amulet: undefined,
			hasAmulet: false,
			events: [],
			rng: seedToState(1),
			status: "playing",
		};
		const next = deriveExploredState(state);

		expect(next.explored[1]?.[1]).toBe(true); /* player's own tile */
		expect(next.explored[2]?.[1]).toBe(
			true,
		); /* one tile away, still in radius 1 */
		expect(next.explored[3]?.[1]).toBe(
			false,
		); /* two tiles away, too far while blind */
	});
});
