import { describe, expect, it } from "vitest";
import type { Room } from "../../map/features.js";
import { createRng, type Rng } from "../../rng.js";
import {
	calculateEnemyCountForFloor,
	GRIFFIN_MIN_SPAWN_FLOOR,
	MEDUSA_MIN_SPAWN_FLOOR,
	MONSTER_HOUSE_ENEMY_COUNT,
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

const buildRoom = (x1: number, y1: number, x2: number, y2: number): Room => ({
	kind: "room",
	x1,
	y1,
	x2,
	y2,
	doors: {},
});

/** Generic tiles at y=0 plus the full interior of the monster-house candidate room. */
const buildPoolWithRoom = (room: Room): Position[] => {
	const tiles: Position[] = Array.from({ length: 30 }, (_, index) => ({
		x: index,
		y: 0,
	}));
	for (let x = room.x1; x <= room.x2; x++) {
		for (let y = room.y1; y <= room.y2; y++) {
			tiles.push({ x, y });
		}
	}
	return tiles;
};

const isInsideRoom = (position: Position, room: Room): boolean =>
	position.x >= room.x1 &&
	position.x <= room.x2 &&
	position.y >= room.y1 &&
	position.y <= room.y2;

describe("drawFloorEnemies", () => {
	const firstRoom = buildRoom(0, 20, 3, 23);
	const otherRoom = buildRoom(10, 10, 13, 13);
	const rooms = [firstRoom, otherRoom];

	it("with every roll hitting, spawns the scaled zombies/bats, one of each chance kind, and a monster house", () => {
		const enemies = drawFloorEnemies(
			rooms,
			firstRoom,
			buildPoolWithRoom(otherRoom),
			createAlwaysHitRng(),
			VAMPIRE_MIN_SPAWN_FLOOR,
		);
		const asleep = enemies.filter((enemy) => !enemy.awake);
		const awake = enemies.filter((enemy) => enemy.awake);

		/* the regular spawns: scaled zombies/bats plus thief/nymph/aquator */
		expect(asleep.filter((enemy) => enemy.kind === "zombie").length).toBe(
			calculateEnemyCountForFloor("zombie", VAMPIRE_MIN_SPAWN_FLOOR),
		);
		expect(asleep.filter((enemy) => enemy.kind === "bat").length).toBe(
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
			expect(asleep.filter((enemy) => enemy.kind === kind).length).toBe(1);
		}

		/* the monster house: pre-awake zombies/bats, all inside the other room */
		expect(awake.length).toBe(MONSTER_HOUSE_ENEMY_COUNT);
		for (const enemy of awake) {
			expect(isInsideRoom(enemy, otherRoom)).toBe(true);
			expect(enemy.kind === "zombie" || enemy.kind === "bat").toBe(true);
		}
	});

	it("with every roll missing, spawns only the scaled zombies/bats, all asleep", () => {
		const enemies = drawFloorEnemies(
			rooms,
			firstRoom,
			buildPoolWithRoom(otherRoom),
			createAlwaysMissRng(),
			1,
		);
		expect(enemies.length).toBe(
			calculateEnemyCountForFloor("zombie", 1) +
				calculateEnemyCountForFloor("bat", 1),
		);
		expect(enemies.every((enemy) => !enemy.awake)).toBe(true);
	});

	it("scales the zombie/bat counts with depth", () => {
		const enemies = drawFloorEnemies(
			rooms,
			firstRoom,
			buildPoolWithRoom(otherRoom),
			createAlwaysMissRng(),
			7,
		);
		expect(enemies.filter((enemy) => enemy.kind === "zombie").length).toBe(
			calculateEnemyCountForFloor("zombie", 7),
		);
		expect(enemies.filter((enemy) => enemy.kind === "bat").length).toBe(
			calculateEnemyCountForFloor("bat", 7),
		);
	});

	it("never spawns a vampire below VAMPIRE_MIN_SPAWN_FLOOR, even with every roll hitting", () => {
		const enemies = drawFloorEnemies(
			rooms,
			firstRoom,
			buildPoolWithRoom(otherRoom),
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
				rooms,
				firstRoom,
				buildPoolWithRoom(otherRoom),
				createAlwaysHitRng(),
				minFloor - 1,
			);
			expect(enemies.some((enemy) => enemy.kind === kind)).toBe(false);
		}
	});

	it("skips the monster house when the dungeon has no room besides the starting one", () => {
		const enemies = drawFloorEnemies(
			[firstRoom],
			firstRoom,
			buildPoolWithRoom(otherRoom),
			createAlwaysHitRng(),
			1,
		);
		expect(enemies.every((enemy) => !enemy.awake)).toBe(true);
	});
});
