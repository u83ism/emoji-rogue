import { createMinHeap } from "./MinHeap.js";

export interface EventQueue<T> {
	getTime(): number;
	clear(): void;
	add(event: T, time: number): void;
	get(): T | null;
	getEventTime(event: T): number | undefined;
	remove(event: T): boolean;
}

/**
 * Generic event queue: stores events and retrieves them based on their time.
 */
export const createEventQueue = <T>(): EventQueue<T> => {
	let time = 0;
	let events = createMinHeap<T>();

	return {
		getTime(): number {
			return time;
		},

		clear(): void {
			events = createMinHeap<T>();
		},

		add(event: T, atTime: number): void {
			events.push(event, atTime);
		},

		get(): T | null {
			if (!events.len()) {
				return null;
			}

			const { key: elapsed, value: event } = events.pop();
			if (elapsed > 0) {
				time += elapsed;
				events.shift(-elapsed);
			}

			return event;
		},

		getEventTime(event: T): number | undefined {
			return events.find(event)?.key;
		},

		remove(event: T): boolean {
			return events.remove(event);
		},
	};
};
