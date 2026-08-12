import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../../rng.js";
import {
	calculateEnemyCountForFloor,
	GRIFFIN_MIN_SPAWN_FLOOR,
	MEDUSA_MIN_SPAWN_FLOOR,
	PHANTOM_MIN_SPAWN_FLOOR,
	TROLL_MIN_SPAWN_FLOOR,
	VAMPIRE_MIN_SPAWN_FLOOR,
	WRAITH_MIN_SPAWN_FLOOR,
} from "../balance.js";
import type { Position } from "../state.js";
import { drawFloorEnemies } from "./enemies.js";

// Same scripted-rng idiom as floorItems.test.ts: no seed hunting, every
// percent roll either always hits or always misses.

/** Every roll lands: getUniformInt returns its lower bound (0 < any chance). */
const createAlwaysHitRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

/** Every roll misses: getUniformInt returns its upper bound (99 < no chance). */
const createAlwaysMissRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (_lowerBound, upperBound) => upperBound,
});

/** Plenty of tiles: enough for the scaled zombie/bat counts plus every chance-rolled kind. */
const buildPool = (): Position[] =>
	Array.from({ length: 60 }, (_, index) => ({ x: index, y: 0 }));

describe("drawFloorEnemies", () => {
	it("with every roll hitting, spawns the scaled zombies/bats and one of each chance kind, all asleep", () => {
		const enemies = drawFloorEnemies(
			buildPool(),
			createAlwaysHitRng(),
			VAMPIRE_MIN_SPAWN_FLOOR,
		);

		expect(enemies.every((enemy) => !enemy.awake)).toBe(true);

		/* the regular spawns: scaled zombies/bats plus thief/nymph/aquator */
		expect(enemies.filter((enemy) => enemy.kind === "zombie").length).toBe(
			calculateEnemyCountForFloor("zombie", VAMPIRE_MIN_SPAWN_FLOOR),
		);
		expect(enemies.filter((enemy) => enemy.kind === "bat").length).toBe(
			calculateEnemyCountForFloor("bat", VAMPIRE_MIN_SPAWN_FLOOR),
		);
		for (const kind of [
			"thief",
			"nymph",
			"aquator",
			"orc",
			"dragon",
			"yeti",
			"snake",
			"vampire",
			"rat",
			"emu",
			"kestrel",
			"hobgoblin",
			"centaur",
			"quagga",
			"ur-vile",
			"jabberwock",
			"griffin",
			"troll",
			"icky-thing",
			"venus-flytrap",
			"medusa",
			"phantom",
			"wraith",
			"xeroc",
		] as const) {
			expect(enemies.filter((enemy) => enemy.kind === kind).length).toBe(1);
		}
	});

	it("with every roll missing, spawns only the scaled zombies/bats, all asleep", () => {
		const enemies = drawFloorEnemies(buildPool(), createAlwaysMissRng(), 1);
		expect(enemies.length).toBe(
			calculateEnemyCountForFloor("zombie", 1) +
				calculateEnemyCountForFloor("bat", 1),
		);
		expect(enemies.every((enemy) => !enemy.awake)).toBe(true);
	});

	it("scales the zombie/bat counts with depth", () => {
		const enemies = drawFloorEnemies(buildPool(), createAlwaysMissRng(), 7);
		expect(enemies.filter((enemy) => enemy.kind === "zombie").length).toBe(
			calculateEnemyCountForFloor("zombie", 7),
		);
		expect(enemies.filter((enemy) => enemy.kind === "bat").length).toBe(
			calculateEnemyCountForFloor("bat", 7),
		);
	});

	it("never spawns a vampire below VAMPIRE_MIN_SPAWN_FLOOR, even with every roll hitting", () => {
		const enemies = drawFloorEnemies(
			buildPool(),
			createAlwaysHitRng(),
			VAMPIRE_MIN_SPAWN_FLOOR - 1,
		);
		expect(enemies.some((enemy) => enemy.kind === "vampire")).toBe(false);
	});

	it("never spawns griffin/troll/medusa/phantom/wraith below their own min spawn floor, even with every roll hitting", () => {
		for (const [kind, minFloor] of [
			["griffin", GRIFFIN_MIN_SPAWN_FLOOR],
			["troll", TROLL_MIN_SPAWN_FLOOR],
			["medusa", MEDUSA_MIN_SPAWN_FLOOR],
			["phantom", PHANTOM_MIN_SPAWN_FLOOR],
			["wraith", WRAITH_MIN_SPAWN_FLOOR],
		] as const) {
			const enemies = drawFloorEnemies(
				buildPool(),
				createAlwaysHitRng(),
				minFloor - 1,
			);
			expect(enemies.some((enemy) => enemy.kind === kind)).toBe(false);
		}
	});
});
