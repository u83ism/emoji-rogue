import { decodePointKey, encodePointKey } from "../pointkey.js";
import type { Rng } from "../rng.js";

export interface RoomOptions {
	roomWidth: [number, number];
	roomHeight: [number, number];
}

export interface CorridorOptions {
	corridorLength: [number, number];
}

export interface FeatureOptions extends RoomOptions, CorridorOptions {}

export type DigCallback = (x: number, y: number, value: number) => void;
export type TestPositionCallback = (x: number, y: number) => boolean;

export interface Room {
	readonly kind: "room";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	doors: Record<string, number>;
}

export interface Corridor {
	readonly kind: "corridor";
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	endsWithAWall: boolean;
}

export type Feature = Room | Corridor;

/** Builds a new feature at (x, y), digging in direction (dx, dy) — dx/dy must be -1, 0, or 1 with exactly one of them non-zero. */
export type CreateFeatureAt = (
	rng: Rng,
	x: number,
	y: number,
	dx: number,
	dy: number,
	options: FeatureOptions,
) => Feature;

const createRoom = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	doorX?: number,
	doorY?: number,
): Room => {
	const room: Room = { kind: "room", x1, y1, x2, y2, doors: {} };
	if (doorX !== undefined && doorY !== undefined) {
		addDoor(room, doorX, doorY);
	}
	return room;
};

/**
 * Room of random size, with a given door position and direction.
 */
export const createRoomAt = (
	rng: Rng,
	x: number,
	y: number,
	dx: number,
	dy: number,
	options: RoomOptions,
): Room => {
	const width = rng.getUniformInt(options.roomWidth[0], options.roomWidth[1]);
	const height = rng.getUniformInt(
		options.roomHeight[0],
		options.roomHeight[1],
	);

	if (dx === 1) {
		/* to the right */
		const y2 = y - Math.floor(rng.getUniform() * height);
		return createRoom(x + 1, y2, x + width, y2 + height - 1, x, y);
	}

	if (dx === -1) {
		/* to the left */
		const y2 = y - Math.floor(rng.getUniform() * height);
		return createRoom(x - width, y2, x - 1, y2 + height - 1, x, y);
	}

	if (dy === 1) {
		/* to the bottom */
		const x2 = x - Math.floor(rng.getUniform() * width);
		return createRoom(x2, y + 1, x2 + width - 1, y + height, x, y);
	}

	if (dy === -1) {
		/* to the top */
		const x2 = x - Math.floor(rng.getUniform() * width);
		return createRoom(x2, y - height, x2 + width - 1, y - 1, x, y);
	}

	// Invariant violation, not an expected failure: every caller (digger.ts's
	// getDiggingDirection, features.ts's own callers) only ever produces a
	// unit direction vector. Reaching here means a caller bug, not a normal
	// "can't build a room here" outcome.
	throw new Error("dx or dy must be 1 or -1");
};

/**
 * Room of random size, positioned around center coordinates.
 */
export const createRoomAtCenter = (
	rng: Rng,
	cx: number,
	cy: number,
	options: RoomOptions,
): Room => {
	const width = rng.getUniformInt(options.roomWidth[0], options.roomWidth[1]);
	const height = rng.getUniformInt(
		options.roomHeight[0],
		options.roomHeight[1],
	);

	const x1 = cx - Math.floor(rng.getUniform() * width);
	const y1 = cy - Math.floor(rng.getUniform() * height);
	const x2 = x1 + width - 1;
	const y2 = y1 + height - 1;

	return createRoom(x1, y1, x2, y2);
};

/**
 * Room of random size within the given dimensions.
 */
export const createRandomRoom = (
	rng: Rng,
	availWidth: number,
	availHeight: number,
	options: RoomOptions,
): Room => {
	const width = rng.getUniformInt(options.roomWidth[0], options.roomWidth[1]);
	const height = rng.getUniformInt(
		options.roomHeight[0],
		options.roomHeight[1],
	);

	const left = availWidth - width - 1;
	const top = availHeight - height - 1;

	const x1 = 1 + Math.floor(rng.getUniform() * left);
	const y1 = 1 + Math.floor(rng.getUniform() * top);
	const x2 = x1 + width - 1;
	const y2 = y1 + height - 1;

	return createRoom(x1, y1, x2, y2);
};

export const addDoor = (room: Room, x: number, y: number): void => {
	room.doors[encodePointKey(x, y)] = 1;
};

export const getDoors = (
	room: Room,
	callback: (x: number, y: number) => void,
): void => {
	for (const key of Object.keys(room.doors)) {
		const [x, y] = decodePointKey(key);
		callback(x, y);
	}
};

export const clearDoors = (room: Room): void => {
	room.doors = {};
};

export const addDoors = (
	room: Room,
	isWallCallback: TestPositionCallback,
): void => {
	const left = room.x1 - 1;
	const right = room.x2 + 1;
	const top = room.y1 - 1;
	const bottom = room.y2 + 1;

	for (let x = left; x <= right; x++) {
		for (let y = top; y <= bottom; y++) {
			if (x !== left && x !== right && y !== top && y !== bottom) {
				continue;
			}
			if (isWallCallback(x, y)) {
				continue;
			}
			addDoor(room, x, y);
		}
	}
};

export const roomIsValid = (
	room: Room,
	isWallCallback: TestPositionCallback,
	canBeDugCallback: TestPositionCallback,
): boolean => {
	const left = room.x1 - 1;
	const right = room.x2 + 1;
	const top = room.y1 - 1;
	const bottom = room.y2 + 1;

	for (let x = left; x <= right; x++) {
		for (let y = top; y <= bottom; y++) {
			if (x === left || x === right || y === top || y === bottom) {
				if (!isWallCallback(x, y)) return false;
			} else {
				if (!canBeDugCallback(x, y)) return false;
			}
		}
	}

	return true;
};

/**
 * @param digCallback Signature (x, y, value). Values: 0 = empty, 1 = wall, 2 = door. Multiple doors are allowed.
 */
export const digRoom = (room: Room, digCallback: DigCallback): void => {
	const left = room.x1 - 1;
	const right = room.x2 + 1;
	const top = room.y1 - 1;
	const bottom = room.y2 + 1;

	for (let x = left; x <= right; x++) {
		for (let y = top; y <= bottom; y++) {
			let value: number;
			if (encodePointKey(x, y) in room.doors) {
				value = 2;
			} else if (x === left || x === right || y === top || y === bottom) {
				value = 1;
			} else {
				value = 0;
			}
			digCallback(x, y, value);
		}
	}
};

export const getRoomCenter = (room: Room): [number, number] => {
	return [
		Math.round((room.x1 + room.x2) / 2),
		Math.round((room.y1 + room.y2) / 2),
	];
};

export const getRoomLeft = (room: Room): number => {
	return room.x1;
};
export const getRoomRight = (room: Room): number => {
	return room.x2;
};
export const getRoomTop = (room: Room): number => {
	return room.y1;
};
export const getRoomBottom = (room: Room): number => {
	return room.y2;
};

/**
 * A corridor with fixed endpoints (not randomly generated).
 */
export const createCorridor = (
	startX: number,
	startY: number,
	endX: number,
	endY: number,
): Corridor => {
	return { kind: "corridor", startX, startY, endX, endY, endsWithAWall: true };
};

export const createCorridorAt = (
	rng: Rng,
	x: number,
	y: number,
	dx: number,
	dy: number,
	options: CorridorOptions,
): Corridor => {
	const length = rng.getUniformInt(
		options.corridorLength[0],
		options.corridorLength[1],
	);
	return createCorridor(x, y, x + dx * length, y + dy * length);
};

/**
 * Validates a corridor, shortening it in place if it runs into an obstacle.
 */
export const corridorIsValid = (
	corridor: Corridor,
	isWallCallback: TestPositionCallback,
	canBeDugCallback: TestPositionCallback,
): boolean => {
	const sx = corridor.startX;
	const sy = corridor.startY;
	let dx = corridor.endX - sx;
	let dy = corridor.endY - sy;
	let length = 1 + Math.max(Math.abs(dx), Math.abs(dy));

	if (dx) dx = dx / Math.abs(dx);
	if (dy) dy = dy / Math.abs(dy);
	const nx = dy;
	const ny = -dx;

	let ok = true;
	for (let i = 0; i < length; i++) {
		const x = sx + i * dx;
		const y = sy + i * dy;

		if (!canBeDugCallback(x, y)) ok = false;
		if (!isWallCallback(x + nx, y + ny)) ok = false;
		if (!isWallCallback(x - nx, y - ny)) ok = false;

		if (!ok) {
			length = i;
			corridor.endX = x - dx;
			corridor.endY = y - dy;
			break;
		}
	}

	/* if the length degenerated, this corridor might be invalid */

	/* not supported */
	if (length === 0) return false;

	/* length 1 allowed only if the next space is empty */
	if (length === 1 && isWallCallback(corridor.endX + dx, corridor.endY + dy)) {
		return false;
	}

	/*
	 * We do not want the corridor to crash into a corner of a room;
	 * if any of the ending corners is empty, the N+1th cell of this corridor must be empty too.
	 *
	 * Situation:
	 * #######1
	 * .......?
	 * #######2
	 *
	 * The corridor was dug from left to right.
	 * 1, 2 - problematic corners, ? = N+1th cell (not dug)
	 */
	const firstCornerBad = !isWallCallback(
		corridor.endX + dx + nx,
		corridor.endY + dy + ny,
	);
	const secondCornerBad = !isWallCallback(
		corridor.endX + dx - nx,
		corridor.endY + dy - ny,
	);
	corridor.endsWithAWall = isWallCallback(
		corridor.endX + dx,
		corridor.endY + dy,
	);
	if ((firstCornerBad || secondCornerBad) && corridor.endsWithAWall) {
		return false;
	}

	return true;
};

/**
 * @param digCallback Signature (x, y, value). Values: 0 = empty.
 */
export const digCorridor = (
	corridor: Corridor,
	digCallback: DigCallback,
): void => {
	const sx = corridor.startX;
	const sy = corridor.startY;
	let dx = corridor.endX - sx;
	let dy = corridor.endY - sy;
	const length = 1 + Math.max(Math.abs(dx), Math.abs(dy));

	if (dx) dx = dx / Math.abs(dx);
	if (dy) dy = dy / Math.abs(dy);

	for (let i = 0; i < length; i++) {
		const x = sx + i * dx;
		const y = sy + i * dy;
		digCallback(x, y, 0);
	}
};

export const createCorridorPriorityWalls = (
	corridor: Corridor,
	priorityWallCallback: (x: number, y: number) => void,
): void => {
	if (!corridor.endsWithAWall) return;

	const sx = corridor.startX;
	const sy = corridor.startY;

	let dx = corridor.endX - sx;
	let dy = corridor.endY - sy;
	if (dx) dx = dx / Math.abs(dx);
	if (dy) dy = dy / Math.abs(dy);
	const nx = dy;
	const ny = -dx;

	priorityWallCallback(corridor.endX + dx, corridor.endY + dy);
	priorityWallCallback(corridor.endX + nx, corridor.endY + ny);
	priorityWallCallback(corridor.endX - nx, corridor.endY - ny);
};
