import { beforeEach, describe, expect, it } from "vitest";
import type { Engine } from "./engine.js";
import { createEngine } from "./engine.js";
import type { SpeedScheduler } from "./scheduler/speed.js";
import { createSpeedScheduler } from "./scheduler/speed.js";

interface TestActor {
	getSpeed(): number;
	act(): void;
}

describe("createEngine", () => {
	let result = 0;
	let scheduler: SpeedScheduler<TestActor>;
	let engine: Engine;

	const actorSlow: TestActor = {
		getSpeed: () => 50,
		act: () => {
			result++;
		},
	};
	const actorMedium: TestActor = {
		getSpeed: () => 70,
		act: () => {
			result++;
			scheduler.add(actorFast, false);
		},
	};
	const actorFast: TestActor = {
		getSpeed: () => 100,
		act: () => {
			engine.lock();
		},
	};

	beforeEach(() => {
		result = 0;
		scheduler = createSpeedScheduler<TestActor>();
		engine = createEngine(scheduler);
	});

	it("stops when locked", () => {
		scheduler.add(actorSlow, true);
		scheduler.add(actorFast, true);

		engine.start();
		expect(result).toBe(0);
	});

	it("runs until locked", () => {
		scheduler.add(actorSlow, true);
		scheduler.add(actorMedium, true);

		engine.start();
		expect(result).toBe(2);
	});

	it("runs only when unlocked", () => {
		scheduler.add(actorMedium, true);

		engine.lock();
		engine.start();
		expect(result).toBe(0);
		engine.start();
		expect(result).toBe(1);
	});
});
