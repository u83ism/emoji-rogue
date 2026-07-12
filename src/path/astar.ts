import type {
	ComputeCallback,
	PassableCallback,
	Path,
	PathOptions,
} from "./path.js";
import { getNeighbors, getPathDirs } from "./path.js";

interface Item {
	x: number;
	y: number;
	g: number;
	h: number;
	prev: Item | null;
}

function encodeKey(x: number, y: number): string {
	return `${x},${y}`;
}

/**
 * Simplified A* algorithm: all edges have a value of 1.
 */
export function createAStarPath(
	toX: number,
	toY: number,
	passable: PassableCallback,
	options: Partial<PathOptions> = {},
): Path {
	const topology = options.topology ?? 8;
	const dirs = getPathDirs(topology);

	function distance(
		x: number,
		y: number,
		fromX: number,
		fromY: number,
	): number {
		switch (topology) {
			case 4:
				return Math.abs(x - fromX) + Math.abs(y - fromY);

			case 6: {
				const dx = Math.abs(x - fromX);
				const dy = Math.abs(y - fromY);
				return dy + Math.max(0, (dx - dy) / 2);
			}

			case 8:
				return Math.max(Math.abs(x - fromX), Math.abs(y - fromY));

			default:
				throw new Error("Incorrect topology for A* computation");
		}
	}

	return (fromX: number, fromY: number, callback: ComputeCallback) => {
		const todo: Item[] = [];
		const done: Record<string, Item> = {};

		function add(x: number, y: number, prev: Item | null): void {
			const h = distance(x, y, fromX, fromY);
			const item: Item = { x, y, prev, g: prev ? prev.g + 1 : 0, h };

			/* insert into priority queue */
			const f = item.g + item.h;
			for (let i = 0; i < todo.length; i++) {
				const existing = todo[i];
				if (existing === undefined) {
					throw new Error("unreachable: i is within todo.length");
				}
				const existingF = existing.g + existing.h;
				if (f < existingF || (f === existingF && h < existing.h)) {
					todo.splice(i, 0, item);
					return;
				}
			}

			todo.push(item);
		}

		add(toX, toY, null);

		while (todo.length) {
			const item = todo.shift();
			if (item === undefined) {
				throw new Error("unreachable: todo is non-empty");
			}
			const id = encodeKey(item.x, item.y);
			if (id in done) {
				continue;
			}
			done[id] = item;
			if (item.x === fromX && item.y === fromY) {
				break;
			}

			const neighbors = getNeighbors(dirs, passable, item.x, item.y);
			for (const [x, y] of neighbors) {
				const neighborId = encodeKey(x, y);
				if (neighborId in done) {
					continue;
				}
				add(x, y, item);
			}
		}

		let current: Item | null = done[encodeKey(fromX, fromY)] ?? null;
		if (!current) {
			return;
		}

		while (current) {
			callback(current.x, current.y);
			current = current.prev;
		}
	};
}
