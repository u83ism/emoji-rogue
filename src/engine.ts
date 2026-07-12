import type { Scheduler } from "./scheduler/scheduler.js";

export interface Actor {
	act(): void | PromiseLike<void>;
}

export interface Engine {
	/** Start the main loop. When this call returns, the loop is locked. */
	start(): Engine;
	/** Interrupt the engine by an asynchronous action. */
	lock(): Engine;
	/** Resume execution (paused by a previous lock). */
	unlock(): Engine;
}

/**
 * Asynchronous main loop.
 */
export function createEngine(scheduler: Scheduler<Actor>): Engine {
	let lockCount = 1;

	const engine: Engine = {
		start(): Engine {
			return engine.unlock();
		},

		lock(): Engine {
			lockCount++;
			return engine;
		},

		unlock(): Engine {
			if (!lockCount) {
				throw new Error("Cannot unlock unlocked engine");
			}
			lockCount--;

			while (!lockCount) {
				const actor = scheduler.next();
				if (!actor) {
					return engine.lock(); /* no actors */
				}
				const result = actor.act();
				if (result) {
					/* actor returned a "thenable", looks like a Promise */
					engine.lock();
					result.then(() => engine.unlock());
				}
			}

			return engine;
		},
	};
	return engine;
}
