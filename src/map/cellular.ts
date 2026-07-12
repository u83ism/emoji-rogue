import { DIRS } from "../constants.js";
import { toXy } from "../indexing.js";
import { encodePointKey } from "../pointkey.js";
import type { Rng } from "../rng.js";
import type { CreateCallback } from "./map.js";
import { fillMap } from "./map.js";

export interface CellularOptions {
	/** List of neighbor counts for a new cell to be born in empty space */
	born: number[];
	/** List of neighbor counts for an existing cell to survive */
	survive: number[];
	topology: 4 | 6 | 8;
}

export type ConnectionCallback = (from: Point, to: Point) => void;

type Point = [number, number];
type PointMap = Record<string, Point>;

export interface CellularMap {
	/** Fill the map with random values; probability is the chance [0,1] for a cell to become alive. */
	randomize(rng: Rng, probability: number): void;
	setOptions(options: Partial<CellularOptions>): void;
	set(x: number, y: number, value: number): void;
	create(callback?: CreateCallback): void;
	/** Make sure every non-wall space is accessible. */
	connect(
		rng: Rng,
		callback: CreateCallback | undefined,
		value?: number,
		connectionCallback?: ConnectionCallback,
	): void;
}

/**
 * Cellular automaton map generator.
 */
export function createCellularMap(
	width: number,
	height: number,
	options: Partial<CellularOptions> = {},
): CellularMap {
	const resolvedOptions: CellularOptions = {
		born: [5, 6, 7, 8],
		survive: [4, 5, 6, 7, 8],
		topology: 8,
		...options,
	};
	const dirs = DIRS[resolvedOptions.topology].map(toXy);
	let map = fillMap(width, height, 0);

	function getCell(x: number, y: number): number {
		const column = map[x];
		if (column === undefined) throw new Error("cellular map: x out of range");
		const value = column[y];
		if (value === undefined) throw new Error("cellular map: y out of range");
		return value;
	}

	function setCell(x: number, y: number, value: number): void {
		const column = map[x];
		if (column === undefined) throw new Error("cellular map: x out of range");
		column[y] = value;
	}

	function getNeighbors(cx: number, cy: number): number {
		let result = 0;
		for (const [dx, dy] of dirs) {
			const x = cx + dx;
			const y = cy + dy;
			if (x < 0 || x >= width || y < 0 || y >= height) continue;
			result += getCell(x, y) === 1 ? 1 : 0;
		}
		return result;
	}

	function serviceCallback(callback: CreateCallback): void {
		for (let j = 0; j < height; j++) {
			let widthStep = 1;
			let widthStart = 0;
			if (resolvedOptions.topology === 6) {
				widthStep = 2;
				widthStart = j % 2;
			}
			for (let i = widthStart; i < width; i += widthStep) {
				callback(i, j, getCell(i, j));
			}
		}
	}

	function freeSpace(x: number, y: number, value: number): boolean {
		return (
			x >= 0 && x < width && y >= 0 && y < height && getCell(x, y) === value
		);
	}

	/* the original rot.js used "x.y" here; unified to the shared "x,y" key */
	function pointKey(p: Point): string {
		return encodePointKey(p[0], p[1]);
	}

	function getClosest(point: Point, space: PointMap): Point {
		let minPoint: Point | null = null;
		let minDist = Number.POSITIVE_INFINITY;
		for (const key of Object.keys(space)) {
			const p = space[key];
			if (p === undefined) continue;
			const d =
				(p[0] - point[0]) * (p[0] - point[0]) +
				(p[1] - point[1]) * (p[1] - point[1]);
			if (d < minDist) {
				minDist = d;
				minPoint = p;
			}
		}
		if (minPoint === null) {
			throw new Error(
				"cellular map: no closest point found in a non-empty space",
			);
		}
		return minPoint;
	}

	function findConnected(
		connected: PointMap,
		notConnected: PointMap,
		stackInput: Point[],
		keepNotConnected: boolean,
		value: number,
	): void {
		const stack = stackInput.slice();
		while (stack.length > 0) {
			const p = stack.shift();
			if (p === undefined) throw new Error("unreachable: stack is non-empty");
			let tests: Point[];

			if (resolvedOptions.topology === 6) {
				tests = [
					[p[0] + 2, p[1]],
					[p[0] + 1, p[1] - 1],
					[p[0] - 1, p[1] - 1],
					[p[0] - 2, p[1]],
					[p[0] - 1, p[1] + 1],
					[p[0] + 1, p[1] + 1],
				];
			} else {
				tests = [
					[p[0] + 1, p[1]],
					[p[0] - 1, p[1]],
					[p[0], p[1] + 1],
					[p[0], p[1] - 1],
				];
			}

			for (const candidate of tests) {
				const key = pointKey(candidate);
				if (
					connected[key] == null &&
					freeSpace(candidate[0], candidate[1], value)
				) {
					connected[key] = candidate;
					if (!keepNotConnected) {
						delete notConnected[key];
					}
					stack.push(candidate);
				}
			}
		}
	}

	function getFromTo(
		rng: Rng,
		connected: PointMap,
		notConnected: PointMap,
	): [Point, Point] {
		let from: Point = [0, 0];
		let to: Point = [0, 0];
		const connectedKeys = Object.keys(connected);
		const notConnectedKeys = Object.keys(notConnected);
		for (let i = 0; i < 5; i++) {
			if (connectedKeys.length < notConnectedKeys.length) {
				const key = rng.getItem(connectedKeys);
				to = key !== null ? (connected[key] ?? to) : to;
				from = getClosest(to, notConnected);
			} else {
				const key = rng.getItem(notConnectedKeys);
				from = key !== null ? (notConnected[key] ?? from) : from;
				to = getClosest(from, connected);
			}
			const d =
				(from[0] - to[0]) * (from[0] - to[0]) +
				(from[1] - to[1]) * (from[1] - to[1]);
			if (d < 64) break;
		}
		return [from, to];
	}

	function tunnelToConnected(
		to: Point,
		from: Point,
		connected: PointMap,
		notConnected: PointMap,
		value: number,
		connectionCallback?: ConnectionCallback,
	): void {
		let a = from[0] < to[0] ? from : to;
		let b = from[0] < to[0] ? to : from;
		for (let xx = a[0]; xx <= b[0]; xx++) {
			setCell(xx, a[1], value);
			const p: Point = [xx, a[1]];
			const key = pointKey(p);
			connected[key] = p;
			delete notConnected[key];
		}
		if (connectionCallback && a[0] < b[0]) {
			connectionCallback(a, [b[0], a[1]]);
		}

		const x = b[0];
		a = from[1] < to[1] ? from : to;
		b = from[1] < to[1] ? to : from;
		for (let yy = a[1]; yy < b[1]; yy++) {
			setCell(x, yy, value);
			const p: Point = [x, yy];
			const key = pointKey(p);
			connected[key] = p;
			delete notConnected[key];
		}
		if (connectionCallback && a[1] < b[1]) {
			connectionCallback([b[0], a[1]], [b[0], b[1]]);
		}
	}

	function tunnelToConnected6(
		to: Point,
		from: Point,
		connected: PointMap,
		notConnected: PointMap,
		value: number,
		connectionCallback?: ConnectionCallback,
	): void {
		const a = from[0] < to[0] ? from : to;
		const b = from[0] < to[0] ? to : from;

		let xx = a[0];
		let yy = a[1];
		while (!(xx === b[0] && yy === b[1])) {
			let stepWidth = 2;
			if (yy < b[1]) {
				yy++;
				stepWidth = 1;
			} else if (yy > b[1]) {
				yy--;
				stepWidth = 1;
			}
			if (xx < b[0]) {
				xx += stepWidth;
			} else if (xx > b[0]) {
				xx -= stepWidth;
			} else if (b[1] % 2) {
				xx -= stepWidth;
			} else {
				xx += stepWidth;
			}
			setCell(xx, yy, value);
			const p: Point = [xx, yy];
			const key = pointKey(p);
			connected[key] = p;
			delete notConnected[key];
		}

		if (connectionCallback) {
			connectionCallback(from, to);
		}
	}

	return {
		randomize(rng: Rng, probability: number): void {
			for (let i = 0; i < width; i++) {
				for (let j = 0; j < height; j++) {
					setCell(i, j, rng.getUniform() < probability ? 1 : 0);
				}
			}
		},

		setOptions(newOptions: Partial<CellularOptions>): void {
			Object.assign(resolvedOptions, newOptions);
		},

		set(x: number, y: number, value: number): void {
			setCell(x, y, value);
		},

		create(callback?: CreateCallback): void {
			const newMap = fillMap(width, height, 0);
			const { born, survive } = resolvedOptions;

			for (let j = 0; j < height; j++) {
				let widthStep = 1;
				let widthStart = 0;
				if (resolvedOptions.topology === 6) {
					widthStep = 2;
					widthStart = j % 2;
				}

				for (let i = widthStart; i < width; i += widthStep) {
					const cur = getCell(i, j);
					const neighborCount = getNeighbors(i, j);
					const row = newMap[i];
					if (row === undefined)
						throw new Error("unreachable: i is within width");

					if (cur && survive.indexOf(neighborCount) !== -1) {
						row[j] = 1;
					} else if (!cur && born.indexOf(neighborCount) !== -1) {
						row[j] = 1;
					}
				}
			}

			map = newMap;
			if (callback) serviceCallback(callback);
		},

		connect(
			rng: Rng,
			callback: CreateCallback | undefined,
			value = 0,
			connectionCallback?: ConnectionCallback,
		): void {
			const allFreeSpace: Point[] = [];
			const notConnected: PointMap = {};

			let widthStep = 1;
			let widthStarts: [number, number] = [0, 0];
			if (resolvedOptions.topology === 6) {
				widthStep = 2;
				widthStarts = [0, 1];
			}
			for (let y = 0; y < height; y++) {
				const start = widthStarts[y % 2] ?? 0;
				for (let x = start; x < width; x += widthStep) {
					if (freeSpace(x, y, value)) {
						const p: Point = [x, y];
						notConnected[pointKey(p)] = p;
						allFreeSpace.push(p);
					}
				}
			}
			const start = rng.getItem(allFreeSpace);
			if (start === null) return;

			const startKey = pointKey(start);
			const connected: PointMap = { [startKey]: start };
			delete notConnected[startKey];

			findConnected(connected, notConnected, [start], false, value);

			while (Object.keys(notConnected).length > 0) {
				const [from, to] = getFromTo(rng, connected, notConnected);

				const local: PointMap = { [pointKey(from)]: from };
				findConnected(local, notConnected, [from], true, value);

				const tunnel =
					resolvedOptions.topology === 6
						? tunnelToConnected6
						: tunnelToConnected;
				tunnel(to, from, connected, notConnected, value, connectionCallback);

				for (const key of Object.keys(local)) {
					const p = local[key];
					if (p === undefined) continue;
					setCell(p[0], p[1], value);
					connected[key] = p;
					delete notConnected[key];
				}
			}

			if (callback) serviceCallback(callback);
		},
	};
}
