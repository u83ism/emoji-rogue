import type { Scheduler } from "./scheduler.js";
import {
	addToRepeatList,
	advanceScheduler,
	clearSchedulerState,
	createSchedulerState,
	removeFromSchedulerState,
} from "./scheduler.js";

export interface ActionScheduler<T> extends Scheduler<T> {
	/** @param time defaults to 1 */
	add(item: T, repeat: boolean, time?: number): ActionScheduler<T>;
	/** Set the duration for the currently active item. */
	setDuration(time: number): ActionScheduler<T>;
}

const DEFAULT_DURATION = 1;

/**
 * Action-based scheduler: each item is scheduled with an explicit duration
 * (defaulting to 1), adjustable for the active item via `setDuration`.
 */
export const createActionScheduler = <T>(): ActionScheduler<T> => {
	const state = createSchedulerState<T>();
	let duration = DEFAULT_DURATION; /* for the currently active item */

	const scheduler: ActionScheduler<T> = {
		getTime: () => state.queue.getTime(),
		add(item, repeat, time) {
			state.queue.add(item, time || DEFAULT_DURATION);
			addToRepeatList(state, item, repeat);
			return scheduler;
		},
		getTimeOf: (item) => state.queue.getEventTime(item),
		clear() {
			duration = DEFAULT_DURATION;
			clearSchedulerState(state);
			return scheduler;
		},
		remove(item) {
			if (item === state.current) {
				duration = DEFAULT_DURATION;
			}
			return removeFromSchedulerState(state, item);
		},
		next() {
			if (
				state.current !== null &&
				state.repeatList.indexOf(state.current) !== -1
			) {
				state.queue.add(state.current, duration || DEFAULT_DURATION);
				duration = DEFAULT_DURATION;
			}
			return advanceScheduler(state);
		},
		setDuration(time) {
			if (state.current) {
				duration = time;
			}
			return scheduler;
		},
	};
	return scheduler;
};
