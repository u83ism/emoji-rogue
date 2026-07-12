/**
 * This code is an implementation of the Alea algorithm; (C) 2010 Johannes Baagøe.
 * Alea is licensed according to the http://en.wikipedia.org/wiki/MIT_License.
 */

const FRAC = 2.3283064365386963e-10; /* 2^-32 */

/** The mutable part of an RNG's state that getState()/setState() round-trip. */
export interface RngState {
	readonly s0: number;
	readonly s1: number;
	readonly s2: number;
	readonly c: number;
}

export interface UniformStep {
	readonly value: number;
	readonly state: RngState;
}

/**
 * Derive the initial RNG state from a seed. Pure: same seed always produces
 * the same state.
 */
export function seedToState(seed: number): RngState {
	const normalizedSeed = seed < 1 ? 1 / seed : seed;
	const s0 = (normalizedSeed >>> 0) * FRAC;
	const step1 = (normalizedSeed * 69069 + 1) >>> 0;
	const s1 = step1 * FRAC;
	const step2 = (step1 * 69069 + 1) >>> 0;
	const s2 = step2 * FRAC;
	return { s0, s1, s2, c: 1 };
}

/**
 * Advance the RNG by one step. Pure: returns the next pseudorandom value
 * [0,1) together with the next state, rather than mutating anything.
 */
export function stepUniform(state: RngState): UniformStep {
	const t = 2091639 * state.s0 + state.c * FRAC;
	const c = t | 0;
	const value = t - c;
	return { value, state: { s0: state.s1, s1: state.s2, s2: value, c } };
}

export interface Rng {
	getSeed(): number;
	setSeed(seed: number): Rng;
	/** Pseudorandom value [0,1), uniformly distributed. */
	getUniform(): number;
	/** Pseudorandom value [lowerBound, upperBound], inclusive. */
	getUniformInt(lowerBound: number, upperBound: number): number;
	/** A normally distributed pseudorandom value. ~95% of absolute values are below 2*stddev. */
	getNormal(mean?: number, stddev?: number): number;
	/** Pseudorandom value [1,100] inclusive, uniformly distributed. */
	getPercentage(): number;
	/** Randomly picked item, null when the array is empty. */
	getItem<T>(array: readonly T[]): T | null;
	/** A new array with the same items in randomized order. */
	shuffle<T>(array: readonly T[]): T[];
	/** Picks a key at random, weighted by its (relative) value. */
	getWeightedValue<K extends string>(data: Record<K, number>): K;
	getState(): RngState;
	setState(state: RngState): Rng;
	clone(): Rng;
}

/**
 * Creates an independent RNG stream, seeded explicitly by the caller (or by
 * the current time if omitted). Unlike rot.js's original `RNG` singleton,
 * this is a value you create and thread through explicitly — nothing is
 * shared unless you pass the same instance around.
 */
export function createRng(seed: number = Date.now()): Rng {
	let seedValue = seed < 1 ? 1 / seed : seed;
	let state = seedToState(seed);

	function getUniform(): number {
		const step = stepUniform(state);
		state = step.state;
		return step.value;
	}

	function getUniformInt(lowerBound: number, upperBound: number): number {
		const max = Math.max(lowerBound, upperBound);
		const min = Math.min(lowerBound, upperBound);
		return Math.floor(getUniform() * (max - min + 1)) + min;
	}

	function getNormal(mean = 0, stddev = 1): number {
		let u: number;
		let v: number;
		let r: number;
		do {
			u = 2 * getUniform() - 1;
			v = 2 * getUniform() - 1;
			r = u * u + v * v;
		} while (r > 1 || r === 0);
		const gauss = u * Math.sqrt((-2 * Math.log(r)) / r);
		return mean + gauss * stddev;
	}

	function getPercentage(): number {
		return 1 + Math.floor(getUniform() * 100);
	}

	function getItem<T>(array: readonly T[]): T | null {
		if (!array.length) {
			return null;
		}
		const index = Math.floor(getUniform() * array.length);
		const value = array[index];
		if (value === undefined) {
			throw new Error("getItem: computed index out of range");
		}
		return value;
	}

	function shuffle<T>(array: readonly T[]): T[] {
		const result: T[] = [];
		const remaining = array.slice();
		while (remaining.length) {
			const picked = getItem(remaining);
			if (picked === null) {
				throw new Error("unreachable: remaining is non-empty");
			}
			const index = remaining.indexOf(picked);
			result.push(...remaining.splice(index, 1));
		}
		return result;
	}

	function getWeightedValue<K extends string>(data: Record<K, number>): K {
		const keys = Object.keys(data) as K[];
		if (keys.length === 0) {
			throw new Error("getWeightedValue: data must have at least one entry");
		}

		let total = 0;
		for (const key of keys) {
			total += data[key];
		}
		const random = getUniform() * total;

		let part = 0;
		for (const key of keys) {
			part += data[key];
			if (random < part) {
				return key;
			}
		}

		// If by some floating-point annoyance we have random >= total, just return the last key.
		const lastKey = keys[keys.length - 1];
		if (lastKey === undefined) {
			throw new Error("unreachable: keys is non-empty");
		}
		return lastKey;
	}

	const rng: Rng = {
		getSeed: () => seedValue,
		setSeed: (newSeed: number) => {
			seedValue = newSeed < 1 ? 1 / newSeed : newSeed;
			state = seedToState(newSeed);
			return rng;
		},
		getUniform,
		getUniformInt,
		getNormal,
		getPercentage,
		getItem,
		shuffle,
		getWeightedValue,
		getState: () => state,
		setState: (newState: RngState) => {
			state = newState;
			return rng;
		},
		clone: () => createRng().setState(state),
	};
	return rng;
}

/**
 * Transitional compatibility shim: a pre-created default instance, so
 * not-yet-migrated consumers (`map/`, `stringgenerator.ts`, `color.ts`) can
 * keep doing `import RNG from "../rng.js"; RNG.getUniform()` unchanged until
 * their own modernization stage threads an explicit `rng` argument through
 * instead. Remove this default export once every consumer has migrated
 * (tracked in docs/tasks.md).
 */
export default createRng(Date.now());
