import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import { rollDamage } from "./damage.js";

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
