import { describe, expect, it } from "vitest";
import { createActionScheduler } from "./action.js";
import { createSimpleScheduler } from "./simple.js";
import type { SpeedActor } from "./speed.js";
import { createSpeedScheduler } from "./speed.js";

describe("Simple", () => {
	const A1 = "A1";
	const A2 = "A2";
	const A3 = "A3";

	it("schedules actors evenly", () => {
		const scheduler = createSimpleScheduler<string>();
		scheduler.add(A1, true);
		scheduler.add(A2, true);
		scheduler.add(A3, true);
		const result = Array.from({ length: 6 }, () => scheduler.next());
		expect(result).toEqual([A1, A2, A3, A1, A2, A3]);
	});

	it("schedules one-time events", () => {
		const scheduler = createSimpleScheduler<string>();
		scheduler.add(A1, false);
		scheduler.add(A2, true);
		const result = Array.from({ length: 4 }, () => scheduler.next());
		expect(result).toEqual([A1, A2, A2, A2]);
	});

	it("removes repeated events", () => {
		const scheduler = createSimpleScheduler<string>();
		scheduler.add(A1, false);
		scheduler.add(A2, true);
		scheduler.add(A3, true);
		scheduler.remove(A2);
		const result = Array.from({ length: 4 }, () => scheduler.next());
		expect(result).toEqual([A1, A3, A3, A3]);
	});

	it("removes one-time events", () => {
		const scheduler = createSimpleScheduler<string>();
		scheduler.add(A1, false);
		scheduler.add(A2, false);
		scheduler.add(A3, true);
		scheduler.remove(A2);
		const result = Array.from({ length: 4 }, () => scheduler.next());
		expect(result).toEqual([A1, A3, A3, A3]);
	});

	it("removes properly (issue #187)", () => {
		const scheduler = createSimpleScheduler<string>();
		scheduler.add(A1, true);
		scheduler.add(A2, true);
		scheduler.remove(A2);
		const result = Array.from({ length: 4 }, () => scheduler.next());
		expect(result).toEqual([A1, A1, A1, A1]);
	});
});

describe("Speed", () => {
	function actor(speed: number): SpeedActor {
		return { getSpeed: () => speed };
	}

	const A50 = actor(50);
	const A100a = actor(100);
	const A100b = actor(100);
	const A200 = actor(200);

	it("schedules same-speed actors evenly", () => {
		const scheduler = createSpeedScheduler<SpeedActor>();
		scheduler.add(A100a, true);
		scheduler.add(A100b, true);
		const result = Array.from({ length: 4 }, () => scheduler.next());
		expect(result).toEqual([A100a, A100b, A100a, A100b]);
	});

	it("schedules different speeds properly", () => {
		const scheduler = createSpeedScheduler<SpeedActor>();
		scheduler.add(A50, true);
		scheduler.add(A100a, true);
		scheduler.add(A200, true);
		const result = Array.from({ length: 7 }, () => scheduler.next());
		expect(result).toEqual([A200, A100a, A200, A200, A50, A100a, A200]);
	});

	it("schedules with initial offsets", () => {
		const scheduler = createSpeedScheduler<SpeedActor>();
		scheduler.add(A50, true, 1 / 300);
		scheduler.add(A100a, true, 0);
		scheduler.add(A200, true);
		const result = Array.from({ length: 9 }, () => scheduler.next());
		expect(result).toEqual([
			A100a,
			A50,
			A200,
			A100a,
			A200,
			A200,
			A100a,
			A200,
			A50,
		]);
	});

	it("looks up the time of an event", () => {
		const scheduler = createSpeedScheduler<SpeedActor>();
		scheduler.add(A100a, true);
		scheduler.add(A50, true, 1 / 200);
		expect(scheduler.getTimeOf(A50)).toBe(1 / 200);
		expect(scheduler.getTimeOf(A100a)).toBe(1 / 100);
	});
});

describe("Action", () => {
	const A1 = "A1";
	const A2 = "A2";
	const A3 = "A3";

	it("schedules evenly by default", () => {
		const scheduler = createActionScheduler<string>();
		scheduler.add(A1, true);
		scheduler.add(A2, true);
		scheduler.add(A3, true);
		const result = Array.from({ length: 6 }, () => scheduler.next());
		expect(result).toEqual([A1, A2, A3, A1, A2, A3]);
	});

	it("schedules with respect to the extra time argument", () => {
		const scheduler = createActionScheduler<string>();
		scheduler.add(A1, true);
		scheduler.add(A2, true, 2);
		scheduler.add(A3, true);
		const result = Array.from({ length: 6 }, () => scheduler.next());
		expect(result).toEqual([A1, A3, A2, A1, A3, A2]);
	});

	it("schedules with respect to action duration", () => {
		const scheduler = createActionScheduler<string>();
		scheduler.add(A1, true);
		scheduler.add(A2, true);
		scheduler.add(A3, true);
		const result: (string | null)[] = [];

		result.push(scheduler.next());
		scheduler.setDuration(10);

		result.push(scheduler.next());
		scheduler.setDuration(5);

		result.push(scheduler.next());
		scheduler.setDuration(1);
		expect(scheduler.getTime()).toBe(1);

		for (let i = 0; i < 3; i++) {
			result.push(scheduler.next());
			scheduler.setDuration(100); /* somewhere in the future */
		}

		expect(result).toEqual([A1, A2, A3, A3, A2, A1]);
	});
});

describe("Zero-ID actor", () => {
	const factories = [
		createSimpleScheduler<number>,
		createActionScheduler<number>,
	] as const;

	it.each(
		factories.map((factory, i) => [i, factory] as const),
	)("scheduler %i schedules the zero-id actor", (_index, createScheduler) => {
		const scheduler = createScheduler();
		const A1 = 0;
		scheduler.add(A1, true);
		const result = Array.from({ length: 6 }, () => scheduler.next());
		expect(result).toEqual([A1, A1, A1, A1, A1, A1]);
	});
});
