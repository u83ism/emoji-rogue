import type { Scheduler } from "./scheduler.js";
import {
	addToRepeatList,
	advanceScheduler,
	clearSchedulerState,
	createSchedulerState,
	removeFromSchedulerState,
} from "./scheduler.js";

/**
 * Simple fair scheduler (round-robin style): every item comes up again after
 * every other item has had a turn.
 */
export function createSimpleScheduler<T>(): Scheduler<T> {
	const state = createSchedulerState<T>();

	const scheduler: Scheduler<T> = {
		getTime: () => state.queue.getTime(),
		add(item, repeat) {
			state.queue.add(item, 0);
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
			if (
				state.current !== null &&
				state.repeatList.indexOf(state.current) !== -1
			) {
				state.queue.add(state.current, 0);
			}
			return advanceScheduler(state);
		},
	};
	return scheduler;
}
