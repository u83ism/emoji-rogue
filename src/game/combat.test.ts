import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../rng.js";
import {
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	MAGIC_MISSILE_WAND_DAMAGE,
	SNEAK_ATTACK_MULTIPLIER,
	THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
	WAND_STRIKE_DAMAGE,
} from "./balance.js";
import {
	applyMagicMissileWandStrike,
	applyPlayerAttack,
	applyWandStrike,
	isAdjacent,
} from "./combat.js";
import { calculateEnemyExperienceReward } from "./enemies/enemyStats.js";
import type { EnemyKind } from "./events.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy, HeldItem } from "./state.js";

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
	slowedTurnsRemaining: 0,
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

const swordWith = (attackBonus: number): HeldItem => ({
	itemId: 1,
	kind: "sword",
	equipped: true,
	cursed: false,
	attackBonus,
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
	it("is true for the four orthogonal neighbors only", () => {
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 1 })).toBe(true);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 2 })).toBe(true);
		/* diagonals and the same tile are out of reach */
		expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(false);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(false);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 4 })).toBe(false);
	});
});

describe("applyPlayerAttack", () => {
	const state = {
		...buildArenaGameState(9, 9, 1),
		playerLevel: SURE_HIT_LEVEL,
	};
	/** The damage of the first enemy-hit / sneak-attack event. */
	const readDamage = (next: typeof state): number => {
		const event = next.events[0];
		return event?.type === "enemy-hit" || event?.type === "sneak-attack"
			? event.payload.damage
			: Number.NaN;
	};

	it("damages the target by the unarmed roll (1d4 + playerPower) and logs the hit", () => {
		const target = zombie(5, 4);
		const bystander = zombie(7, 7);
		const next = applyPlayerAttack(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		const damage = readDamage(next);
		expect(damage).toBeGreaterThanOrEqual(1 + state.playerPower);
		expect(damage).toBeLessThanOrEqual(4 + state.playerPower);
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

	it("an equipped sword rolls its own dice and adds its attackBonus", () => {
		const target = zombie(5, 4, 100);
		const armed = { ...state, inventory: [swordWith(2)], enemies: [target] };
		const next = applyPlayerAttack(armed, target);
		const damage = readDamage(next);
		/* 3d4 + playerPower + 2 */
		expect(damage).toBeGreaterThanOrEqual(3 + state.playerPower + 2);
		expect(damage).toBeLessThanOrEqual(12 + state.playerPower + 2);
		expect(next.enemies).toEqual([zombie(5, 4, 100 - damage)]);
	});

	it("a roll dragged below zero by a cursed sword deals 0, never negative damage", () => {
		const target = zombie(5, 4, 100);
		const cursed = {
			...state,
			playerLevel: 200 /* still lands despite the -50 to hit */,
			inventory: [swordWith(-50)],
			enemies: [target],
		};
		const next = applyPlayerAttack(cursed, target);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage: 0 } },
		]);
		expect(next.enemies).toEqual([target]);
	});

	it("a sneak attack on a sleeping target deals SNEAK_ATTACK_MULTIPLIER times the damage and wakes it", () => {
		const target = zombie(5, 4, 100, false);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		const damage = readDamage(next);
		expect(damage % SNEAK_ATTACK_MULTIPLIER).toBe(0);
		expect(damage).toBeGreaterThanOrEqual(
			(1 + state.playerPower) * SNEAK_ATTACK_MULTIPLIER,
		);
		expect(damage).toBeLessThanOrEqual(
			(4 + state.playerPower) * SNEAK_ATTACK_MULTIPLIER,
		);
		expect(next.enemies).toEqual([zombie(5, 4, 100 - damage, true)]);
		expect(next.events).toEqual([
			{ type: "sneak-attack", payload: { target: "zombie", damage } },
		]);
	});

	it("a sneak attack that kills logs sneak-attack then enemy-defeated", () => {
		const target = zombie(5, 4, 3, false);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.enemies).toEqual([]);
		expect(next.events.map((event) => event.type)).toEqual([
			"sneak-attack",
			"enemy-defeated",
		]);
	});

	it("a follow-up attack on an already-awake target is a normal hit, not another sneak attack", () => {
		const target = zombie(5, 4, 100, true);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.events.map((event) => event.type)).toEqual(["enemy-hit"]);
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

	it("sets hasAttacked — the pacifist conduct is broken by any landed attack", () => {
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.hasAttacked).toBe(true);
	});

	it("a failed to-hit roll deals no damage, logs player-attack-missed, but still sets hasAttacked and consumes rng", () => {
		/* a -100 to hit puts the chance at 0% */
		const missState = { ...state, inventory: [swordWith(-100)] };
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...missState, enemies: [target] }, target);
		expect(next.enemies).toEqual([target]);
		expect(next.events).toEqual([
			{ type: "player-attack-missed", payload: { target: "zombie" } },
		]);
		expect(next.hasAttacked).toBe(true);
		expect(next.rng).not.toEqual(missState.rng);
	});

	it("a sneak attack on a sleeping target never misses, however low the hit chance would otherwise be", () => {
		/* the same 0% chance that misses an awake target still guarantees a sneak attack */
		const missState = { ...state, inventory: [swordWith(-100)] };
		const target = zombie(5, 4, 10, false);
		const next = applyPlayerAttack({ ...missState, enemies: [target] }, target);
		expect(next.events[0]?.type).toBe("sneak-attack");
	});
});

describe("applyWandStrike", () => {
	const state = buildArenaGameState(9, 9, 1);

	it("deals a fixed WAND_STRIKE_DAMAGE regardless of playerAttackDamage and logs wand-struck", () => {
		const target = zombie(5, 4, 10);
		const boosted = { ...state, playerAttackDamage: 99, enemies: [target] };
		const next = applyWandStrike(boosted, target);
		expect(next.enemies).toEqual([zombie(5, 4, 10 - WAND_STRIKE_DAMAGE)]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: WAND_STRIKE_DAMAGE },
			},
		]);
	});

	it("removes a target whose hp reaches zero and logs the defeat", () => {
		const target = zombie(5, 4, WAND_STRIKE_DAMAGE);
		const bystander = zombie(7, 7);
		const next = applyWandStrike(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		expect(next.enemies).toEqual([bystander]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: WAND_STRIKE_DAMAGE },
			},
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
	});

	it("wakes a sleeping target but never applies a sneak-attack multiplier", () => {
		const target = zombie(5, 4, 10, false);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.enemies).toEqual([zombie(5, 4, 10 - WAND_STRIKE_DAMAGE, true)]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: WAND_STRIKE_DAMAGE },
			},
		]);
	});

	it("does not move the player or touch the terrain", () => {
		const target = zombie(5, 4);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.player).toEqual(state.player);
		expect(next.terrain).toBe(state.terrain);
	});

	it("a kill awards experience for the target's kind", () => {
		const target = zombie(5, 4, WAND_STRIKE_DAMAGE);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.playerExperience).toBe(
			calculateEnemyExperienceReward("zombie", TEST_ENEMY_HP),
		);
	});

	it("sets hasAttacked — the pacifist conduct is broken by a wand strike too", () => {
		const target = zombie(5, 4);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.hasAttacked).toBe(true);
	});
});

describe("enemy gold drop", () => {
	const state = {
		...buildArenaGameState(9, 9, 1),
		playerLevel: SURE_HIT_LEVEL,
	};

	it("drops a bonus between GOLD_AMOUNT_MIN and GOLD_AMOUNT_MAX into goldCollected on a melee kill", () => {
		const target = orc(5, 4, 1);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		const dropped = next.goldCollected - state.goldCollected;
		expect(dropped).toBeGreaterThanOrEqual(GOLD_AMOUNT_MIN);
		expect(dropped).toBeLessThanOrEqual(GOLD_AMOUNT_MAX);
		expect(next.events).toContainEqual({
			type: "enemy-gold-drop",
			payload: { by: "orc", amount: dropped },
		});
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
				/* a wand strike never misses, so every seed is a kill */
				const next = applyMagicMissileWandStrike(seeded, target);
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

	it("also drops gold on a wand kill", () => {
		const target = orc(5, 4, WAND_STRIKE_DAMAGE);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.goldCollected).toBeGreaterThan(state.goldCollected);
		expect(next.events.some((event) => event.type === "enemy-gold-drop")).toBe(
			true,
		);
	});

	it("is deterministic for a given rng state", () => {
		const target = orc(5, 4, 1);
		const first = applyPlayerAttack({ ...state, enemies: [target] }, target);
		const second = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(first.goldCollected).toBe(second.goldCollected);
	});

	it("does not drop gold when a kind other than orc/thief is killed", () => {
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

describe("applyMagicMissileWandStrike", () => {
	const state = buildArenaGameState(9, 9, 1);

	it("deals a fixed MAGIC_MISSILE_WAND_DAMAGE, higher than WAND_STRIKE_DAMAGE, and logs wand-struck", () => {
		expect(MAGIC_MISSILE_WAND_DAMAGE).toBeGreaterThan(WAND_STRIKE_DAMAGE);
		const target = zombie(5, 4, 10);
		const next = applyMagicMissileWandStrike(
			{ ...state, enemies: [target] },
			target,
		);
		expect(next.enemies).toEqual([
			zombie(5, 4, 10 - MAGIC_MISSILE_WAND_DAMAGE),
		]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: MAGIC_MISSILE_WAND_DAMAGE },
			},
		]);
	});

	it("removes a target whose hp reaches zero and logs the defeat", () => {
		const target = zombie(5, 4, MAGIC_MISSILE_WAND_DAMAGE);
		const next = applyMagicMissileWandStrike(
			{ ...state, enemies: [target] },
			target,
		);
		expect(next.enemies).toEqual([]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: MAGIC_MISSILE_WAND_DAMAGE },
			},
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
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
			slowedTurnsRemaining: 0,
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
