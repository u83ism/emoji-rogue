import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import type { Enemy, GameState } from "../game/state.js";
import {
	decideWeaponToThrow,
	findAdjacentEnemyDirection,
	shouldRestToHeal,
} from "./combatPolicy.js";

const baseState = (): GameState => buildArenaGameState(9, 9, 1);

const enemyAt = (x: number, y: number): Enemy => ({
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
	cancelled: false,
	invisible: false,
});

describe("findAdjacentEnemyDirection", () => {
	it("is undefined with no enemies nearby", () => {
		expect(findAdjacentEnemyDirection(baseState())).toBeUndefined();
	});

	it("is undefined for an enemy that is merely nearby, not adjacent", () => {
		const state = { ...baseState(), enemies: [enemyAt(4, 2)] };
		expect(findAdjacentEnemyDirection(state)).toBeUndefined();
	});

	it("points at an enemy directly north", () => {
		const state = { ...baseState(), enemies: [enemyAt(4, 3)] };
		expect(findAdjacentEnemyDirection(state)).toBe("north");
	});

	it("points at an enemy directly south", () => {
		const state = { ...baseState(), enemies: [enemyAt(4, 5)] };
		expect(findAdjacentEnemyDirection(state)).toBe("south");
	});

	it("points at an enemy directly west", () => {
		const state = { ...baseState(), enemies: [enemyAt(3, 4)] };
		expect(findAdjacentEnemyDirection(state)).toBe("west");
	});

	it("points at an enemy directly east", () => {
		const state = { ...baseState(), enemies: [enemyAt(5, 4)] };
		expect(findAdjacentEnemyDirection(state)).toBe("east");
	});

	it("returns an adjacent enemy regardless of whether it is still asleep", () => {
		const state = {
			...baseState(),
			enemies: [{ ...enemyAt(4, 3), awake: false }],
		};
		expect(findAdjacentEnemyDirection(state)).toBe("north");
	});
});

describe("shouldRestToHeal", () => {
	const wounded = (): GameState => ({
		...baseState(),
		playerHp: 10,
		playerMaxHp: 30,
	});

	it("rests while below two thirds of max HP with nothing awake on the floor", () => {
		expect(shouldRestToHeal(wounded())).toBe(true);
		expect(
			shouldRestToHeal({
				...wounded(),
				enemies: [{ ...enemyAt(7, 7), awake: false }],
			}),
		).toBe(true);
	});

	it("does not rest at two thirds of max HP or above", () => {
		expect(shouldRestToHeal({ ...wounded(), playerHp: 20 })).toBe(false);
	});

	it("does not rest while any enemy on the floor is awake", () => {
		expect(shouldRestToHeal({ ...wounded(), enemies: [enemyAt(7, 7)] })).toBe(
			false,
		);
	});

	it("does not rest once food has run down to the weak stage", () => {
		expect(shouldRestToHeal({ ...wounded(), playerFood: 100 })).toBe(false);
	});
});

describe("decideWeaponToThrow", () => {
	const darts = {
		itemId: 5,
		kind: "weapon" as const,
		weaponKind: "dart" as const,
		equipped: false,
		cursed: false,
		hitBonus: 0,
		damageBonus: 0,
		quantity: 8,
	};

	it("throws a held missile at an awake enemy that is not yet adjacent", () => {
		const state = {
			...baseState(),
			inventory: [darts],
			enemies: [enemyAt(4, 1)],
		};
		/* the player stands at (4,4): the enemy is straight north */
		expect(decideWeaponToThrow(state)).toEqual({
			itemId: 5,
			direction: "north",
		});
	});

	it("does not throw at an enemy off the player's row, column and diagonals", () => {
		const state = {
			...baseState(),
			inventory: [darts],
			enemies: [enemyAt(6, 3)],
		};
		expect(decideWeaponToThrow(state)).toBeUndefined();
		/* (6,2) lies on the player's (4,4) diagonal */
		expect(
			decideWeaponToThrow({ ...state, enemies: [enemyAt(6, 2)] })?.direction,
		).toBe("northeast");
	});

	it("prefers the harder-hitting missile", () => {
		const shuriken = { ...darts, itemId: 6, weaponKind: "shuriken" as const };
		const state = {
			...baseState(),
			inventory: [darts, shuriken],
			enemies: [enemyAt(4, 1)],
		};
		expect(decideWeaponToThrow(state)?.itemId).toBe(6);
	});

	it("does not throw at an adjacent enemy, a sleeping one, or with nothing in view", () => {
		const state = { ...baseState(), inventory: [darts] };
		expect(decideWeaponToThrow(state)).toBeUndefined();
		expect(
			decideWeaponToThrow({ ...state, enemies: [enemyAt(4, 3)] }),
		).toBeUndefined();
		expect(
			decideWeaponToThrow({
				...state,
				enemies: [{ ...enemyAt(4, 1), awake: false }],
			}),
		).toBeUndefined();
	});

	it("never throws the wielded weapon, a launcher-only missile, or a plain melee weapon", () => {
		const enemies = [enemyAt(4, 1)];
		expect(
			decideWeaponToThrow({
				...baseState(),
				enemies,
				inventory: [{ ...darts, equipped: true }],
			}),
		).toBeUndefined();
		expect(
			decideWeaponToThrow({
				...baseState(),
				enemies,
				inventory: [
					{ ...darts, weaponKind: "arrow" as const },
					{ ...darts, itemId: 7, weaponKind: "mace" as const, quantity: 1 },
				],
			}),
		).toBeUndefined();
	});
});
