import { DIRS } from "../constants.js";
import { toXy } from "../indexing.js";
import { decodePointKey, encodePointKey } from "../pointkey.js";
import type { Rng } from "../rng.js";
import type { DungeonMap } from "./dungeon.js";
import {
	addDoors,
	type Corridor,
	type CreateFeatureAt,
	clearDoors,
	corridorIsValid,
	createCorridorAt,
	createCorridorPriorityWalls,
	createRoomAt,
	createRoomAtCenter,
	digCorridor,
	digRoom,
	type Feature,
	type FeatureOptions,
	type Room,
	roomIsValid,
} from "./features.js";
import type { CreateCallback } from "./map.js";
import { fillMap } from "./map.js";

type FeatureType = "room" | "corridor";

const FEATURES: Record<FeatureType, CreateFeatureAt> = {
	room: createRoomAt,
	corridor: createCorridorAt,
};

export interface DiggerOptions extends FeatureOptions {
	/** we stop after this percentage of level area has been dug out */
	dugPercentage: number;
	/** we stop after this much time has passed (msec) */
	timeLimit: number;
}

export interface DiggerMap extends DungeonMap {
	create(callback?: CreateCallback): DiggerMap;
}

const FEATURE_ATTEMPTS = 20; /* how many times to try creating a feature on a suitable wall */

/**
 * Random dungeon generator using human-like digging patterns.
 * Heavily based on Mike Anderson's ideas from the "Tyrant" algorithm, mentioned at
 * http://www.roguebasin.roguelikedevelopment.org/index.php?title=Dungeon-Building_Algorithm.
 */
export function createDiggerMap(
	width: number,
	height: number,
	rng: Rng,
	options: Partial<DiggerOptions> = {},
): DiggerMap {
	const resolvedOptions: DiggerOptions = {
		roomWidth: [3, 9],
		roomHeight: [3, 5],
		corridorLength: [3, 10],
		dugPercentage: 0.2,
		timeLimit: 1000,
		...options,
	};

	const featureWeights: Record<FeatureType, number> = { room: 4, corridor: 4 };
	const dirs4 = DIRS[4].map(toXy);

	let map: number[][] = [];
	let walls: Record<string, number> = {};
	let dug = 0;
	let rooms: Room[] = [];
	let corridors: Corridor[] = [];

	function at(x: number, y: number): number {
		const column = map[x];
		if (column === undefined) throw new Error("digger map: x out of range");
		const value = column[y];
		if (value === undefined) throw new Error("digger map: y out of range");
		return value;
	}

	function setCell(x: number, y: number, value: number): void {
		const column = map[x];
		if (column === undefined) throw new Error("digger map: x out of range");
		column[y] = value;
	}

	function digCallback(x: number, y: number, value: number): void {
		if (value === 0 || value === 2) {
			/* empty */
			setCell(x, y, 0);
			dug++;
		} else {
			/* wall */
			walls[encodePointKey(x, y)] = 1;
		}
	}

	function isWallCallback(x: number, y: number): boolean {
		if (x < 0 || y < 0 || x >= width || y >= height) return false;
		return at(x, y) === 1;
	}

	function canBeDugCallback(x: number, y: number): boolean {
		if (x < 1 || y < 1 || x + 1 >= width || y + 1 >= height) return false;
		return at(x, y) === 1;
	}

	function priorityWallCallback(x: number, y: number): void {
		walls[encodePointKey(x, y)] = 2;
	}

	function featureIsValid(feature: Feature): boolean {
		return feature.kind === "room"
			? roomIsValid(feature, isWallCallback, canBeDugCallback)
			: corridorIsValid(feature, isWallCallback, canBeDugCallback);
	}

	function digFeature(feature: Feature): void {
		if (feature.kind === "room") {
			digRoom(feature, digCallback);
		} else {
			digCorridor(feature, digCallback);
		}
	}

	function firstRoom(): void {
		const cx = Math.floor(width / 2);
		const cy = Math.floor(height / 2);
		const room = createRoomAtCenter(rng, cx, cy, resolvedOptions);
		rooms.push(room);
		digRoom(room, digCallback);
	}

	/** Get a suitable wall id ("x,y"), or null if none is available. */
	function findWall(): string | null {
		const prio1: string[] = [];
		const prio2: string[] = [];
		for (const id of Object.keys(walls)) {
			if (walls[id] === 2) prio2.push(id);
			else prio1.push(id);
		}

		const arr = prio2.length ? prio2 : prio1;
		if (!arr.length) return null; /* no walls :/ */

		const id = rng.getItem(arr.slice().sort()); // sort to make the order deterministic
		if (id === null) return null;
		delete walls[id];
		return id;
	}

	/** @returns was this a successful try? */
	function tryFeature(x: number, y: number, dx: number, dy: number): boolean {
		const featureName = rng.getWeightedValue(featureWeights);
		const feature = FEATURES[featureName](rng, x, y, dx, dy, resolvedOptions);

		if (!featureIsValid(feature)) return false;

		digFeature(feature);

		if (feature.kind === "room") {
			rooms.push(feature);
		} else {
			createCorridorPriorityWalls(feature, priorityWallCallback);
			corridors.push(feature);
		}

		return true;
	}

	function removeSurroundingWalls(cx: number, cy: number): void {
		for (const [dx, dy] of dirs4) {
			delete walls[encodePointKey(cx + dx, cy + dy)];
			delete walls[encodePointKey(cx + 2 * dx, cy + 2 * dy)];
		}
	}

	/** Vector in the "digging" direction, or null if it doesn't exist (or isn't unique). */
	function getDiggingDirection(
		cx: number,
		cy: number,
	): [number, number] | null {
		if (cx <= 0 || cy <= 0 || cx >= width - 1 || cy >= height - 1) return null;

		let result: [number, number] | null = null;

		for (const [dx, dy] of dirs4) {
			const x = cx + dx;
			const y = cy + dy;

			if (!at(x, y)) {
				/* there already is another empty neighbor! */
				if (result) return null;
				result = [dx, dy];
			}
		}

		/* no empty neighbor */
		if (!result) return null;

		return [-result[0], -result[1]];
	}

	/** Find empty spaces surrounding rooms, and apply doors. */
	function addDoorsToRooms(): void {
		for (const room of rooms) {
			clearDoors(room);
			addDoors(room, (x, y) => at(x, y) === 1);
		}
	}

	const diggerMap: DiggerMap = {
		getRooms: () => rooms,
		getCorridors: () => corridors,
		create(callback?: CreateCallback): DiggerMap {
			rooms = [];
			corridors = [];
			map = fillMap(width, height, 1);
			walls = {};
			dug = 0;
			const area = (width - 2) * (height - 2);

			firstRoom();

			const t1 = Date.now();

			let priorityWalls: number;
			do {
				priorityWalls = 0;
				if (Date.now() - t1 > resolvedOptions.timeLimit) break;

				/* find a good wall */
				const wall = findWall();
				if (!wall) break; /* no more walls */

				const [x, y] = decodePointKey(wall);
				const dir = getDiggingDirection(x, y);
				if (!dir) continue; /* this wall is not suitable */

				/* try adding a feature */
				let featureAttempts = 0;
				do {
					featureAttempts++;
					if (tryFeature(x, y, dir[0], dir[1])) {
						/* feature added */
						removeSurroundingWalls(x, y);
						removeSurroundingWalls(x - dir[0], y - dir[1]);
						break;
					}
				} while (featureAttempts < FEATURE_ATTEMPTS);

				for (const id of Object.keys(walls)) {
					if ((walls[id] ?? 0) > 1) priorityWalls++;
				}
			} while (dug / area < resolvedOptions.dugPercentage || priorityWalls);

			addDoorsToRooms();

			if (callback) {
				for (let i = 0; i < width; i++) {
					for (let j = 0; j < height; j++) {
						callback(i, j, at(i, j));
					}
				}
			}

			walls = {};
			map = [];

			return diggerMap;
		},
	};
	return diggerMap;
}
