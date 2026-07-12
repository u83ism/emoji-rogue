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

function encodeKey(x: number, y: number): string {
	return `${x},${y}`;
}

/**
 * Simplified Dijkstra's algorithm: all edges have a value of 1.
 *
 * The search frontier is cached across calls: the first `compute()` call for
 * a given `(fromX, fromY)` (or a closer one already computed) reuses work
 * from previous calls, expanding the frontier only as far as needed.
 */
export function createDijkstraPath(
	toX: number,
	toY: number,
	passable: PassableCallback,
	options: Partial<PathOptions> = {},
): Path {
	const dirs = getPathDirs(options.topology ?? 8);
	const computed: Record<string, Item> = {};
	const todo: Item[] = [];

	function add(x: number, y: number, prev: Item | null): void {
		const item: Item = { x, y, prev };
		computed[encodeKey(x, y)] = item;
		todo.push(item);
	}

	function compute(fromX: number, fromY: number): void {
		while (todo.length) {
			const item = todo.shift();
			if (item === undefined) {
				throw new Error("unreachable: todo is non-empty");
			}
			if (item.x === fromX && item.y === fromY) {
				return;
			}

			const neighbors = getNeighbors(dirs, passable, item.x, item.y);
			for (const [x, y] of neighbors) {
				const id = encodeKey(x, y);
				if (id in computed) {
					continue;
				} /* already done */
				add(x, y, item);
			}
		}
	}

	add(toX, toY, null);

	return (fromX: number, fromY: number, callback: ComputeCallback) => {
		const key = encodeKey(fromX, fromY);
		if (!(key in computed)) {
			compute(fromX, fromY);
		}
		if (!(key in computed)) {
			return;
		}

		let current: Item | null = computed[key] ?? null;
		while (current) {
			callback(current.x, current.y);
			current = current.prev;
		}
	};
}
