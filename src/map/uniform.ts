import { at as pointAt } from "../indexing.js";
import type { Result } from "../result.js";
import { err, ok } from "../result.js";
import type { Rng } from "../rng.js";
import type { DungeonMap } from "./dungeon.js";
import {
	addDoor,
	type Corridor,
	clearDoors,
	createCorridor,
	createRandomRoom,
	digCorridor,
	digRoom,
	getRoomBottom,
	getRoomCenter,
	getRoomLeft,
	getRoomRight,
	getRoomTop,
	type Room,
	roomIsValid,
} from "./features.js";
import type { CreateCallback } from "./map.js";
import { fillMap } from "./map.js";

export interface UniformOptions {
	/** room minimum and maximum width */
	roomWidth: [number, number];
	/** room minimum and maximum height */
	roomHeight: [number, number];
	/** we stop after this percentage of level area has been dug out by rooms */
	roomDugPercentage: number;
	/** we stop after this much time has passed (msec) */
	timeLimit: number;
}

type Point = [number, number];

/** The time limit was hit before a valid, fully-connected layout was found. */
export type GenerationTimedOut = "generation-timed-out";

export interface UniformMap extends DungeonMap {
	create(callback?: CreateCallback): Result<UniformMap, GenerationTimedOut>;
}

const ROOM_ATTEMPTS = 20; /* a new room is tried this many times before being considered impossible */
const CORRIDOR_ATTEMPTS = 20; /* corridors are tried this many times before the level is considered unconnectable */

/**
 * Dungeon generator which tries to fill the space evenly. Generates
 * independent rooms and tries to connect them.
 */
export function createUniformMap(
	width: number,
	height: number,
	rng: Rng,
	options: Partial<UniformOptions> = {},
): UniformMap {
	const resolvedOptions: UniformOptions = {
		roomWidth: [3, 9],
		roomHeight: [3, 5],
		roomDugPercentage: 0.1,
		timeLimit: 1000,
		...options,
	};

	let map: number[][] = [];
	let dug = 0;
	let rooms: Room[] = [];
	let corridors: Corridor[] = [];
	let connected: Room[] = [];
	let unconnected: Room[] = [];

	function at(x: number, y: number): number {
		const column = map[x];
		if (column === undefined) throw new Error("uniform map: x out of range");
		const value = column[y];
		if (value === undefined) throw new Error("uniform map: y out of range");
		return value;
	}

	function set(x: number, y: number, value: number): void {
		const column = map[x];
		if (column === undefined) throw new Error("uniform map: x out of range");
		column[y] = value;
	}

	function digCallback(x: number, y: number, value: number): void {
		set(x, y, value);
		if (value === 0) dug++;
	}

	function isWallCallback(x: number, y: number): boolean {
		if (x < 0 || y < 0 || x >= width || y >= height) return false;
		return at(x, y) === 1;
	}

	function canBeDugCallback(x: number, y: number): boolean {
		if (x < 1 || y < 1 || x + 1 >= width || y + 1 >= height) return false;
		return at(x, y) === 1;
	}

	function generateRoom(): Room | null {
		for (let attempt = 0; attempt < ROOM_ATTEMPTS; attempt++) {
			const room = createRandomRoom(rng, width, height, resolvedOptions);
			if (!roomIsValid(room, isWallCallback, canBeDugCallback)) continue;

			digRoom(room, digCallback);
			rooms.push(room);
			return room;
		}
		return null; /* no room was generated in the given number of attempts */
	}

	function generateRooms(): void {
		const w = width - 2;
		const h = height - 2;

		let room: Room | null;
		do {
			room = generateRoom();
			if (dug / (w * h) > resolvedOptions.roomDugPercentage)
				break; /* achieved requested amount of free space */
		} while (room);
	}

	function closestRoom(candidates: readonly Room[], room: Room): Room | null {
		let dist = Number.POSITIVE_INFINITY;
		const center = getRoomCenter(room);
		let result: Room | null = null;

		for (const candidate of candidates) {
			const c = getRoomCenter(candidate);
			const dx = c[0] - center[0];
			const dy = c[1] - center[1];
			const d = dx * dx + dy * dy;
			if (d < dist) {
				dist = d;
				result = candidate;
			}
		}

		return result;
	}

	function digLine(points: readonly Point[]): void {
		for (let i = 1; i < points.length; i++) {
			const start = points[i - 1];
			const end = points[i];
			if (start === undefined || end === undefined)
				throw new Error("unreachable: i within points.length");
			const corridor = createCorridor(start[0], start[1], end[0], end[1]);
			digCorridor(corridor, digCallback);
			corridors.push(corridor);
		}
	}

	function placeInWall(room: Room, dirIndex: number): Point | null {
		let start: Point = [0, 0];
		let dir: Point = [0, 0];
		let length = 0;

		switch (dirIndex) {
			case 0:
				dir = [1, 0];
				start = [getRoomLeft(room), getRoomTop(room) - 1];
				length = getRoomRight(room) - getRoomLeft(room) + 1;
				break;
			case 1:
				dir = [0, 1];
				start = [getRoomRight(room) + 1, getRoomTop(room)];
				length = getRoomBottom(room) - getRoomTop(room) + 1;
				break;
			case 2:
				dir = [1, 0];
				start = [getRoomLeft(room), getRoomBottom(room) + 1];
				length = getRoomRight(room) - getRoomLeft(room) + 1;
				break;
			case 3:
				dir = [0, 1];
				start = [getRoomLeft(room) - 1, getRoomTop(room)];
				length = getRoomBottom(room) - getRoomTop(room) + 1;
				break;
		}

		const avail: (Point | null)[] = [];
		let lastBadIndex = -2;

		for (let i = 0; i < length; i++) {
			const x = start[0] + i * dir[0];
			const y = start[1] + i * dir[1];
			avail.push(null);

			const isWall = at(x, y) === 1;
			if (isWall) {
				if (lastBadIndex !== i - 1) {
					avail[i] = [x, y];
				}
			} else {
				lastBadIndex = i;
				if (i) avail[i - 1] = null;
			}
		}

		const validSpots = avail.filter((spot): spot is Point => spot !== null);
		return validSpots.length ? rng.getItem(validSpots) : null;
	}

	function connectRooms(room1: Room, room2: Room): boolean {
		const center1 = getRoomCenter(room1);
		const center2 = getRoomCenter(room2);

		const diffX = center2[0] - center1[0];
		const diffY = center2[1] - center1[1];

		let dirIndex1: number;
		let dirIndex2: number;
		let min: number;
		let max: number;
		let index: number;
		if (Math.abs(diffX) < Math.abs(diffY)) {
			/* first try connecting north-south walls */
			dirIndex1 = diffY > 0 ? 2 : 0;
			dirIndex2 = (dirIndex1 + 2) % 4;
			min = getRoomLeft(room2);
			max = getRoomRight(room2);
			index = 0;
		} else {
			/* first try connecting east-west walls */
			dirIndex1 = diffX > 0 ? 1 : 3;
			dirIndex2 = (dirIndex1 + 2) % 4;
			min = getRoomTop(room2);
			max = getRoomBottom(room2);
			index = 1;
		}

		const start = placeInWall(room1, dirIndex1); /* corridor will start here */
		if (!start) return false;

		let end: Point | null;
		if (pointAt(start, index) >= min && pointAt(start, index) <= max) {
			/* possible to connect with a straight line (I-like) */
			end = start.slice() as Point;
			let value = 0;
			switch (dirIndex2) {
				case 0:
					value = getRoomTop(room2) - 1;
					break;
				case 1:
					value = getRoomRight(room2) + 1;
					break;
				case 2:
					value = getRoomBottom(room2) + 1;
					break;
				case 3:
					value = getRoomLeft(room2) - 1;
					break;
			}
			end[(index + 1) % 2] = value;
			digLine([start, end]);
		} else if (
			pointAt(start, index) < min - 1 ||
			pointAt(start, index) > max + 1
		) {
			/* need to switch target wall (L-like) */
			const diff = pointAt(start, index) - pointAt(center2, index);
			let rotation = 0;
			switch (dirIndex2) {
				case 0:
				case 1:
					rotation = diff < 0 ? 3 : 1;
					break;
				case 2:
				case 3:
					rotation = diff < 0 ? 1 : 3;
					break;
			}
			dirIndex2 = (dirIndex2 + rotation) % 4;

			end = placeInWall(room2, dirIndex2);
			if (!end) return false;

			const mid: Point = [0, 0];
			mid[index] = pointAt(start, index);
			const index2 = (index + 1) % 2;
			mid[index2] = pointAt(end, index2);
			digLine([start, mid, end]);
		} else {
			/* use current wall pair, but adjust the line in the middle (S-like) */
			const index2 = (index + 1) % 2;
			end = placeInWall(room2, dirIndex2);
			if (!end) return false;
			const mid = Math.round(
				(pointAt(end, index2) + pointAt(start, index2)) / 2,
			);

			const mid1: Point = [0, 0];
			const mid2: Point = [0, 0];
			mid1[index] = pointAt(start, index);
			mid1[index2] = mid;
			mid2[index] = pointAt(end, index);
			mid2[index2] = mid;
			digLine([start, mid1, mid2, end]);
		}

		addDoor(room1, start[0], start[1]);
		addDoor(room2, end[0], end[1]);

		let unconnectedIndex = unconnected.indexOf(room1);
		if (unconnectedIndex !== -1) {
			unconnected.splice(unconnectedIndex, 1);
			connected.push(room1);
		}

		unconnectedIndex = unconnected.indexOf(room2);
		if (unconnectedIndex !== -1) {
			unconnected.splice(unconnectedIndex, 1);
			connected.push(room2);
		}

		return true;
	}

	function generateCorridors(): boolean {
		for (let attempt = 0; attempt < CORRIDOR_ATTEMPTS; attempt++) {
			corridors = [];

			/* dig rooms into a clear map */
			map = fillMap(width, height, 1);
			for (const room of rooms) {
				clearDoors(room);
				digRoom(room, digCallback);
			}

			unconnected = rng.shuffle(rooms.slice());
			connected = [];
			const first = unconnected.pop();
			if (first !== undefined)
				connected.push(first); /* first one is always connected */

			for (;;) {
				/* 1. pick a random connected room */
				const from = rng.getItem(connected);
				if (!from) break;

				/* 2. find the closest unconnected room */
				const room1 = closestRoom(unconnected, from);
				if (!room1) break;

				/* 3. connect it to the closest connected room */
				const room2 = closestRoom(connected, room1);
				if (!room2) break;

				const ok = connectRooms(room1, room2);
				if (!ok) break; /* stop connecting, re-shuffle */

				if (!unconnected.length) return true; /* done; no rooms remain */
			}
		}
		return false;
	}

	const uniformMap: UniformMap = {
		getRooms: () => rooms,
		getCorridors: () => corridors,
		create(callback?: CreateCallback): Result<UniformMap, GenerationTimedOut> {
			const t1 = Date.now();
			for (;;) {
				if (Date.now() - t1 > resolvedOptions.timeLimit) {
					return err("generation-timed-out");
				}

				map = fillMap(width, height, 1);
				dug = 0;
				rooms = [];
				unconnected = [];
				generateRooms();
				if (rooms.length < 2) continue;
				if (generateCorridors()) break;
			}

			if (callback) {
				for (let i = 0; i < width; i++) {
					for (let j = 0; j < height; j++) {
						callback(i, j, at(i, j));
					}
				}
			}

			return ok(uniformMap);
		},
	};
	return uniformMap;
}
