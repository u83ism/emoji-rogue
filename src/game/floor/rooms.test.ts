import { describe, expect, it } from "vitest";
import type { Room } from "../../map/features.js";
import { createRng, type Rng } from "../../rng.js";
import {
	calculateGoldAmountMax,
	GOLD_AMOUNT_MIN,
	ROOM_ENEMY_CHANCE_PERCENT_WITH_GOLD,
	ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD,
	ROOM_GOLD_CHANCE_PERCENT,
} from "../balance.js";
import type { Position } from "../state.js";
import { drawGoldAmount, drawRoomContents } from "./rooms.js";

// Same scripted-rng idiom as items.test.ts: no seed hunting, every roll
// returns one end of its range.

/** Every roll returns its lower bound: percent rolls land, amounts and dice roll their minimum. */
const createLowestRollRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

/** Every roll returns its upper bound: percent rolls miss. */
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

/** Many rooms in a row, for measuring the rates off a real rng. */
const MANY_ROOMS: readonly Room[] = Array.from({ length: 400 }, (_, index) =>
	buildRoom(index * 10),
);
const buildManyRoomsPool = (): Position[] =>
	MANY_ROOMS.flatMap((room) =>
		[0, 1, 2].flatMap((offsetX) =>
			[0, 1, 2].map((y) => ({ x: room.x1 + offsetX, y })),
		),
	);
const isInRoom = (room: Room, position: Position): boolean =>
	position.x >= room.x1 && position.x <= room.x2;

describe("drawGoldAmount", () => {
	it("ranges from GOLD_AMOUNT_MIN up to a ceiling that grows with the floor", () => {
		expect(drawGoldAmount(createLowestRollRng(), 1)).toBe(GOLD_AMOUNT_MIN);
		expect(drawGoldAmount(createHighestRollRng(), 1)).toBe(
			calculateGoldAmountMax(1),
		);
		expect(calculateGoldAmountMax(1)).toBe(61);
		expect(calculateGoldAmountMax(26)).toBe(311);
	});
});

describe("drawRoomContents", () => {
	it("with every roll landing, puts one gold pile and one sleeping enemy inside each room", () => {
		const { enemies, goldPiles } = drawRoomContents(
			buildPool(),
			createLowestRollRng(),
			1,
			ROOMS,
			true,
			1,
			0,
		);
		expect(enemies.length).toBe(ROOMS.length);
		expect(goldPiles.length).toBe(ROOMS.length);
		expect(enemies.every((enemy) => !enemy.awake)).toBe(true);
		ROOMS.forEach((room, index) => {
			const enemy = enemies[index];
			const pile = goldPiles[index];
			expect(enemy !== undefined && isInRoom(room, enemy)).toBe(true);
			expect(pile !== undefined && isInRoom(room, pile)).toBe(true);
			expect(pile?.amount).toBe(GOLD_AMOUNT_MIN);
		});
	});

	it("removes each spawn tile from the pool, so gold and an enemy never share one", () => {
		const pool = buildPool();
		const before = pool.length;
		const { enemies, goldPiles } = drawRoomContents(
			pool,
			createLowestRollRng(),
			1,
			ROOMS,
			true,
			1,
			0,
		);
		expect(pool.length).toBe(before - enemies.length - goldPiles.length);
		for (const placed of [...enemies, ...goldPiles]) {
			expect(
				pool.some((tile) => tile.x === placed.x && tile.y === placed.y),
			).toBe(false);
		}
	});

	it("with every roll missing, places nothing", () => {
		expect(
			drawRoomContents(
				buildPool(),
				createHighestRollRng(),
				1,
				ROOMS,
				true,
				1,
				0,
			),
		).toEqual({
			enemies: [],
			goldPiles: [],
			nextItemId: 1,
			floorsWithoutFood: 0,
		});
	});

	it("skips a room none of whose tiles are pooled", () => {
		const poolWithoutFirstRoom = buildPool().filter((tile) => tile.x >= 10);
		const { enemies, goldPiles } = drawRoomContents(
			poolWithoutFirstRoom,
			createLowestRollRng(),
			1,
			ROOMS,
			true,
			1,
			0,
		);
		expect(enemies.length).toBe(ROOMS.length - 1);
		expect(goldPiles.length).toBe(ROOMS.length - 1);
		expect(enemies.every((enemy) => enemy.x >= 10)).toBe(true);
		expect(goldPiles.every((pile) => pile.x >= 10)).toBe(true);
	});

	it("places no gold at all when told not to, whatever the rolls", () => {
		const { enemies, goldPiles } = drawRoomContents(
			buildPool(),
			createLowestRollRng(),
			1,
			ROOMS,
			false,
			1,
			0,
		);
		expect(goldPiles).toEqual([]);
		expect(enemies.length).toBe(ROOMS.length);
	});

	it("gold lands in about half the rooms; a room with gold holds an enemy far more often than one without", () => {
		const { enemies, goldPiles } = drawRoomContents(
			buildManyRoomsPool(),
			createRng(3),
			5,
			MANY_ROOMS,
			true,
			1,
			0,
		);
		const roomsWithGold = MANY_ROOMS.filter((room) =>
			goldPiles.some((pile) => isInRoom(room, pile)),
		);
		const roomsWithoutGold = MANY_ROOMS.filter(
			(room) => !roomsWithGold.includes(room),
		);
		const countGuarded = (rooms: readonly Room[]): number =>
			rooms.filter((room) => enemies.some((enemy) => isInRoom(room, enemy)))
				.length;
		const percentOf = (part: number, whole: number): number =>
			(part / whole) * 100;

		const goldPercent = percentOf(roomsWithGold.length, MANY_ROOMS.length);
		expect(Math.abs(goldPercent - ROOM_GOLD_CHANCE_PERCENT)).toBeLessThan(8);
		const guardedPercent = percentOf(
			countGuarded(roomsWithGold),
			roomsWithGold.length,
		);
		expect(
			Math.abs(guardedPercent - ROOM_ENEMY_CHANCE_PERCENT_WITH_GOLD),
		).toBeLessThan(10);
		const unguardedPercent = percentOf(
			countGuarded(roomsWithoutGold),
			roomsWithoutGold.length,
		);
		expect(
			Math.abs(unguardedPercent - ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD),
		).toBeLessThan(10);
	});

	it("without gold every room rolls the lower enemy chance", () => {
		const { enemies } = drawRoomContents(
			buildManyRoomsPool(),
			createRng(3),
			5,
			MANY_ROOMS,
			false,
			1,
			0,
		);
		const percent = (enemies.length / MANY_ROOMS.length) * 100;
		expect(
			Math.abs(percent - ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD),
		).toBeLessThan(8);
	});
});
