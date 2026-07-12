import { DIRS } from "../constants.js";
import type { Rng } from "../rng.js";
import type { CreateCallback } from "./map.js";

type Point = [number, number];

export interface RogueOptions {
	/** Number of cells to create on the horizontal (number of rooms horizontally) */
	cellWidth: number;
	/** Number of cells to create on the vertical (number of rooms vertically) */
	cellHeight: number;
	/** Room min and max width - normally set auto-magically via the factory. */
	roomWidth: [number, number];
	/** Room min and max height - normally set auto-magically via the factory. */
	roomHeight: [number, number];
}

export interface RogueRoom {
	x: number;
	y: number;
	width: number;
	height: number;
	connections: Point[];
	cellx: number;
	celly: number;
}

export interface RogueMap {
	create(callback?: CreateCallback): void;
}

function toXy(pair: readonly number[] | undefined): [number, number] {
	if (pair === undefined) {
		throw new Error("expected a two-element direction vector");
	}
	const [dx, dy] = pair;
	if (dx === undefined || dy === undefined) {
		throw new Error("expected a two-element direction vector");
	}
	return [dx, dy];
}

function calculateRoomSize(size: number, cell: number): [number, number] {
	let max = Math.floor((size / cell) * 0.8);
	let min = Math.floor((size / cell) * 0.25);
	if (min < 2) min = 2;
	if (max < 2) max = 2;
	return [min, max];
}

/**
 * Dungeon generator which uses the "original" Rogue dungeon generation algorithm.
 * See http://kuoi.com/~kamikaze/GameDesign/art07_rogue_dungeon.php
 * @author hyakugei
 */
export function createRogueMap(
	width: number,
	height: number,
	rng: Rng,
	optionsInput: Partial<RogueOptions> = {},
): RogueMap {
	const dirs8 = DIRS[8].map(toXy);

	const partialOptions: Partial<RogueOptions> = {
		cellWidth: 3,
		cellHeight: 3,
		...optionsInput,
	};
	const cellWidth = partialOptions.cellWidth ?? 3;
	const cellHeight = partialOptions.cellHeight ?? 3;
	const resolvedOptions: RogueOptions = {
		cellWidth,
		cellHeight,
		roomWidth: partialOptions.roomWidth ?? calculateRoomSize(width, cellWidth),
		roomHeight:
			partialOptions.roomHeight ?? calculateRoomSize(height, cellHeight),
	};

	let map: number[][] = [];
	let rooms: RogueRoom[][] = [];
	let connectedCells: Point[] = [];

	function at(x: number, y: number): number {
		const column = map[x];
		if (column === undefined) throw new Error("rogue map: x out of range");
		const value = column[y];
		if (value === undefined) throw new Error("rogue map: y out of range");
		return value;
	}

	function set(x: number, y: number, value: number): void {
		const column = map[x];
		if (column === undefined) throw new Error("rogue map: x out of range");
		column[y] = value;
	}

	function room(cellX: number, cellY: number): RogueRoom {
		const column = rooms[cellX];
		if (column === undefined) throw new Error("rogue map: cellX out of range");
		const value = column[cellY];
		if (value === undefined) throw new Error("rogue map: cellY out of range");
		return value;
	}

	function initRooms(): void {
		rooms = [];
		for (let i = 0; i < resolvedOptions.cellWidth; i++) {
			const column: RogueRoom[] = [];
			for (let j = 0; j < resolvedOptions.cellHeight; j++) {
				column.push({
					x: 0,
					y: 0,
					width: 0,
					height: 0,
					connections: [],
					cellx: i,
					celly: j,
				});
			}
			rooms.push(column);
		}
	}

	function connectRooms(): void {
		/* pick random starting grid */
		let cgx = rng.getUniformInt(0, resolvedOptions.cellWidth - 1);
		let cgy = rng.getUniformInt(0, resolvedOptions.cellHeight - 1);

		/* find unconnected neighbor cells */
		let dirToCheck: number[] = [];
		do {
			dirToCheck = rng.shuffle([0, 2, 4, 6]);

			let found = false;
			do {
				found = false;
				const idx = dirToCheck.pop();
				if (idx === undefined) break;
				const [dx, dy] = dirs8[idx] ?? [0, 0];

				const ncgx = cgx + dx;
				const ncgy = cgy + dy;

				if (ncgx < 0 || ncgx >= resolvedOptions.cellWidth) continue;
				if (ncgy < 0 || ncgy >= resolvedOptions.cellHeight) continue;

				const current = room(cgx, cgy);
				if (current.connections.length > 0) {
					/* as long as this room doesn't already connect to me, we are ok with it */
					const firstConnection = current.connections[0];
					if (
						firstConnection !== undefined &&
						firstConnection[0] === ncgx &&
						firstConnection[1] === ncgy
					) {
						break;
					}
				}

				const otherRoom = room(ncgx, ncgy);
				if (otherRoom.connections.length === 0) {
					otherRoom.connections.push([cgx, cgy]);
					connectedCells.push([ncgx, ncgy]);
					cgx = ncgx;
					cgy = ncgy;
					found = true;
				}
			} while (dirToCheck.length > 0 && found === false);
		} while (dirToCheck.length > 0);
	}

	function connectUnconnectedRooms(): void {
		/*
		 * While there are unconnected rooms, try to connect them to a random
		 * connected neighbor (if a room has no connected neighbors yet, just
		 * keep cycling, you'll fill out to it eventually).
		 */
		connectedCells = rng.shuffle(connectedCells);

		for (let i = 0; i < resolvedOptions.cellWidth; i++) {
			for (let j = 0; j < resolvedOptions.cellHeight; j++) {
				const current = room(i, j);
				if (current.connections.length !== 0) continue;

				const directions = rng.shuffle([0, 2, 4, 6]);
				let validRoom = false;
				let otherRoom: RogueRoom | undefined;

				do {
					const dirIdx = directions.pop();
					if (dirIdx === undefined) break;
					const [dx, dy] = dirs8[dirIdx] ?? [0, 0];
					const newI = i + dx;
					const newJ = j + dy;

					if (
						newI < 0 ||
						newI >= resolvedOptions.cellWidth ||
						newJ < 0 ||
						newJ >= resolvedOptions.cellHeight
					) {
						continue;
					}

					otherRoom = room(newI, newJ);
					validRoom = true;

					if (otherRoom.connections.length === 0) break;

					for (const connection of otherRoom.connections) {
						if (connection[0] === i && connection[1] === j) {
							validRoom = false;
							break;
						}
					}

					if (validRoom) break;
				} while (directions.length);

				if (validRoom && otherRoom) {
					current.connections.push([otherRoom.cellx, otherRoom.celly]);
				} else {
					console.log("-- Unable to connect room.");
				}
			}
		}
	}

	function createRooms(): void {
		const cw = resolvedOptions.cellWidth;
		const ch = resolvedOptions.cellHeight;

		const cwp = Math.floor(width / cw);
		const chp = Math.floor(height / ch);

		const [roomWidthMin, roomWidthMax] = resolvedOptions.roomWidth;
		const [roomHeightMin, roomHeightMax] = resolvedOptions.roomHeight;

		for (let i = 0; i < cw; i++) {
			for (let j = 0; j < ch; j++) {
				let sx = cwp * i;
				let sy = chp * j;

				if (sx === 0) sx = 1;
				if (sy === 0) sy = 1;

				let roomw = rng.getUniformInt(roomWidthMin, roomWidthMax);
				let roomh = rng.getUniformInt(roomHeightMin, roomHeightMax);

				if (j > 0) {
					const above = room(i, j - 1);
					while (sy - (above.y + above.height) < 3) sy++;
				}

				if (i > 0) {
					const before = room(i - 1, j);
					while (sx - (before.x + before.width) < 3) sx++;
				}

				let sxOffset = Math.round(rng.getUniformInt(0, cwp - roomw) / 2);
				let syOffset = Math.round(rng.getUniformInt(0, chp - roomh) / 2);

				while (sx + sxOffset + roomw >= width) {
					if (sxOffset) sxOffset--;
					else roomw--;
				}

				while (sy + syOffset + roomh >= height) {
					if (syOffset) syOffset--;
					else roomh--;
				}

				sx += sxOffset;
				sy += syOffset;

				const current = room(i, j);
				current.x = sx;
				current.y = sy;
				current.width = roomw;
				current.height = roomh;

				for (let ii = sx; ii < sx + roomw; ii++) {
					for (let jj = sy; jj < sy + roomh; jj++) {
						set(ii, jj, 0);
					}
				}
			}
		}
	}

	function getWallPosition(aRoom: RogueRoom, aDirection: number): Point {
		let rx: number;
		let ry: number;
		let door: number;

		if (aDirection === 1 || aDirection === 3) {
			rx = rng.getUniformInt(aRoom.x + 1, aRoom.x + aRoom.width - 2);
			if (aDirection === 1) {
				ry = aRoom.y - 2;
				door = ry + 1;
			} else {
				ry = aRoom.y + aRoom.height + 1;
				door = ry - 1;
			}
			set(
				rx,
				door,
				0,
			); /* not setting a specific 'door' tile value right now, just empty space */
		} else {
			ry = rng.getUniformInt(aRoom.y + 1, aRoom.y + aRoom.height - 2);
			if (aDirection === 2) {
				rx = aRoom.x + aRoom.width + 1;
				door = rx - 1;
			} else {
				rx = aRoom.x - 2;
				door = rx + 1;
			}
			set(door, ry, 0);
		}
		return [rx, ry];
	}

	function drawCorridor(startPosition: Point, endPosition: Point): void {
		const xOffset = endPosition[0] - startPosition[0];
		const yOffset = endPosition[1] - startPosition[1];

		let xpos = startPosition[0];
		let ypos = startPosition[1];

		const moves: Point[] = []; /* a list of [direction, distance] pairs */

		const xAbs = Math.abs(xOffset);
		const yAbs = Math.abs(yOffset);

		const percent =
			rng.getUniform(); /* used to split the move at different places along the long axis */
		const firstHalf = percent;
		const secondHalf = 1 - percent;

		const xDir = xOffset > 0 ? 2 : 6;
		const yDir = yOffset > 0 ? 4 : 0;

		if (xAbs < yAbs) {
			moves.push([yDir, Math.ceil(yAbs * firstHalf)]);
			moves.push([xDir, xAbs]);
			moves.push([yDir, Math.floor(yAbs * secondHalf)]);
		} else {
			moves.push([xDir, Math.ceil(xAbs * firstHalf)]);
			moves.push([yDir, yAbs]);
			moves.push([xDir, Math.floor(xAbs * secondHalf)]);
		}

		set(xpos, ypos, 0);

		while (moves.length > 0) {
			const move = moves.pop();
			if (move === undefined)
				throw new Error("unreachable: moves is non-empty");
			let remaining = move[1];
			const [dx, dy] = dirs8[move[0]] ?? [0, 0];
			while (remaining > 0) {
				xpos += dx;
				ypos += dy;
				set(xpos, ypos, 0);
				remaining--;
			}
		}
	}

	function createCorridors(): void {
		const cw = resolvedOptions.cellWidth;
		const ch = resolvedOptions.cellHeight;

		for (let i = 0; i < cw; i++) {
			for (let j = 0; j < ch; j++) {
				const current = room(i, j);

				for (const connection of current.connections) {
					const otherRoom = room(connection[0], connection[1]);

					let wall: number;
					let otherWall: number;
					if (otherRoom.cellx > current.cellx) {
						wall = 2;
						otherWall = 4;
					} else if (otherRoom.cellx < current.cellx) {
						wall = 4;
						otherWall = 2;
					} else if (otherRoom.celly > current.celly) {
						wall = 3;
						otherWall = 1;
					} else {
						wall = 1;
						otherWall = 3;
					}

					drawCorridor(
						getWallPosition(current, wall),
						getWallPosition(otherRoom, otherWall),
					);
				}
			}
		}
	}

	return {
		create(callback?: CreateCallback): void {
			map = [];
			for (let i = 0; i < width; i++) {
				const column: number[] = [];
				for (let j = 0; j < height; j++) column.push(1);
				map.push(column);
			}
			connectedCells = [];

			initRooms();
			connectRooms();
			connectUnconnectedRooms();
			createRooms();
			createCorridors();

			if (callback) {
				for (let i = 0; i < width; i++) {
					for (let j = 0; j < height; j++) {
						callback(i, j, at(i, j));
					}
				}
			}
		},
	};
}
