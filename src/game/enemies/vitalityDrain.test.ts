import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../../rng.js";
import {
	resolveVitalityDrain,
	type VitalityDrainerKind,
	type VitalityDrainTarget,
} from "./vitalityDrain.js";

const target = (
	overrides: Partial<VitalityDrainTarget>,
): VitalityDrainTarget => ({
	playerHp: 20,
	playerMaxHp: 30,
	playerLevel: 4,
	playerExperience: 50,
	rng: seedToState(1),
	...overrides,
});

/** The first rng state on seed 1's stream whose drain chance roll lands (or misses, for `wanted` false). */
const findChanceRng = (
	kind: VitalityDrainerKind,
	wanted: boolean,
): RngState => {
	let current = seedToState(1);
	for (let attempt = 0; attempt < 5000; attempt++) {
		const drained =
			resolveVitalityDrain(kind, target({ rng: current })).events.length > 0;
		if (drained === wanted) {
			return current;
		}
		current = stepUniform(current).state;
	}
	throw new Error("no rng state in the first 5000 satisfies the test");
};

describe("resolveVitalityDrain", () => {
	it("a missed chance roll changes nothing but the rng", () => {
		const rng = findChanceRng("vampire", false);
		const result = resolveVitalityDrain("vampire", target({ rng }));
		expect(result.events).toEqual([]);
		expect(result.died).toBe(false);
		expect({ ...result.target, rng }).toEqual(target({ rng }));
	});

	it("a vampire drains 1d3 from both max HP and HP, and never a level", () => {
		const rng = findChanceRng("vampire", true);
		const result = resolveVitalityDrain("vampire", target({ rng }));
		const [event] = result.events;
		if (event?.type !== "player-drained") {
			throw new Error("expected player-drained");
		}
		const lost = event.payload.maxHpLost;
		expect(lost).toBeGreaterThanOrEqual(1);
		expect(lost).toBeLessThanOrEqual(3);
		expect(result.target.playerMaxHp).toBe(30 - lost);
		expect(result.target.playerHp).toBe(20 - lost);
		expect(result.target.playerLevel).toBe(4);
		expect(result.events).toHaveLength(1);
	});

	it("a wraith takes a level, leaving experience one past the lost level's threshold", () => {
		const rng = findChanceRng("wraith", true);
		const result = resolveVitalityDrain("wraith", target({ rng }));
		expect(result.target.playerLevel).toBe(3);
		/* LEVEL_EXPERIENCE_THRESHOLDS[2] = 40 is what reaching level 4 took */
		expect(result.target.playerExperience).toBe(41);
		expect(result.events[0]).toEqual({
			type: "player-level-drained",
			payload: { level: 3 },
		});
		expect(result.events[1]?.type).toBe("player-drained");
	});

	it("a wraith at level 1 keeps level 1 but loses all its experience", () => {
		const rng = findChanceRng("wraith", true);
		const result = resolveVitalityDrain(
			"wraith",
			target({ rng, playerLevel: 1, playerExperience: 5 }),
		);
		expect(result.target.playerLevel).toBe(1);
		expect(result.target.playerExperience).toBe(0);
		expect(result.events.map((event) => event.type)).toEqual([
			"player-drained",
		]);
	});

	it("a wraith kills a player with no experience left", () => {
		const rng = findChanceRng("wraith", true);
		const result = resolveVitalityDrain(
			"wraith",
			target({ rng, playerLevel: 1, playerExperience: 0 }),
		);
		expect(result.died).toBe(true);
	});

	it("HP never drops below 1 from a drain, but max HP reaching 0 kills", () => {
		const rng = findChanceRng("vampire", true);
		const survived = resolveVitalityDrain(
			"vampire",
			target({ rng, playerHp: 1, playerMaxHp: 30 }),
		);
		expect(survived.target.playerHp).toBe(1);
		expect(survived.died).toBe(false);
		const killed = resolveVitalityDrain(
			"vampire",
			target({ rng, playerHp: 1, playerMaxHp: 1 }),
		);
		expect(killed.died).toBe(true);
		expect(killed.target.playerMaxHp).toBe(0);
	});
});
