import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../../rng.js";
import {
	calculateGoldAmountMax,
	GOLD_AMOUNT_MIN,
	PLAYER_START_STRENGTH,
	THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
} from "../balance.js";
import { calculateEnemyExperienceReward } from "../enemies/enemyStats.js";
import type { EnemyKind } from "../events.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy, HeldItem } from "../state.js";
import { applyEnemyHit, applyPlayerAttack, isAdjacent } from "./combat.js";
import { calculateStrengthDamageBonus } from "./strength.js";

/** add_dam[] for the starting strength of 16 — what every fixture hit adds on top of its dice. */
const START_STRENGTH_DAMAGE = calculateStrengthDamageBonus(
	PLAYER_START_STRENGTH,
);

/** Every fixture enemy's max HP (what its experience reward is computed from) and default HP — more than one unarmed hit (1d4+1) removes. */
const TEST_ENEMY_HP = 12;

const enemyOf = (
	kind: EnemyKind,
	x: number,
	y: number,
	hp = TEST_ENEMY_HP,
	awake = true,
): Enemy => ({
	x,
	y,
	kind,
	hp,
	maxHp: TEST_ENEMY_HP,
	awake,
	speed: "normal" as const,
	held: false,
	carried: [],
	mean: false,
	gazeUsed: false,
	confusedTurnsRemaining: 0,
});

const zombie = (
	x: number,
	y: number,
	hp = TEST_ENEMY_HP,
	awake = true,
): Enemy => enemyOf("zombie", x, y, hp, awake);
/** 1 HP: any wand strike kills it. */
const thief = (x: number, y: number): Enemy => enemyOf("thief", x, y, 1);
const orc = (x: number, y: number, hp = TEST_ENEMY_HP): Enemy =>
	enemyOf("orc", x, y, hp);

/**
 * A player level at which the to-hit chance is 100% against every kind's
 * armor class, so a test's swing lands without hunting for a seed. Level
 * does not enter the damage roll.
 */
const SURE_HIT_LEVEL = 30;

const weaponWith = (attackBonus: number): HeldItem => ({
	itemId: 1,
	kind: "weapon",
	equipped: true,
	cursed: false,
	weaponKind: "long-sword" as const,
	hitBonus: attackBonus,
	damageBonus: attackBonus,
	quantity: 1,
});

/**
 * 60 well-spread rng states: one seed stepped 0..59 times. Neighboring small
 * seeds are no good for this — their first uniform draws are all close to 0.
 */
const buildSpreadRngStates = (): readonly RngState[] => {
	const states: RngState[] = [];
	let current = seedToState(1);
	for (let i = 0; i < 60; i++) {
		states.push(current);
		current = stepUniform(current).state;
	}
	return states;
};

describe("isAdjacent", () => {
	it("is true for the eight neighbors only", () => {
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 1 })).toBe(true);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 2 })).toBe(true);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(true);
		/* the same tile and farther ones are not */
		expect(isAdjacent({ x: 2, y: 2 }, { x: 4, y: 3 })).toBe(false);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(false);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 4 })).toBe(false);
	});
});

describe("applyPlayerAttack wakes its target, hit or miss", () => {
	it("a swing at a sleeping or held enemy wakes it and breaks the hold even when it misses", () => {
		const target = { ...zombie(5, 4, TEST_ENEMY_HP, false), held: true };
		const misses = buildSpreadRngStates()
			.map((rng) =>
				applyPlayerAttack(
					{ ...buildArenaGameState(9, 9, 1), rng, enemies: [target] },
					target,
				),
			)
			.filter((next) =>
				next.events.some((event) => event.type === "player-attack-missed"),
			);
		expect(misses.length).toBeGreaterThan(0);
		for (const next of misses) {
			expect(next.enemies[0]).toMatchObject({ awake: true, held: false });
		}
	});
});

describe("applyPlayerAttack", () => {
	const state = {
		...buildArenaGameState(9, 9, 1),
		playerLevel: SURE_HIT_LEVEL,
	};
	/** The damage of the first enemy-hit event. */
	const readDamage = (next: typeof state): number => {
		const event = next.events[0];
		return event?.type === "enemy-hit" ? event.payload.damage : Number.NaN;
	};

	it("damages the target by the unarmed roll (1d4 + the strength bonus) and logs the hit", () => {
		const target = zombie(5, 4);
		const bystander = zombie(7, 7);
		const next = applyPlayerAttack(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		const damage = readDamage(next);
		expect(damage).toBeGreaterThanOrEqual(1 + START_STRENGTH_DAMAGE);
		expect(damage).toBeLessThanOrEqual(4 + START_STRENGTH_DAMAGE);
		expect(next.enemies).toEqual([
			zombie(5, 4, TEST_ENEMY_HP - damage),
			bystander,
		]);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage } },
		]);
	});

	it("removes a target whose hp reaches zero and logs the defeat", () => {
		const target = zombie(5, 4, 1);
		const bystander = zombie(7, 7);
		const next = applyPlayerAttack(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		expect(next.enemies).toEqual([bystander]);
		expect(next.events).toEqual([
			{
				type: "enemy-hit",
				payload: { target: "zombie", damage: readDamage(next) },
			},
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
	});

	it("does not move the player or touch the terrain", () => {
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.player).toEqual(state.player);
		expect(next.terrain).toBe(state.terrain);
	});

	it("an equipped weapon rolls its own dice and adds its attackBonus", () => {
		const target = zombie(5, 4, 100);
		const armed = { ...state, inventory: [weaponWith(2)], enemies: [target] };
		const next = applyPlayerAttack(armed, target);
		const damage = readDamage(next);
		/* 3d4 + the strength bonus + 2 */
		expect(damage).toBeGreaterThanOrEqual(3 + START_STRENGTH_DAMAGE + 2);
		expect(damage).toBeLessThanOrEqual(12 + START_STRENGTH_DAMAGE + 2);
		expect(next.enemies).toEqual([zombie(5, 4, 100 - damage)]);
	});

	it("a roll dragged below zero by a cursed weapon deals 0, never negative damage", () => {
		const target = zombie(5, 4, 100);
		const cursed = {
			...state,
			playerLevel: 200 /* still lands despite the -50 to hit */,
			inventory: [weaponWith(-50)],
			enemies: [target],
		};
		const next = applyPlayerAttack(cursed, target);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage: 0 } },
		]);
		expect(next.enemies).toEqual([target]);
	});

	it("a hit on a sleeping target deals the normal roll (no multiplier), logs enemy-hit and wakes it", () => {
		const target = zombie(5, 4, 100, false);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		const damage = readDamage(next);
		expect(damage).toBeGreaterThanOrEqual(1 + START_STRENGTH_DAMAGE);
		expect(damage).toBeLessThanOrEqual(4 + START_STRENGTH_DAMAGE);
		expect(next.enemies).toEqual([zombie(5, 4, 100 - damage, true)]);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage } },
		]);
	});

	it("a kill awards the experience that individual is worth", () => {
		const target = zombie(5, 4, 1);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.playerExperience).toBe(
			calculateEnemyExperienceReward("zombie", TEST_ENEMY_HP),
		);
	});

	it("a non-lethal hit awards no experience", () => {
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.playerExperience).toBe(state.playerExperience);
	});

	it("a failed to-hit roll deals no damage, logs player-attack-missed, but still resets quietTurns and consumes rng", () => {
		/* a -100 to hit puts the chance at 0% */
		const missState = { ...state, inventory: [weaponWith(-100)] };
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...missState, enemies: [target] }, target);
		expect(next.enemies).toEqual([target]);
		expect(next.events).toEqual([
			{ type: "player-attack-missed", payload: { target: "zombie" } },
		]);
		expect(next.quietTurns).toBe(0);
		expect(next.rng).not.toEqual(missState.rng);
	});

	it("a sleeping target can still be missed — sleep only adds to the to-hit roll", () => {
		const missState = { ...state, inventory: [weaponWith(-100)] };
		const target = zombie(5, 4, 10, false);
		const next = applyPlayerAttack({ ...missState, enemies: [target] }, target);
		expect(next.events).toEqual([
			{ type: "player-attack-missed", payload: { target: "zombie" } },
		]);
	});
});

describe("enemy gold drop", () => {
	const state = {
		...buildArenaGameState(9, 9, 1),
		playerLevel: SURE_HIT_LEVEL,
	};

	/* the arena fixture is floor 1 */
	const GOLD_AMOUNT_MAX = calculateGoldAmountMax(1);

	/** A kill that consumes no rng of its own — so every seed of a spread is one. */
	const killOutright = (from: typeof state, target: Enemy): typeof state =>
		applyEnemyHit(from, target, target.hp, {
			type: "enemy-hit",
			payload: { target: target.kind, damage: target.hp },
		});

	it("an orc drops no gold — original Rogue's orc only guards the room's gold", () => {
		const target = orc(5, 4, 1);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.goldCollected).toBe(state.goldCollected);
		expect(next.events.some((event) => event.type === "enemy-gold-drop")).toBe(
			false,
		);
	});

	it("a killed monster drops what it carried where it died, or next to it", () => {
		const potion = { x: 0, y: 0, kind: "heal-potion" as const };
		const target = { ...orc(5, 4, 1), carried: [potion, potion] };
		const next = killOutright({ ...state, enemies: [target] }, target);
		expect(next.items).toHaveLength(2);
		expect(next.items[0]).toEqual({ ...potion, x: 5, y: 4 });
		const second = next.items[1];
		expect(second?.kind).toBe("heal-potion");
		expect(Math.abs((second?.x ?? 0) - 5)).toBeLessThanOrEqual(1);
		expect(Math.abs((second?.y ?? 0) - 4)).toBeLessThanOrEqual(1);
	});

	it("a killed thief drops one gold pile's worth, or five on a passed magic save — more often at a higher level", () => {
		const dropsAtLevel = (playerLevel: number): readonly number[] =>
			buildSpreadRngStates().map((rng) => {
				const target = thief(5, 4);
				const seeded = {
					...state,
					rng,
					playerLevel,
					enemies: [target],
				};
				const next = killOutright(seeded, target);
				const dropped = next.goldCollected - seeded.goldCollected;
				expect(next.events).toContainEqual({
					type: "enemy-gold-drop",
					payload: { by: "thief", amount: dropped },
				});
				return dropped;
			});
		const isBigDrop = (dropped: number): boolean => dropped > GOLD_AMOUNT_MAX;
		const lowLevelDrops = dropsAtLevel(1);
		for (const dropped of lowLevelDrops) {
			expect(dropped).toBeGreaterThanOrEqual(GOLD_AMOUNT_MIN);
			expect(dropped).toBeLessThanOrEqual(
				GOLD_AMOUNT_MAX * THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
			);
		}
		const lowLevelBigDrops = lowLevelDrops.filter(isBigDrop).length;
		expect(lowLevelBigDrops).toBeGreaterThan(0);
		expect(lowLevelBigDrops).toBeLessThan(lowLevelDrops.length / 2);
		expect(dropsAtLevel(10).filter(isBigDrop).length).toBeGreaterThan(
			lowLevelBigDrops,
		);
	});

	it("a thief killed above the deepest floor reached drops nothing", () => {
		const target = thief(5, 4);
		const climbing = { ...state, floor: 3, deepestFloor: 5, enemies: [target] };
		const next = killOutright(climbing, target);
		expect(next.enemies).toEqual([]);
		expect(next.goldCollected).toBe(climbing.goldCollected);
		expect(next.events.some((event) => event.type === "enemy-gold-drop")).toBe(
			false,
		);
	});

	it("is deterministic for a given rng state", () => {
		const target = thief(5, 4);
		const first = applyPlayerAttack({ ...state, enemies: [target] }, target);
		const second = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(first.goldCollected).toBe(second.goldCollected);
	});

	it("does not drop gold when a kind other than the thief is killed", () => {
		const target = zombie(5, 4, 1);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.goldCollected).toBe(state.goldCollected);
		expect(next.events.some((event) => event.type === "enemy-gold-drop")).toBe(
			false,
		);
	});

	it("does not drop gold on a non-lethal hit", () => {
		const target = orc(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.goldCollected).toBe(state.goldCollected);
	});
});

describe("dragon", () => {
	const state = {
		...buildArenaGameState(9, 9, 1),
		playerLevel: SURE_HIT_LEVEL,
	};

	it("awards more experience than aquator on defeat, purely via the enemyStats.ts lookup", () => {
		const target: Enemy = {
			x: 5,
			y: 4,
			kind: "dragon",
			hp: 1,
			maxHp: 1,
			awake: true,
			speed: "normal" as const,
			held: false,
			carried: [],
			mean: false,
			gazeUsed: false,
			confusedTurnsRemaining: 0,
		};
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.playerExperience).toBe(
			calculateEnemyExperienceReward("dragon", 1),
		);
		expect(calculateEnemyExperienceReward("dragon", 1)).toBeGreaterThan(
			calculateEnemyExperienceReward("aquator", 1),
		);
	});
});
