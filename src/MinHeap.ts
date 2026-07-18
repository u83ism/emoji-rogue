export interface HeapWrapper<T> {
	readonly key: number;
	readonly timestamp: number;
	readonly value: T;
}

export interface MinHeap<T> {
	push(value: T, key: number): void;
	pop(): HeapWrapper<T>;
	len(): number;
	find(value: T): HeapWrapper<T> | null;
	remove(value: T): boolean;
	shift(delta: number): void;
}

/**
 * A binary min-heap keyed by `key`, with `timestamp` (insertion order) as the
 * tie-breaker so equal keys come out FIFO.
 */
export const createMinHeap = <T>(): MinHeap<T> => {
	let heap: HeapWrapper<T>[] = [];
	let timestamp = 0;

	const lessThan = (a: HeapWrapper<T>, b: HeapWrapper<T>): boolean => {
		return a.key === b.key ? a.timestamp < b.timestamp : a.key < b.key;
	};

	const existNode = (index: number): boolean => {
		return index >= 0 && index < heap.length;
	};

	const swap = (x: number, y: number): void => {
		const nodeAtX = heap[x];
		const nodeAtY = heap[y];
		if (nodeAtX === undefined || nodeAtY === undefined) {
			throw new Error("cannot swap non-existent heap nodes");
		}
		heap[x] = nodeAtY;
		heap[y] = nodeAtX;
	};

	const minNode = (candidates: number[]): number => {
		const valid = candidates.filter(existNode);
		let minimal = valid[0];
		if (minimal === undefined) {
			throw new Error("minNode called with no existing candidates");
		}
		for (const index of valid) {
			const candidateNode = heap[index];
			const minimalNode = heap[minimal];
			if (candidateNode === undefined || minimalNode === undefined) {
				throw new Error("heap index out of range");
			}
			if (lessThan(candidateNode, minimalNode)) {
				minimal = index;
			}
		}
		return minimal;
	};

	const updateUp = (index: number): void => {
		if (index === 0) return;
		const parent = Math.floor((index - 1) / 2);
		const nodeAtIndex = heap[index];
		const parentNode = heap[parent];
		if (
			existNode(parent) &&
			nodeAtIndex !== undefined &&
			parentNode !== undefined &&
			lessThan(nodeAtIndex, parentNode)
		) {
			swap(index, parent);
			updateUp(parent);
		}
	};

	const updateDown = (index: number): void => {
		const leftChild = 2 * index + 1;
		const rightChild = 2 * index + 2;
		if (!existNode(leftChild)) return;
		const minimal = minNode([index, leftChild, rightChild]);
		if (minimal !== index) {
			swap(index, minimal);
			updateDown(minimal);
		}
	};

	return {
		push(value: T, key: number): void {
			timestamp += 1;
			const location = heap.length;
			heap.push({ value, timestamp, key });
			updateUp(location);
		},

		pop(): HeapWrapper<T> {
			const top = heap[0];
			if (top === undefined) {
				throw new Error("no element to pop");
			}
			if (heap.length > 1) {
				const last = heap.pop();
				if (last === undefined) {
					throw new Error("heap underflow");
				}
				heap[0] = last;
				updateDown(0);
			} else {
				heap.pop();
			}
			return top;
		},

		len(): number {
			return heap.length;
		},

		find(value: T): HeapWrapper<T> | null {
			for (const node of heap) {
				if (value === node.value) return node;
			}
			return null;
		},

		remove(value: T): boolean {
			let index = -1;
			for (let i = 0; i < heap.length; i++) {
				const node = heap[i];
				if (node !== undefined && value === node.value) index = i;
			}
			if (index === -1) return false;

			if (heap.length > 1) {
				const last = heap.pop();
				if (last === undefined) {
					throw new Error("heap underflow");
				}
				if (last.value !== value) {
					// if the last element is the one being removed, there's nothing left to relocate
					heap[index] = last;
					updateDown(index);
				}
				return true;
			}
			heap.pop();
			return true;
		},

		shift(delta: number): void {
			heap = heap.map(({ key, value, timestamp: nodeTimestamp }) => ({
				key: key + delta,
				value,
				timestamp: nodeTimestamp,
			}));
		},
	};
};
