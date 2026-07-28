import { DIRS } from "../constants.js";
import { toXy } from "../indexing.js";
import type { Rng } from "../rng.js";
import type { DungeonMap } from "./dungeon.js";
import { addDoors, clearDoors, type Room } from "./features.js";
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

export interface RogueMap extends DungeonMap {
	create(callback?: CreateCallback): RogueMap;
}

const calculateRoomSize = (size: number, cell: number): [number, number] => {
	let max = Math.floor((size / cell) * 0.8);
	let min = Math.floor((size / cell) * 0.25);
	if (min < 2) min = 2;
	if (max < 2) max = 2;
	return [min, max];
};

/**
 * Dungeon generator which uses the "original" Rogue dungeon generation algorithm.
 * See http://kuoi.com/~kamikaze/GameDesign/art07_rogue_dungeon.php
 * @author hyakugei
 */
export const createRogueMap = (
	width: number,
	height: number,
	rng: Rng,
	optionsInput: Partial<RogueOptions> = {},
): RogueMap => {
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

	const at = (x: number, y: number): number => {
		const column = map[x];
		if (column === undefined) throw new Error("rogue map: x out of range");
		const value = column[y];
		if (value === undefined) throw new Error("rogue map: y out of range");
		return value;
	};

	const set = (x: number, y: number, value: number): void => {
		const column = map[x];
		if (column === undefined) throw new Error("rogue map: x out of range");
		column[y] = value;
	};

	const room = (cellX: number, cellY: number): RogueRoom => {
		const column = rooms[cellX];
		if (column === undefined) throw new Error("rogue map: cellX out of range");
		const value = column[cellY];
		if (value === undefined) throw new Error("rogue map: cellY out of range");
		return value;
	};

	const initRooms = (): void => {
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
	};

	const connectRooms = (): void => {
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
	};

	const connectUnconnectedRooms = (): void => {
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

				/* when no valid neighbor is found the room simply stays unconnected
				 * (the original logged "-- Unable to connect room." here) */
				if (validRoom && otherRoom) {
					current.connections.push([otherRoom.cellx, otherRoom.celly]);
				}
			}
		}
	};

	/*
	 * connectUnconnectedRooms() is a best-effort pass and can leave a room
	 * with zero connections. Bridge any grid-adjacent room pair that still
	 * sits in a different connected component (union-find over the cell
	 * grid) until the whole grid is one component. This always terminates
	 * because the underlying cellWidth x cellHeight grid-adjacency graph is
	 * itself fully connected.
	 */
	const guaranteeFullConnectivity = (): void => {
		const cellWidth = resolvedOptions.cellWidth;
		const cellHeight = resolvedOptions.cellHeight;
		const totalCells = cellWidth * cellHeight;
		const cellIndex = (cellX: number, cellY: number): number =>
			cellX * cellHeight + cellY;

		const parent: number[] = [];
		for (let i = 0; i < totalCells; i++) parent.push(i);

		const find = (index: number): number => {
			let current = index;
			while (true) {
				const next = parent[current];
				if (next === undefined)
					throw new Error("unreachable: parent array fully initialized");
				if (next === current) return current;
				current = next;
			}
		};

		const union = (indexA: number, indexB: number): void => {
			const rootA = find(indexA);
			const rootB = find(indexB);
			if (rootA !== rootB) parent[rootA] = rootB;
		};

		for (let i = 0; i < cellWidth; i++) {
			for (let j = 0; j < cellHeight; j++) {
				for (const connection of room(i, j).connections) {
					union(cellIndex(i, j), cellIndex(connection[0], connection[1]));
				}
			}
		}

		let bridgedAny = true;
		while (bridgedAny) {
			bridgedAny = false;
			for (let i = 0; i < cellWidth; i++) {
				for (let j = 0; j < cellHeight; j++) {
					const neighbors: Point[] = [
						[i + 1, j],
						[i, j + 1],
					];
					for (const [neighborX, neighborY] of neighbors) {
						if (neighborX >= cellWidth || neighborY >= cellHeight) continue;
						if (
							find(cellIndex(i, j)) === find(cellIndex(neighborX, neighborY))
						) {
							continue;
						}
						room(i, j).connections.push([neighborX, neighborY]);
						union(cellIndex(i, j), cellIndex(neighborX, neighborY));
						bridgedAny = true;
					}
				}
			}
		}
	};

	const createRooms = (): void => {
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

				/*
				 * Never shrink a room to zero area: a room with no floor tiles
				 * still gets corridors routed to it (connections are decided
				 * before room sizes are known), and those corridors would dead-
				 * end into nothing. A 1-tile room is always valid instead.
				 */
				while (sx + sxOffset + roomw >= width) {
					if (sxOffset > 0) sxOffset--;
					else if (roomw > 1) roomw--;
					else break;
				}

				while (sy + syOffset + roomh >= height) {
					if (syOffset > 0) syOffset--;
					else if (roomh > 1) roomh--;
					else break;
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
	};

	/*
	 * The door-position roll (getUniformInt over y+1..y+height-2, or the x
	 * equivalent) is meant to land strictly inside the room, but for a
	 * degenerate room (width or height shrunk to 1 by createRooms's edge
	 * shrink loop) that range is empty/inverted and the roll can fall
	 * outside the room entirely, leaving the door only diagonally adjacent
	 * to the room instead of sharing an edge with it. Clamp it into the
	 * room's own row/column range so the door always touches the room.
	 *
	 * The returned point sits one tile beyond the door, giving drawCorridor a
	 * waypoint already clear of the room wall. For a room hugging the map
	 * edge that waypoint can fall outside the grid; clamp it there too so
	 * the corridor never anchors on an off-grid coordinate.
	 */
	const getWallPosition = (aRoom: RogueRoom, aDirection: number): Point => {
		let rx: number;
		let ry: number;
		let door: number;

		if (aDirection === 1 || aDirection === 3) {
			rx = Math.min(
				Math.max(
					rng.getUniformInt(aRoom.x + 1, aRoom.x + aRoom.width - 2),
					aRoom.x,
				),
				aRoom.x + aRoom.width - 1,
			);
			if (aDirection === 1) {
				door = aRoom.y - 1;
				ry = Math.max(aRoom.y - 2, 0);
			} else {
				door = aRoom.y + aRoom.height;
				ry = Math.min(aRoom.y + aRoom.height + 1, height - 1);
			}
			set(
				rx,
				door,
				0,
			); /* not setting a specific 'door' tile value right now, just empty space */
		} else {
			ry = Math.min(
				Math.max(
					rng.getUniformInt(aRoom.y + 1, aRoom.y + aRoom.height - 2),
					aRoom.y,
				),
				aRoom.y + aRoom.height - 1,
			);
			if (aDirection === 2) {
				door = aRoom.x + aRoom.width;
				rx = Math.min(aRoom.x + aRoom.width + 1, width - 1);
			} else {
				door = aRoom.x - 1;
				rx = Math.max(aRoom.x - 2, 0);
			}
			set(door, ry, 0);
		}
		return [rx, ry];
	};

	const drawCorridor = (startPosition: Point, endPosition: Point): void => {
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
	};

	const createCorridors = (): void => {
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
	};

	let computedRooms: Room[] = [];

	const buildComputedRooms = (): void => {
		computedRooms = [];
		for (let i = 0; i < resolvedOptions.cellWidth; i++) {
			for (let j = 0; j < resolvedOptions.cellHeight; j++) {
				const current = room(i, j);
				if (current.width <= 0 || current.height <= 0) continue;
				const roomBox: Room = {
					kind: "room",
					x1: current.x,
					y1: current.y,
					x2: current.x + current.width - 1,
					y2: current.y + current.height - 1,
					doors: {},
				};
				clearDoors(roomBox);
				addDoors(roomBox, (x, y) => {
					if (x < 0 || x >= width || y < 0 || y >= height) return true;
					return at(x, y) === 1;
				});
				computedRooms.push(roomBox);
			}
		}
	};

	const rogueMap: RogueMap = {
		getRooms: () => computedRooms,
		/* the algorithm doesn't decompose its corridor-drawing into discrete
		 * start/end Corridor objects, and nothing consumes .getCorridors()
		 * on this generator */
		getCorridors: () => [],
		create(callback?: CreateCallback): RogueMap {
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
			guaranteeFullConnectivity();
			createRooms();
			createCorridors();
			buildComputedRooms();

			if (callback) {
				for (let i = 0; i < width; i++) {
					for (let j = 0; j < height; j++) {
						callback(i, j, at(i, j));
					}
				}
			}

			return rogueMap;
		},
	};

	return rogueMap;
};
