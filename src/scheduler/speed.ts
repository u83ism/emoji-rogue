import type { Scheduler } from "./scheduler.js";
import {
	addToRepeatList,
	advanceScheduler,
	clearSchedulerState,
	createSchedulerState,
	removeFromSchedulerState,
} from "./scheduler.js";

export interface SpeedActor {
	getSpeed: () => number;
}

export interface SpeedScheduler<T extends SpeedActor> extends Scheduler<T> {
	/** @param time defaults to 1 / item.getSpeed() */
	add(item: T, repeat: boolean, time?: number): SpeedScheduler<T>;
}

/**
 * Speed-based scheduler: faster items (higher `getSpeed()`) come up more often.
 */
export const createSpeedScheduler = <
	T extends SpeedActor,
>(): SpeedScheduler<T> => {
	const state = createSchedulerState<T>();

	const scheduler: SpeedScheduler<T> = {
		getTime: () => state.queue.getTime(),
		add(item, repeat, time) {
			state.queue.add(item, time !== undefined ? time : 1 / item.getSpeed());
			addToRepeatList(state, item, repeat);
			return scheduler;
		},
		getTimeOf: (item) => state.queue.getEventTime(item),
		clear() {
			clearSchedulerState(state);
			return scheduler;
		},
		remove: (item) => removeFromSchedulerState(state, item),
		next() {
			if (state.current && state.repeatList.indexOf(state.current) !== -1) {
				state.queue.add(state.current, 1 / state.current.getSpeed());
			}
			return advanceScheduler(state);
		},
	};
	return scheduler;
};
