import { encodePointKey } from "../pointkey.js";
import { err, ok } from "../result.js";
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
	prev: Item | null;
}

/**
 * Simplified Dijkstra's algorithm: all edges have a value of 1.
 *
 * Each call runs a fresh search, so `passable` is re-consulted every time and
 * terrain changes between calls are always reflected. (The upstream rot.js
 * version cached the search frontier across calls; that cache silently
 * returned stale paths once passability changed, so it was removed.)
 */
export const createDijkstraPath = (
	toX: number,
	toY: number,
	passable: PassableCallback,
	options: Partial<PathOptions> = {},
): Path => {
	const dirs = getPathDirs(options.topology ?? 8);

	return (fromX: number, fromY: number, callback: ComputeCallback) => {
		const computed: Record<string, Item> = {};
		const todo: Item[] = [];

		const add = (x: number, y: number, prev: Item | null): void => {
			const item: Item = { x, y, prev };
			computed[encodePointKey(x, y)] = item;
			todo.push(item);
		};

		add(toX, toY, null);

		while (todo.length) {
			const item = todo.shift();
			if (item === undefined) {
				throw new Error("unreachable: todo is non-empty");
			}
			if (item.x === fromX && item.y === fromY) {
				break;
			}

			const neighbors = getNeighbors(dirs, passable, item.x, item.y);
			for (const [x, y] of neighbors) {
				const id = encodePointKey(x, y);
				if (id in computed) {
					continue;
				} /* already done */
				add(x, y, item);
			}
		}

		const key = encodePointKey(fromX, fromY);
		if (!(key in computed)) {
			return err("no-path-found");
		}

		let current: Item | null = computed[key] ?? null;
		while (current) {
			callback(current.x, current.y);
			current = current.prev;
		}
		return ok(undefined);
	};
};
