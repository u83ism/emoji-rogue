import { describe, expect, it } from "vitest";
import { buildEventLog, EVENT_LOG_LIMIT, type GameEvent } from "./events.js";

const hit = (damage: number): GameEvent => ({
	type: "player-hit",
	payload: { by: "zombie", damage },
});

describe("buildEventLog", () => {
	it("appends new events after the existing ones", () => {
		expect(buildEventLog([hit(1)], [hit(2), hit(3)])).toEqual([
			hit(1),
			hit(2),
			hit(3),
		]);
	});

	it("returns the log unchanged (same reference) when nothing is appended", () => {
		const log = [hit(1)];
		expect(buildEventLog(log, [])).toBe(log);
	});

	it("drops the oldest entries past the cap", () => {
		const full: GameEvent[] = [];
		for (let i = 0; i < EVENT_LOG_LIMIT; i++) {
			full.push(hit(i));
		}
		const capped = buildEventLog(full, [hit(999)]);
		expect(capped.length).toBe(EVENT_LOG_LIMIT);
		expect(capped[0]).toEqual(hit(1)); /* oldest entry dropped */
		expect(capped[capped.length - 1]).toEqual(hit(999));
	});
});
