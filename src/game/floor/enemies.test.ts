import { describe, expect, it } from "vitest";
import type { Room } from "../../map/features.js";
import { createRng, type Rng } from "../../rng.js";
import {
	ENEMY_DEPTH_ORDER,
	ENEMY_HP_DICE_SIDES,
	ENEMY_STATS,
} from "../enemies/enemyStats.js";
import { ENEMY_KIND_VALUES } from "../events.js";
import type { Position } from "../state.js";
import {
	buildSpawnedEnemy,
	calculateEnemyFloorRange,
	drawEnemyKindForFloor,
	drawFloorEnemies,
} from "./enemies.js";

// Same scripted-rng idiom as items.test.ts: no seed hunting, every roll
// returns one end of its range.

/** Every roll returns its lower bound: percent rolls land, dice roll 1, the kind window draws its weakest entry. */
const createLowestRollRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

/** Every roll returns its upper bound: percent rolls miss, dice roll their maximum, the kind window draws its strongest entry. */
const createHighestRollRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (_lowerBound, upperBound) => upperBound,
});

const buildRoom = (x1: number): Room => ({
	kind: "room",
	x1,
	y1: 0,
	x2: x1 + 2,
	y2: 2,
	doors: {},
});

/** Three 3x3 rooms side by side, and every one of their tiles pooled. */
const ROOMS: readonly Room[] = [buildRoom(0), buildRoom(10), buildRoom(20)];
const buildPool = (): Position[] =>
	ROOMS.flatMap((room) =>
		[0, 1, 2].flatMap((offsetX) =>
			[0, 1, 2].map((y) => ({ x: room.x1 + offsetX, y })),
		),
	);

describe("drawEnemyKindForFloor", () => {
	it("on floor 1 only ever draws one of the five weakest kinds", () => {
		const rng = createRng(1);
		const drawn = new Set(
			Array.from({ length: 300 }, () => drawEnemyKindForFloor(rng, 1)),
		);
		expect([...drawn].sort()).toEqual(
			[...ENEMY_DEPTH_ORDER.slice(0, 5)].sort(),
		);
	});

	it("on the deepest floor only ever draws from the last ten kinds", () => {
		const rng = createRng(1);
		const lastTen = new Set(ENEMY_DEPTH_ORDER.slice(-10));
		for (let draw = 0; draw < 300; draw++) {
			expect(lastTen.has(drawEnemyKindForFloor(rng, 26))).toBe(true);
		}
	});

	it("slides the window one kind deeper per floor", () => {
		/* the lowest roll is floor - 6, the highest floor + 3 */
		expect(drawEnemyKindForFloor(createLowestRollRng(), 10)).toBe(
			ENEMY_DEPTH_ORDER[4],
		);
		expect(drawEnemyKindForFloor(createHighestRollRng(), 10)).toBe(
			ENEMY_DEPTH_ORDER[13],
		);
		expect(drawEnemyKindForFloor(createLowestRollRng(), 11)).toBe(
			ENEMY_DEPTH_ORDER[5],
		);
	});
});

describe("calculateEnemyFloorRange", () => {
	it("agrees with what drawEnemyKindForFloor can actually draw", () => {
		const rng = createRng(1);
		const seenFloors = new Map<string, Set<number>>();
		for (let floor = 1; floor <= 26; floor++) {
			for (let draw = 0; draw < 400; draw++) {
				const kind = drawEnemyKindForFloor(rng, floor);
				seenFloors.set(kind, (seenFloors.get(kind) ?? new Set()).add(floor));
			}
		}
		for (const kind of ENEMY_KIND_VALUES) {
			const floors = [...(seenFloors.get(kind) ?? [])];
			const range = calculateEnemyFloorRange(kind);
			expect(Math.min(...floors)).toBe(range.firstFloor);
			expect(Math.max(...floors)).toBe(Math.min(26, range.lastFloor));
		}
	});

	it("puts the kestrel on floors 1-6 and the dragon on floor 22 and below", () => {
		expect(calculateEnemyFloorRange("kestrel")).toEqual({
			firstFloor: 1,
			lastFloor: 6,
		});
		expect(calculateEnemyFloorRange("dragon").firstFloor).toBe(22);
	});
});

describe("buildSpawnedEnemy", () => {
	it("rolls HP as level d8, asleep and at full health", () => {
		const weakest = buildSpawnedEnemy(
			"troll",
			{ x: 1, y: 2 },
			createLowestRollRng(),
		);
		expect(weakest).toEqual({
			x: 1,
			y: 2,
			kind: "troll",
			hp: ENEMY_STATS.troll.level,
			maxHp: ENEMY_STATS.troll.level,
			awake: false,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		});
		const sturdiest = buildSpawnedEnemy(
			"troll",
			{ x: 1, y: 2 },
			createHighestRollRng(),
		);
		expect(sturdiest.maxHp).toBe(ENEMY_STATS.troll.level * ENEMY_HP_DICE_SIDES);
		expect(sturdiest.hp).toBe(sturdiest.maxHp);
	});
});

describe("drawFloorEnemies", () => {
	it("with every room roll landing, puts one sleeping enemy inside each room", () => {
		const enemies = drawFloorEnemies(
			buildPool(),
			createLowestRollRng(),
			1,
			ROOMS,
		);
		expect(enemies.length).toBe(ROOMS.length);
		expect(enemies.every((enemy) => !enemy.awake)).toBe(true);
		enemies.forEach((enemy, index) => {
			const room = ROOMS[index];
			expect(enemy.x).toBeGreaterThanOrEqual(room?.x1 ?? 0);
			expect(enemy.x).toBeLessThanOrEqual(room?.x2 ?? 0);
		});
	});

	it("removes each spawn tile from the pool", () => {
		const pool = buildPool();
		const before = pool.length;
		const enemies = drawFloorEnemies(pool, createLowestRollRng(), 1, ROOMS);
		expect(pool.length).toBe(before - enemies.length);
		for (const enemy of enemies) {
			expect(
				pool.some((tile) => tile.x === enemy.x && tile.y === enemy.y),
			).toBe(false);
		}
	});

	it("with every room roll missing, spawns nothing", () => {
		expect(
			drawFloorEnemies(buildPool(), createHighestRollRng(), 1, ROOMS),
		).toEqual([]);
	});

	it("skips a room none of whose tiles are pooled", () => {
		const poolWithoutFirstRoom = buildPool().filter((tile) => tile.x >= 10);
		const enemies = drawFloorEnemies(
			poolWithoutFirstRoom,
			createLowestRollRng(),
			1,
			ROOMS,
		);
		expect(enemies.length).toBe(ROOMS.length - 1);
		expect(enemies.every((enemy) => enemy.x >= 10)).toBe(true);
	});
});
