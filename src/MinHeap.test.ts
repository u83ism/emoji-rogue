import { describe, expect, it } from "vitest";
import { createMinHeap } from "./MinHeap.js";

describe("createMinHeap", () => {
	it("pops the smallest key first", () => {
		const heap = createMinHeap<string>();
		heap.push("b", 10);
		heap.push("a", 5);
		heap.push("c", 15);
		expect(heap.pop().value).toBe("a");
		expect(heap.pop().value).toBe("b");
		expect(heap.pop().value).toBe("c");
	});

	it("breaks ties by insertion order", () => {
		const heap = createMinHeap<string>();
		heap.push("b", 10);
		heap.push("a", 10);
		heap.push("c", 10);
		expect(heap.pop().value).toBe("b");
		expect(heap.pop().value).toBe("a");
		expect(heap.pop().value).toBe("c");
	});

	it("reports its length", () => {
		const heap = createMinHeap<number>();
		expect(heap.len()).toBe(0);
		heap.push(1, 1);
		heap.push(2, 2);
		expect(heap.len()).toBe(2);
		heap.pop();
		expect(heap.len()).toBe(1);
	});

	it("throws when popping an empty heap", () => {
		const heap = createMinHeap<number>();
		expect(() => heap.pop()).toThrow();
	});

	it("finds a value by strict equality", () => {
		const heap = createMinHeap<number>();
		heap.push(42, 7);
		expect(heap.find(42)?.key).toBe(7);
		expect(heap.find(99)).toBeNull();
	});

	it("removes an existing value and reports success", () => {
		const heap = createMinHeap<number>();
		heap.push(123, 0);
		heap.push(456, 0);
		expect(heap.remove(123)).toBe(true);
		expect(heap.pop().value).toBe(456);
	});

	it("reports failure when removing a non-existent value", () => {
		const heap = createMinHeap<number>();
		heap.push(0, 0);
		expect(heap.remove(1)).toBe(false);
		expect(heap.pop().value).toBe(0);
	});

	it("shifts all keys by a delta", () => {
		const heap = createMinHeap<string>();
		heap.push("a", 10);
		heap.push("b", 20);
		heap.shift(-10);
		expect(heap.pop().key).toBe(0);
		expect(heap.pop().key).toBe(10);
	});
});
