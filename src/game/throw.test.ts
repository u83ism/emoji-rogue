import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { PLAYER_START_STRENGTH } from "./balance.js";
import { calculateStrengthDamageBonus } from "./combat/strength.js";
import type { EnemyKind, WeaponKind } from "./events.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy, GameState, HeldItem } from "./state.js";
import { applyThrowItem } from "./throw.js";

/** add_dam[] for the starting strength of 16 — what every fixture hit adds on top of its dice. */
const START_STRENGTH_DAMAGE = calculateStrengthDamageBonus(
	PLAYER_START_STRENGTH,
);

const weaponOf = (
	itemId: number,
	weaponKind: WeaponKind,
	overrides: Partial<Extract<HeldItem, { kind: "weapon" }>> = {},
): HeldItem => ({
	itemId,
	kind: "weapon",
	weaponKind,
	equipped: false,
	cursed: false,
	hitBonus: 0,
	damageBonus: 0,
	quantity: 1,
	...overrides,
});

const enemyOf = (
	kind: EnemyKind,
	x: number,
	y: number,
	awake = true,
): Enemy => ({
	x,
	y,
	kind,
	hp: 200,
	maxHp: 200,
	awake,
	speed: "normal" as const,
	held: false,
	confusedTurnsRemaining: 0,
});

/** A player level that makes every throw land (see combat.test.ts's SURE_HIT_LEVEL). */
const SURE_HIT_LEVEL = 30;

/** 9x9 arena, player in the middle at (4,4), one zombie three tiles east. */
const buildState = (
	inventory: readonly HeldItem[],
	overrides: Partial<GameState> = {},
): GameState => ({
	...buildArenaGameState(9, 9, 1),
	playerLevel: SURE_HIT_LEVEL,
	enemies: [enemyOf("zombie", 7, 4)],
	inventory,
	...overrides,
});

/** The damage of the first missile-hit event. */
const readDamage = (state: GameState): number => {
	const event = state.events.find((entry) => entry.type === "missile-hit");
	return event?.type === "missile-hit" ? event.payload.damage : Number.NaN;
};

describe("applyThrowItem", () => {
	it("is a no-op for an item that is not held, not a weapon, or the weapon being wielded", () => {
		const state = buildState([
			weaponOf(1, "mace", { equipped: true }),
			{ itemId: 2, kind: "food" },
		]);
		expect(applyThrowItem(state, 99)).toBe(state);
		expect(applyThrowItem(state, 2)).toBe(state);
		expect(applyThrowItem(state, 1)).toBe(state);
	});

	it("is a no-op with no enemy in view", () => {
		const state = buildState([weaponOf(1, "dart")], { enemies: [] });
		expect(applyThrowItem(state, 1)).toBe(state);
	});

	it("a hit rolls the weapon's hurl dice plus the strength bonus, uses the missile up and wakes the target", () => {
		const state = buildState([weaponOf(1, "spear")], {
			enemies: [enemyOf("zombie", 7, 4, false)],
		});
		const next = applyThrowItem(state, 1);
		const damage = readDamage(next);
		/* a thrown spear is 1d6 */
		expect(damage).toBeGreaterThanOrEqual(1 + START_STRENGTH_DAMAGE);
		expect(damage).toBeLessThanOrEqual(6 + START_STRENGTH_DAMAGE);
		expect(next.inventory).toEqual([]);
		expect(next.items).toEqual(state.items); /* nothing lands */
		expect(next.enemies).toEqual([
			{ ...enemyOf("zombie", 7, 4), hp: 200 - damage },
		]);
		expect(next.events).toEqual([
			{
				type: "missile-hit",
				payload: { target: "zombie", variant: "spear", damage },
			},
		]);
		expect(next.quietTurns).toBe(0);
	});

	it("takes one off a stack and leaves the rest in the same slot", () => {
		const state = buildState([weaponOf(1, "dart", { quantity: 10 })]);
		const next = applyThrowItem(state, 1);
		expect(next.inventory).toEqual([weaponOf(1, "dart", { quantity: 9 })]);
	});

	it("an arrow shot with the bow wielded rolls 2d3 and adds the bow's bonuses", () => {
		const state = buildState([
			weaponOf(1, "short-bow", { equipped: true, damageBonus: 10 }),
			weaponOf(2, "arrow", { quantity: 5 }),
		]);
		const damage = readDamage(applyThrowItem(state, 2));
		expect(damage).toBeGreaterThanOrEqual(2 + 10 + START_STRENGTH_DAMAGE);
		expect(damage).toBeLessThanOrEqual(6 + 10 + START_STRENGTH_DAMAGE);
	});

	it("an arrow thrown by hand, without the bow wielded, is only its plain 1d1", () => {
		const state = buildState([
			weaponOf(1, "short-bow", { damageBonus: 10 }) /* held, not wielded */,
			weaponOf(2, "arrow", { quantity: 5 }),
		]);
		expect(readDamage(applyThrowItem(state, 2))).toBe(
			1 + START_STRENGTH_DAMAGE,
		);
	});

	it("a kill by a thrown weapon removes the enemy and awards experience", () => {
		const state = buildState([weaponOf(1, "shuriken", { quantity: 3 })], {
			enemies: [{ ...enemyOf("zombie", 7, 4), hp: 1 }],
		});
		const next = applyThrowItem(state, 1);
		expect(next.enemies).toEqual([]);
		expect(next.playerExperience).toBeGreaterThan(state.playerExperience);
		expect(next.events.map((event) => event.type)).toContain("enemy-defeated");
	});

	it("a miss drops the missile on a free floor tile next to the target, with a fresh id when it came off a stack", () => {
		/* a -200 to hit puts the chance at 0% */
		const state = buildState(
			[weaponOf(1, "dart", { quantity: 4, hitBonus: -200 })],
			{ nextItemId: 50 },
		);
		const next = applyThrowItem(state, 1);
		expect(next.inventory).toEqual([
			weaponOf(1, "dart", { quantity: 3, hitBonus: -200 }),
		]);
		expect(next.events).toEqual([
			{
				type: "missile-missed",
				payload: { target: "zombie", variant: "dart" },
			},
		]);
		expect(next.items.length).toBe(1);
		const landed = next.items[0];
		if (landed?.kind !== "weapon") {
			throw new Error("unreachable: the landed item is the dart");
		}
		expect(Math.abs(landed.x - 7)).toBeLessThanOrEqual(1);
		expect(Math.abs(landed.y - 4)).toBeLessThanOrEqual(1);
		expect(next.terrain[landed.x]?.[landed.y]).toBe(0);
		expect(landed.identity).toEqual({
			itemId: 50,
			weaponKind: "dart",
			cursed: false,
			hitBonus: -200,
			damageBonus: 0,
			quantity: 1,
		});
		expect(next.nextItemId).toBe(51);
		expect(next.enemies.every((enemy) => enemy.hp === 200)).toBe(true);
	});

	it("a missed single weapon keeps its own id on the floor", () => {
		const state = buildState([weaponOf(7, "spear", { hitBonus: -200 })], {
			nextItemId: 50,
		});
		const next = applyThrowItem(state, 7);
		expect(next.inventory).toEqual([]);
		const landed = next.items[0];
		expect(landed?.kind === "weapon" ? landed.identity.itemId : undefined).toBe(
			7,
		);
		expect(next.nextItemId).toBe(50);
	});

	it("a miss still wakes a sleeping target", () => {
		const state = buildState([weaponOf(1, "dart", { hitBonus: -200 })], {
			enemies: [enemyOf("zombie", 7, 4, false)],
		});
		expect(applyThrowItem(state, 1).enemies[0]?.awake).toBe(true);
	});

	it("gets no edge against a sleeping target — original Rogue's fight() wakes it before rolling", () => {
		/* level 1 against a zombie (armor class 8): 45%. A -9 to hit makes that 0%, asleep or not. */
		const inventory = [weaponOf(1, "dart", { quantity: 400, hitBonus: -9 })];
		const countHits = (awake: boolean): number => {
			let state = buildState(inventory, {
				playerLevel: 1,
				enemies: [enemyOf("zombie", 7, 4, awake)],
			});
			let hits = 0;
			for (let attempt = 0; attempt < 300; attempt++) {
				const next = applyThrowItem(state, 1);
				if (next.events.some((event) => event.type === "missile-hit")) {
					hits += 1;
				}
				/* same target state every time, only the rng and the stack move on */
				state = {
					...state,
					rng: next.rng,
					inventory: next.inventory,
				};
			}
			return hits;
		};
		expect(countHits(true)).toBe(0);
		expect(countHits(false)).toBe(0);
	});

	it("through advanceTurn, throwing spends the turn", () => {
		const state = buildState([weaponOf(1, "dart", { quantity: 2 })]);
		const next = advanceTurn(state, {
			type: "throw-item",
			payload: { itemId: 1 },
		});
		expect(next.playerFood).toBe(state.playerFood - 1);
	});
});
