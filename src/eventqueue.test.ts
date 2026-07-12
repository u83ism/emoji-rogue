import { describe, expect, it } from "vitest";
import { createEventQueue } from "./eventqueue.js";

describe("createEventQueue", () => {
	it("returns an added event", () => {
		const queue = createEventQueue<string>();
		queue.add("a", 100);
		expect(queue.get()).toBe("a");
	});

	it("returns null when no events are available", () => {
		const queue = createEventQueue<string>();
		expect(queue.get()).toBeNull();
	});

	it("removes returned events", () => {
		const queue = createEventQueue<number>();
		queue.add(0, 0);
		queue.get();
		expect(queue.get()).toBeNull();
	});

	it("looks up the time of events", () => {
		const queue = createEventQueue<number>();
		queue.add(123, 187);
		queue.add(456, 42);
		expect(queue.getEventTime(123)).toBe(187);
		expect(queue.getEventTime(456)).toBe(42);
	});

	it("looks up correct times after events are removed", () => {
		const queue = createEventQueue<number>();
		queue.add(123, 187);
		queue.add(456, 42);
		queue.add(789, 411);
		queue.get();
		expect(queue.getEventTime(456)).toBeUndefined();
		expect(queue.getEventTime(123)).toBe(187 - 42);
		expect(queue.getEventTime(789)).toBe(411 - 42);
	});

	it("removes events", () => {
		const queue = createEventQueue<number>();
		queue.add(123, 0);
		queue.add(456, 0);
		expect(queue.remove(123)).toBe(true);
		expect(queue.get()).toBe(456);
	});

	it("survives removal of non-existent events", () => {
		const queue = createEventQueue<number>();
		queue.add(0, 0);
		expect(queue.remove(1)).toBe(false);
		expect(queue.get()).toBe(0);
	});

	it("returns events sorted by time", () => {
		const queue = createEventQueue<number>();
		queue.add(456, 10);
		queue.add(123, 5);
		queue.add(789, 15);
		expect(queue.get()).toBe(123);
		expect(queue.get()).toBe(456);
		expect(queue.get()).toBe(789);
	});

	it("computes elapsed time", () => {
		const queue = createEventQueue<number>();
		queue.add(456, 10);
		queue.add(123, 5);
		queue.add(789, 15);
		queue.get();
		queue.get();
		queue.get();
		expect(queue.getTime()).toBe(15);
	});

	it("maintains event order for equal timestamps", () => {
		const queue = createEventQueue<number>();
		queue.add(456, 10);
		queue.add(123, 10);
		queue.add(789, 10);
		expect(queue.get()).toBe(456);
		expect(queue.get()).toBe(123);
		expect(queue.get()).toBe(789);
		expect(queue.getTime()).toBe(10);
	});

	it("clears all scheduled events", () => {
		const queue = createEventQueue<number>();
		queue.add(1, 1);
		queue.add(2, 2);
		queue.clear();
		expect(queue.get()).toBeNull();
	});
});
