import { describe, expect, it } from "vitest";
import { seedToState, stepUniform } from "../../rng.js";
import {
	ICE_MONSTER_FREEZE_TURNS_MAX,
	ICE_MONSTER_FREEZE_TURNS_MIN,
	PARALYSIS_DEATH_TURNS,
} from "../balance.js";
import { resolveIceMonsterAttack } from "./iceMonsterFreeze.js";

const SURE_HIT = 100;
const SURE_MISS = 0;

/** 40 different rng states off one seed's stream. */
const buildRngStates = () => {
	const states = [];
	let current = seedToState(1);
	for (let i = 0; i < 40; i++) {
		states.push(current);
		current = stepUniform(current).state;
	}
	return states;
};

describe("resolveIceMonsterAttack", () => {
	it("a hit freezes an unfrozen player for 2-3 turns and says so", () => {
		const seen = new Set<number>();
		for (const rng of buildRngStates()) {
			const result = resolveIceMonsterAttack(0, SURE_HIT, rng);
			const turns = result.paralyzedTurnsRemaining;
			expect(turns).toBeGreaterThanOrEqual(ICE_MONSTER_FREEZE_TURNS_MIN);
			expect(turns).toBeLessThanOrEqual(ICE_MONSTER_FREEZE_TURNS_MAX);
			expect(result.events).toEqual([
				{ type: "player-frozen", payload: { turns } },
			]);
			expect(result.died).toBe(false);
			seen.add(turns);
		}
		expect([...seen].sort()).toEqual([2, 3]);
	});

	it("a hit on a player already frozen adds to the freeze, silently", () => {
		const result = resolveIceMonsterAttack(5, SURE_HIT, seedToState(1));
		expect(result.paralyzedTurnsRemaining).toBeGreaterThanOrEqual(7);
		expect(result.paralyzedTurnsRemaining).toBeLessThanOrEqual(8);
		expect(result.events).toEqual([]);
	});

	it("a miss does nothing and logs nothing", () => {
		const result = resolveIceMonsterAttack(0, SURE_MISS, seedToState(1));
		expect(result.paralyzedTurnsRemaining).toBe(0);
		expect(result.events).toEqual([]);
		expect(result.died).toBe(false);
	});

	it("piling the freeze past the limit freezes the player to death", () => {
		const result = resolveIceMonsterAttack(
			PARALYSIS_DEATH_TURNS - 1,
			SURE_HIT,
			seedToState(1),
		);
		expect(result.died).toBe(true);
		expect(result.events).toEqual([
			{ type: "player-died", payload: { by: "hypothermia" } },
		]);
	});

	it("reaching exactly the limit is still survivable", () => {
		const result = resolveIceMonsterAttack(
			PARALYSIS_DEATH_TURNS - ICE_MONSTER_FREEZE_TURNS_MAX,
			SURE_HIT,
			seedToState(1),
		);
		expect(result.paralyzedTurnsRemaining).toBeLessThanOrEqual(
			PARALYSIS_DEATH_TURNS,
		);
		expect(result.died).toBe(false);
	});
});
