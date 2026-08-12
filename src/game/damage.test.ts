import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import {
	damageDiceMean,
	rollDamage,
	rollDamageDice,
	rollToHit,
} from "./damage.js";

describe("rollDamage", () => {
	it("is deterministic: same rng and mean in, same roll out", () => {
		const rng = seedToState(1);
		expect(rollDamage(rng, 5, 1)).toEqual(rollDamage(rng, 5, 1));
	});

	it("advances the rng state (consumes randomness)", () => {
		const rng = seedToState(1);
		expect(rollDamage(rng, 5, 1).rng).not.toEqual(rng);
	});

	it("never rolls below the given minimum, even with a very negative mean", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const roll = rollDamage(seedToState(seed), -50, 1);
			expect(roll.damage).toBe(1);
		}
	});

	it("rolls vary across seeds instead of always landing on the rounded mean", () => {
		const damages = new Set<number>();
		for (let seed = 1; seed <= 30; seed++) {
			damages.add(rollDamage(seedToState(seed), 5, 1).damage);
		}
		/* a normal distribution around 5 should produce more than one value */
		expect(damages.size).toBeGreaterThan(1);
	});

	it("stays close to the mean instead of swinging across the whole range", () => {
		/* the whole point of using a normal distribution over a uniform one:
		 * rolls cluster tightly instead of being equally likely at any distance */
		for (let seed = 1; seed <= 30; seed++) {
			const roll = rollDamage(seedToState(seed), 5, 1);
			expect(Math.abs(roll.damage - 5)).toBeLessThanOrEqual(3);
		}
	});
});

describe("rollToHit", () => {
	it("is deterministic: same rng and hit chance in, same result out", () => {
		const rng = seedToState(1);
		expect(rollToHit(rng, 50)).toEqual(rollToHit(rng, 50));
	});

	it("advances the rng state (consumes randomness)", () => {
		const rng = seedToState(1);
		expect(rollToHit(rng, 50).rng).not.toEqual(rng);
	});

	it("always hits at 100 percent, across many seeds", () => {
		for (let seed = 1; seed <= 30; seed++) {
			expect(rollToHit(seedToState(seed), 100).hit).toBe(true);
		}
	});

	it("never hits at 0 percent, across many seeds", () => {
		for (let seed = 1; seed <= 30; seed++) {
			expect(rollToHit(seedToState(seed), 0).hit).toBe(false);
		}
	});

	it("produces both hits and misses across seeds at a middling chance", () => {
		/* seedToState's first draw grows ~linearly with small consecutive
		 * seeds (see rng.ts), so a widely-spaced stride is needed to actually
		 * sample across [0, 1) instead of clustering near 0 */
		const results = new Set<boolean>();
		for (let seedIndex = 1; seedIndex <= 30; seedIndex++) {
			results.add(rollToHit(seedToState(seedIndex * 70000), 50).hit);
		}
		expect(results.size).toBe(2);
	});
});

describe("damageDiceMean", () => {
	it("is the average face value of the die, rounded", () => {
		expect(damageDiceMean(4)).toBe(3); /* (4+1)/2 = 2.5, rounds to 3 */
		expect(damageDiceMean(6)).toBe(4); /* (6+1)/2 = 3.5, rounds to 4 */
		expect(damageDiceMean(1)).toBe(1);
	});
});

describe("rollDamageDice", () => {
	it("is deterministic: same rng and dice in, same roll out", () => {
		const rng = seedToState(1);
		expect(rollDamageDice(rng, 1, 4, 0, 1)).toEqual(
			rollDamageDice(rng, 1, 4, 0, 1),
		);
	});

	it("consumes exactly diceCount uniform draws regardless of the rolled values", () => {
		const oneDie = rollDamageDice(seedToState(1), 1, 4, 0, 1);
		const twoDice = rollDamageDice(seedToState(1), 2, 4, 0, 1);
		expect(oneDie.rng).not.toEqual(twoDice.rng);
	});

	it("stays within [1 + bonus, diceSides + bonus] before the minimum floor applies", () => {
		for (let seed = 1; seed <= 50; seed++) {
			const roll = rollDamageDice(seedToState(seed), 1, 4, 10, 1);
			expect(roll.damage).toBeGreaterThanOrEqual(11);
			expect(roll.damage).toBeLessThanOrEqual(14);
		}
	});

	it("never rolls below the given minimum, even with a very negative bonus", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const roll = rollDamageDice(seedToState(seed), 1, 4, -50, 1);
			expect(roll.damage).toBe(1);
		}
	});

	it("rolls vary across seeds instead of always landing on the same value", () => {
		/* widely-spaced stride — see the rollToHit variance test above */
		const damages = new Set<number>();
		for (let seedIndex = 1; seedIndex <= 30; seedIndex++) {
			damages.add(
				rollDamageDice(seedToState(seedIndex * 70000), 1, 4, 0, 1).damage,
			);
		}
		expect(damages.size).toBeGreaterThan(1);
	});
});
