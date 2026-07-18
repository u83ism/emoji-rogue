import * as Color from "./color.js";
import type { Fov } from "./fov/fov.js";
import { at as tupleAt } from "./indexing.js";
import { decodePointKey, encodePointKey } from "./pointkey.js";

type LightColor = [number, number, number];

/** Callback to retrieve cell reflectivity (0..1) */
type ReflectivityCallback = (x: number, y: number) => number;

/** Will be called for every lit cell */
type LightingCallback = (x: number, y: number, color: LightColor) => void;

type LightingMap = Record<string, LightColor>;
type NumberMap = Record<string, number>;

export interface LightingOptions {
	/** Number of passes. 1 equals to simple FOV of all light sources, >1 means a *highly simplified* radiosity-like algorithm. Default = 1 */
	passes: number;
	/** Cells with emissivity > threshold will be treated as light source in the next pass. Default = 100 */
	emissionThreshold: number;
	/** Max light range, default = 10 */
	range: number;
}

export interface Lighting {
	/** Adjust options at runtime. */
	setOptions(options: Partial<LightingOptions>): Lighting;
	/** Set the used Field-Of-View algorithm. */
	setFOV(fov: Fov): Lighting;
	/** Set (or remove) a light source. */
	setLight(x: number, y: number, color: null | string | LightColor): Lighting;
	/** Remove all light sources. */
	clearLights(): void;
	/** Reset the pre-computed topology values. Call whenever the underlying map changes its light-passability. */
	reset(): Lighting;
	/** Compute the lighting. */
	compute(lightingCallback: LightingCallback): Lighting;
}

const at = <T>(map: Record<string, T>, key: string): T => {
	const value = map[key];
	if (value === undefined) {
		throw new Error(`lighting: missing expected key "${key}"`);
	}
	return value;
};

/**
 * Lighting computation, based on a traditional FOV for multiple light sources and multiple passes.
 */
export const createLighting = (
	reflectivityCallback: ReflectivityCallback,
	options: Partial<LightingOptions> = {},
): Lighting => {
	const resolvedOptions: LightingOptions = {
		passes: 1,
		emissionThreshold: 100,
		range: 10,
		...options,
	};

	let fov: Fov | undefined;
	let lights: LightingMap = {};
	let reflectivityCache: NumberMap = {};
	let fovCache: Record<string, NumberMap> = {};

	const resetCaches = (): void => {
		reflectivityCache = {};
		fovCache = {};
	};

	const updateFOV = (x: number, y: number): NumberMap => {
		const key1 = encodePointKey(x, y);
		const cache: NumberMap = {};
		fovCache[key1] = cache;
		const range = resolvedOptions.range;
		if (!fov) {
			throw new Error("Lighting: setFOV() must be called before compute()");
		}
		fov(x, y, range, (cx, cy, r, vis) => {
			const key2 = encodePointKey(cx, cy);
			const formFactor = vis * (1 - r / range);
			if (formFactor === 0) return;
			cache[key2] = formFactor;
		});

		return cache;
	};

	/** Compute one iteration from one cell. */
	const emitLightFromCell = (
		x: number,
		y: number,
		color: LightColor,
		litCells: LightingMap,
	): void => {
		const key = encodePointKey(x, y);
		const fovResult = key in fovCache ? at(fovCache, key) : updateFOV(x, y);

		for (const fovKey of Object.keys(fovResult)) {
			const formFactor = at(fovResult, fovKey);

			let result: LightColor;
			if (fovKey in litCells) {
				/* already lit */
				result = at(litCells, fovKey);
			} else {
				/* newly lit */
				result = [0, 0, 0];
				litCells[fovKey] = result;
			}

			for (let i = 0; i < 3; i++) {
				result[i] =
					tupleAt(result, i) + Math.round(tupleAt(color, i) * formFactor);
			} /* add light color */
		}
	};

	/** Compute one iteration from all emitting cells. */
	const emitLight = (
		emittingCells: LightingMap,
		litCells: LightingMap,
		doneCells: NumberMap,
	): void => {
		for (const key of Object.keys(emittingCells)) {
			const [x, y] = decodePointKey(key);
			emitLightFromCell(x, y, at(emittingCells, key), litCells);
			doneCells[key] = 1;
		}
	};

	/** Prepare a list of emitters for the next pass. */
	const computeEmitters = (
		litCells: LightingMap,
		doneCells: NumberMap,
	): LightingMap => {
		const result: LightingMap = {};

		for (const key of Object.keys(litCells)) {
			if (key in doneCells) continue; /* already emitted */

			const color = at(litCells, key);

			let reflectivity: number;
			if (key in reflectivityCache) {
				reflectivity = at(reflectivityCache, key);
			} else {
				const [x, y] = decodePointKey(key);
				reflectivity = reflectivityCallback(x, y);
				reflectivityCache[key] = reflectivity;
			}

			if (reflectivity === 0) continue; /* will not reflect at all */

			/* compute emission color */
			const emission: LightColor = [0, 0, 0];
			let intensity = 0;
			for (let i = 0; i < 3; i++) {
				const part = Math.round(tupleAt(color, i) * reflectivity);
				emission[i] = part;
				intensity += part;
			}
			if (intensity > resolvedOptions.emissionThreshold) {
				result[key] = emission;
			}
		}

		return result;
	};

	const lighting: Lighting = {
		setOptions(newOptions: Partial<LightingOptions>): Lighting {
			Object.assign(resolvedOptions, newOptions);
			if (newOptions.range) resetCaches();
			return lighting;
		},

		setFOV(newFov: Fov): Lighting {
			fov = newFov;
			fovCache = {};
			return lighting;
		},

		setLight(
			x: number,
			y: number,
			color: null | string | LightColor,
		): Lighting {
			const key = encodePointKey(x, y);
			if (color) {
				lights[key] =
					typeof color === "string"
						? (Color.fromString(color) as LightColor)
						: color;
			} else {
				delete lights[key];
			}
			return lighting;
		},

		clearLights(): void {
			lights = {};
		},

		reset(): Lighting {
			resetCaches();
			return lighting;
		},

		compute(lightingCallback: LightingCallback): Lighting {
			const doneCells: NumberMap = {};
			let emittingCells: LightingMap = {};
			const litCells: LightingMap = {};

			for (const key of Object.keys(lights)) {
				/* prepare emitters for the first pass */
				const light = at(lights, key);
				const emitted: LightColor = [0, 0, 0];
				Color.add_(emitted, light);
				emittingCells[key] = emitted;
			}

			for (let i = 0; i < resolvedOptions.passes; i++) {
				/* main loop */
				emitLight(emittingCells, litCells, doneCells);
				if (i + 1 === resolvedOptions.passes)
					continue; /* not for the last pass */
				emittingCells = computeEmitters(litCells, doneCells);
			}

			for (const litKey of Object.keys(litCells)) {
				/* let the user know what and how is lit */
				const [x, y] = decodePointKey(litKey);
				lightingCallback(x, y, at(litCells, litKey));
			}

			return lighting;
		},
	};
	return lighting;
};
