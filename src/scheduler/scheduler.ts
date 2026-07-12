import type { EventQueue } from "../eventqueue.js";
import { createEventQueue } from "../eventqueue.js";

export interface Scheduler<T> {
	getTime(): number;
	/** @param repeat Re-insert this item into the queue every time it comes up? */
	add(item: T, repeat: boolean): Scheduler<T>;
	/** Get the time the given item is scheduled for. */
	getTimeOf(item: T): number | undefined;
	clear(): Scheduler<T>;
	remove(item: T): boolean;
	/** Schedule the next item and return it (null if none is scheduled). */
	next(): T | null;
}

/** Mutable state shared by every scheduler variant; not part of the public API. */
export interface SchedulerState<T> {
	readonly queue: EventQueue<T>;
	repeatList: T[];
	current: T | null;
}

export function createSchedulerState<T>(): SchedulerState<T> {
	return { queue: createEventQueue<T>(), repeatList: [], current: null };
}

export function addToRepeatList<T>(
	state: SchedulerState<T>,
	item: T,
	repeat: boolean,
): void {
	if (repeat) {
		state.repeatList.push(item);
	}
}

export function clearSchedulerState<T>(state: SchedulerState<T>): void {
	state.queue.clear();
	state.repeatList = [];
	state.current = null;
}

export function removeFromSchedulerState<T>(
	state: SchedulerState<T>,
	item: T,
): boolean {
	const result = state.queue.remove(item);
	const index = state.repeatList.indexOf(item);
	if (index !== -1) {
		state.repeatList.splice(index, 1);
	}
	if (state.current === item) {
		state.current = null;
	}
	return result;
}

export function advanceScheduler<T>(state: SchedulerState<T>): T | null {
	state.current = state.queue.get();
	return state.current;
}

/**
 * Generic scheduler: stores items and retrieves them based on their
 * scheduled time, with optional repeat re-insertion.
 */
export function createScheduler<T>(): Scheduler<T> {
	const state = createSchedulerState<T>();

	const scheduler: Scheduler<T> = {
		getTime: () => state.queue.getTime(),
		add(item, repeat) {
			addToRepeatList(state, item, repeat);
			return scheduler;
		},
		getTimeOf: (item) => state.queue.getEventTime(item),
		clear() {
			clearSchedulerState(state);
			return scheduler;
		},
		remove: (item) => removeFromSchedulerState(state, item),
		next: () => advanceScheduler(state),
	};
	return scheduler;
}
